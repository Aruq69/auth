import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gmail token for the authenticated user
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No Gmail access token found. Please connect your Gmail account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!gmailResponse.ok) {
      throw new Error(`Gmail API error: ${gmailResponse.status}`);
    }

    const gmailData = await gmailResponse.json();
    const messages = gmailData.messages || [];

    console.log(`Found ${messages.length} messages`);

    // Fetch details for each message and classify them
    const emailPromises = messages.slice(0, 10).map(async (message: any) => {
      try {
        // Get message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
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
        
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
        
        // Extract email content
        let content = '';
        if (messageData.payload.body?.data) {
          content = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (messageData.payload.parts) {
          const textPart = messageData.payload.parts.find((part: any) => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart?.body?.data) {
            content = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }

        // Limit content length for analysis
        content = content.substring(0, 2000);

        // Use OpenAI to classify the email
        const classificationPrompt = `
        Analyze this email for spam classification:
        
        Subject: ${subject}
        Sender: ${sender}
        Content: ${content}
        
        Based on common spam indicators, classify this email and respond with a JSON object containing:
        {
          "classification": "spam" or "legitimate",
          "threat_level": "high", "medium", or "low",
          "confidence": decimal between 0 and 1,
          "keywords": array of suspicious keywords found (max 5),
          "reasoning": brief explanation
        }
        `;

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert email security analyst. Respond only with valid JSON.' },
              { role: 'user', content: classificationPrompt }
            ],
            temperature: 0.1,
            max_tokens: 400,
          }),
        });

        let classification = {
          classification: "legitimate",
          threat_level: "low",
          confidence: 0.5,
          keywords: [],
          reasoning: "Default classification"
        };

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          try {
            classification = JSON.parse(aiData.choices[0].message.content);
          } catch (parseError) {
            console.error('Failed to parse AI response for message', message.id);
          }
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
              gmail_id: message.id,
              subject,
              sender,
              content: content.substring(0, 1000), // Store limited content
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