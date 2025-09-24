import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== FETCH OUTLOOK EMAILS FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token and get user info
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT token length:', jwt.length);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);

    // Get the user's Outlook tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: 'No Outlook token found. Please connect your Outlook account first.',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      return new Response(
        JSON.stringify({ 
          error: 'Access token expired. Please reconnect your Outlook account.',
          success: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch emails from Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch emails: ${graphResponse.status} - ${errorText}`,
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphData = await graphResponse.json();
    const emails = graphData.value || [];
    
    // Delete all previous emails for this user before adding new ones
    const { error: deleteError } = await supabase
      .from('emails')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      // Continue anyway - this is not a critical error
    }
    
    // Process emails
    const processedEmails = [];
    
    for (const email of emails) {
      try {

        // Extract text content
        let textContent = email.bodyPreview || '';
        if (email.body && email.body.content) {
          textContent = email.body.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Call email classifier to analyze the email
        const classificationResult = await fetch(`${supabaseUrl}/functions/v1/email-classifier`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emails: [{
              subject: email.subject || 'No Subject',
              sender: email.from?.emailAddress?.address || 'Unknown Sender',
              content: textContent,
              userId: user.id,
              message_id: email.id
            }]
          })
        });

        let classificationData = null;
        if (classificationResult.ok) {
          const classificationResponse = await classificationResult.json();
          if (classificationResponse.success && classificationResponse.results && classificationResponse.results.length > 0) {
            classificationData = classificationResponse.results[0];
          }
        }

        const emailData = {
          user_id: user.id,
          outlook_id: email.id,
          message_id: email.id,
          subject: email.subject || 'No Subject',
          sender: email.from?.emailAddress?.address || 'Unknown Sender',
          content: textContent,
          raw_content: email.body?.content || '',
          received_date: email.receivedDateTime,
          processed_at: new Date().toISOString(),
          // Add classification data if available
          classification: classificationData?.classification || null,
          threat_level: classificationData?.threat_level || null,
          threat_type: classificationData?.threat_type || null,
          confidence: classificationData?.confidence || null,
          keywords: classificationData?.keywords || null,
        };

        // Insert email into database
        const { data: insertedEmail, error: insertError } = await supabase
          .from('emails')
          .insert(emailData)
          .select()
          .single();

        if (!insertError && insertedEmail) {
          processedEmails.push(insertedEmail);
        }

        } catch (error) {
          continue;
        }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedEmails.length} emails`,
        emails_processed: processedEmails.length,
        total_emails_fetched: emails.length,
        emails: processedEmails, // Return processed emails for display
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== FETCH OUTLOOK EMAILS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});