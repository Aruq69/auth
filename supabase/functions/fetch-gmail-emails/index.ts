import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper function to decode base64url (Gmail uses this encoding)
function decodeBase64Url(str: string): string {
  try {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode and convert to UTF-8
    const bytes = atob(base64);
    return decodeURIComponent(escape(bytes));
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return str;
  }
}

// Helper function to strip HTML tags
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get user_id from request body
    const { user_id } = await req.json();
    console.log('📨 Received user_id:', user_id);
    console.log('🔍 Starting Gmail email fetch process...');
    
    if (!user_id) {
      console.error('Missing user_id in request');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gmail token for the authenticated user
    console.log('Looking for Gmail tokens for user:', user_id);
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (tokenError) {
      console.error('Gmail token database error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Database error while fetching Gmail tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      console.error('No Gmail tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ error: 'No Gmail access token found. Please connect your Gmail account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found Gmail token for user, checking expiry...');
    
    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    let accessToken = tokenData.access_token;
    
    if (expiresAt <= now) {
      console.log('Token expired, attempting to refresh...');
      // Token has expired, try to refresh
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Failed to refresh token:', await refreshResponse.text());
        return new Response(
          JSON.stringify({ error: 'Gmail token expired and refresh failed. Please reconnect your Gmail account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      // Update token in database
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));
      await supabase
        .from('gmail_tokens')
        .update({ 
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);
    }

    // Fetch emails from Gmail API with comprehensive search
    console.log('Fetching emails from Gmail API...');
    
    // Get the latest emails from various categories and folders
    const queries = [
      'newer_than:30d', // All emails from last 30 days (main query)
      'in:sent newer_than:14d', // Sent emails
      'in:promotions newer_than:14d', // Promotional emails
      'in:social newer_than:14d', // Social emails
      'in:updates newer_than:14d', // Update emails
      'has:attachment newer_than:14d', // Emails with attachments
      'is:important newer_than:30d', // Important emails
      'from:noreply newer_than:14d', // No-reply emails (often promotional/spam)
      'from:info newer_than:14d', // Info emails
      'from:support newer_than:14d' // Support emails
    ];
    
    let allMessages = [];
    
    // Fetch from multiple categories with higher limits
    for (const query of queries) {
      const maxResults = query === 'newer_than:30d' ? 50 : 20; // Get more from main query
      const gmailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (gmailResponse.ok) {
        const gmailData = await gmailResponse.json();
        const messages = gmailData.messages || [];
        allMessages.push(...messages);
      }
    }
    
    // Remove duplicates based on message ID and sort by ID (newer first)
    const uniqueMessages = allMessages
      .filter((message, index, arr) => 
        arr.findIndex(m => m.id === message.id) === index
      )
      .sort((a, b) => b.id.localeCompare(a.id)) // Sort by ID for consistency
      .slice(0, 100); // Limit to 100 emails
    
    console.log(`Found ${uniqueMessages.length} unique messages`);

    // Fetch details for each message and classify them (process all up to 100)
    const emailPromises = uniqueMessages.map(async (message: any) => {
      try {
        // Get message details with full format for complete content
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          return null;
        }

        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers;
        
        // Extract comprehensive header information
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
        const replyTo = headers.find((h: any) => h.name === 'Reply-To')?.value || '';
        const returnPath = headers.find((h: any) => h.name === 'Return-Path')?.value || '';
        
        // Enhanced content extraction with better MIME handling
        let content = '';
        let htmlContent = '';
        
        const extractContent = (payload: any): void => {
          if (payload.body?.data) {
            const decodedContent = decodeBase64Url(payload.body.data);
            if (payload.mimeType === 'text/html') {
              htmlContent = decodedContent;
            } else if (payload.mimeType === 'text/plain') {
              content = decodedContent;
            }
          }
          
          if (payload.parts) {
            payload.parts.forEach((part: any) => {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                content = decodeBase64Url(part.body.data);
              } else if (part.mimeType === 'text/html' && part.body?.data) {
                htmlContent = decodeBase64Url(part.body.data);
              } else if (part.parts) {
                extractContent(part);
              }
            });
          }
        };
        
        extractContent(messageData.payload);
        
        // Use text content if available, otherwise extract text from HTML
        if (!content && htmlContent) {
          content = stripHtmlTags(htmlContent);
        }

        // Limit content length for analysis but keep more for better classification
        const fullContent = content;
        content = content.substring(0, 3000);

        // Enhanced email classification with more context
        const emailData = {
          subject,
          sender,
          content,
          userId: user_id, // Add the required userId field
          message_id: message.id, // Add the required message_id field
          replyTo,
          returnPath,
          headers: headers.map(h => `${h.name}: ${h.value}`).join('\n')
        };

        // Call our enhanced classification function
        const classificationResponse = await supabase.functions.invoke('classify-email', {
          body: { 
            emails: [emailData],
            method: 'hybrid' // Use our enhanced classification
          }
        });

        let classification = {
          classification: "legitimate",
          threat_level: "low", 
          confidence: 0.5,
          keywords: [],
          reasoning: "Default classification"
        };

        if (classificationResponse.data?.results?.[0]) {
          classification = classificationResponse.data.results[0];
        }

        // Check if email already exists in database
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('gmail_id', message.id)
          .eq('user_id', user_id)
          .single();

        if (!existingEmail) {
          // Store the email analysis in the database
          const { error: insertError } = await supabase
            .from('emails')
            .insert({
              user_id: user_id,
              message_id: message.id, // Add the required message_id field
              gmail_id: message.id,
              subject,
              sender,
              content: content.substring(0, 1000), // Store limited content
              raw_content: fullContent.substring(0, 5000), // Store more of the original
              classification: classification.classification,
              threat_level: classification.threat_level,
              confidence: classification.confidence,
              keywords: classification.keywords,
              received_date: new Date(date).toISOString(),
            });

          if (insertError) {
            console.error('Error inserting email:', insertError);
          }
        }

        return {
          id: message.id,
          subject,
          sender,
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          keywords: classification.keywords,
          received_date: new Date(date).toISOString()
        };

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        return null;
      }
    });

    const processedEmails = (await Promise.all(emailPromises)).filter(Boolean);

    console.log(`Processed ${processedEmails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emails: processedEmails,
        total: processedEmails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-gmail-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});