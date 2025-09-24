import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutlookEmail {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: string;
  };
}

serve(async (req) => {
  console.log('=== FETCH OUTLOOK EMAILS FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token and get user info
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Get the user's Outlook tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token fetch error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'No Outlook token found. Please connect your Outlook account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    let accessToken = tokenData.access_token;
    
    if (now >= expiresAt) {
      console.log('Token expired, attempting refresh...');
      // Token refresh logic would go here
      // For now, return an error asking user to re-authenticate
      return new Response(
        JSON.stringify({ error: 'Access token expired. Please reconnect your Outlook account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching emails from Microsoft Graph API...');
    
    // Fetch emails from Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch emails: ${graphResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphData = await graphResponse.json();
    const emails: OutlookEmail[] = graphData.value || [];
    
    console.log(`Fetched ${emails.length} emails from Outlook`);

    // Process and store emails
    const processedEmails = [];
    
    for (const email of emails) {
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('outlook_id', email.id)
          .eq('user_id', user.id)
          .single();

        if (existingEmail) {
          console.log(`Email ${email.id} already exists, skipping...`);
          continue;
        }

        // Extract text content from HTML
        let textContent = email.bodyPreview || '';
        if (email.body && email.body.content) {
          // Simple HTML to text conversion
          textContent = email.body.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
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
        };

        // Insert email into database
        const { data: insertedEmail, error: insertError } = await supabase
          .from('emails')
          .insert(emailData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting email:', insertError);
          continue;
        }

        processedEmails.push(insertedEmail);
        
        // Classify the email using the email-classifier function
        try {
          const { data: classificationData, error: classificationError } = await supabase.functions.invoke('email-classifier', {
            body: {
              email_id: insertedEmail.id,
              subject: emailData.subject,
              sender: emailData.sender,
              content: emailData.content
            }
          });

          if (classificationError) {
            console.error('Classification error:', classificationError);
          } else {
            console.log('Email classified successfully:', classificationData);
          }
        } catch (classificationError) {
          console.error('Error calling classification function:', classificationError);
        }

      } catch (error) {
        console.error('Error processing email:', error);
        continue;
      }
    }

    console.log(`Successfully processed ${processedEmails.length} new emails`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and processed ${processedEmails.length} emails`,
        emails_processed: processedEmails.length,
        total_emails_fetched: emails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-outlook-emails function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});