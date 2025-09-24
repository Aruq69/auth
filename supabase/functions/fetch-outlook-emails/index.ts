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
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token and get user info
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch emails: ${graphResponse.status}`,
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphData = await graphResponse.json();
    const emails = graphData.value || [];
    
    // Process emails
    const processedEmails = [];
    
    for (const email of emails) {
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('outlook_id', email.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingEmail) {
          continue; // Skip existing emails
        }

        // Extract text content
        let textContent = email.bodyPreview || '';
        if (email.body && email.body.content) {
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

        if (!insertError && insertedEmail) {
          processedEmails.push(insertedEmail);
        }

      } catch (error) {
        console.error('Error processing email:', error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedEmails.length} emails`,
        emails_processed: processedEmails.length,
        total_emails_fetched: emails.length,
        debug_info: {
          user_id: user.id,
          emails_from_api: emails.length,
          processed_count: processedEmails.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-outlook-emails function:', error);
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