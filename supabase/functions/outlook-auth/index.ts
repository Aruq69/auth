import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== OUTLOOK AUTH FUNCTION START ===');
  
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

    const { action, code } = await req.json();

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Microsoft Graph
      const redirectUri = 'https://mailguard5123.vercel.app/outlook-callback';
      const scopes = 'https://graph.microsoft.com/MailboxSettings.ReadWrite https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${microsoftClientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${user.id}&` +
        `response_mode=query`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'handle_callback') {
      // Handle OAuth callback with authorization code
      const redirectUri = 'https://mailguard5123.vercel.app/outlook-callback';
      
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: microsoftClientId!,
          client_secret: microsoftClientSecret!,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code for tokens' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      
      // Get user info from Microsoft Graph
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to get user info from Microsoft Graph' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = await userResponse.json();
      
      // Calculate expiry time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
      
      // Store tokens in database using upsert with the unique constraint
      const { error: insertError } = await supabase
        .from('outlook_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          email_address: userData.mail || userData.userPrincipalName,
        }, {
          onConflict: 'user_id'
        });

      if (insertError) {
        console.error('Error storing tokens:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store authentication tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Outlook tokens stored successfully');
      
      // Automatically fetch emails after successful connection
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('fetch-outlook-emails', {
          headers: {
            'Authorization': authHeader,
          }
        });

        if (emailError) {
          console.error('Error fetching emails:', emailError);
        } else {
          console.log('Emails fetched successfully:', emailData);
        }
      } catch (emailFetchError) {
        console.error('Error calling fetch-outlook-emails:', emailFetchError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Outlook connected successfully and emails are being fetched',
          email: userData.mail || userData.userPrincipalName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in outlook-auth function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});