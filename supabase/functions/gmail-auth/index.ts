import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Gmail auth function called, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const body = await req.text();
    console.log('Raw body:', body);
    
    let jsonBody;
    try {
      jsonBody = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { action, code } = jsonBody;
    console.log('Parsed action:', action, 'code present:', !!code);
    
    // Get the origin from the request headers to make it dynamic
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^\/]*$/, '');
    // Force use of current URL
    const origin = requestOrigin || 'https://4a245192-55d5-454c-8b1c-2d652a6212f2.lovableproject.com';
    console.log('Request origin:', req.headers.get('origin'));
    console.log('Request referer:', req.headers.get('referer'));
    console.log('Final origin used:', origin);

    // Handle auth URL generation
    if (action === 'get_auth_url') {
      console.log('Generating auth URL...');
      if (!googleClientId || !googleClientSecret) {
        console.error('Google Client ID or Secret not found');
        return new Response(
          JSON.stringify({ error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const scope = 'https://www.googleapis.com/auth/gmail.readonly';
      const redirectUri = `${origin}/gmail-callback`;
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', 'anonymous');

      console.log('Generated auth URL:', authUrl.toString());
      return new Response(
        JSON.stringify({ auth_url: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle token exchange
    if (action === 'exchange_token') {
      console.log('Starting token exchange with code:', !!code);
      
      if (!googleClientId || !googleClientSecret) {
        console.error('Google OAuth credentials not configured');
        return new Response(
          JSON.stringify({ error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${origin}/gmail-callback`;
      console.log('Using redirect URI for token exchange:', redirectUri);
      console.log('Using Client ID:', googleClientId?.substring(0, 20) + '...');

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', errorText);
        console.error('Response status:', tokenResponse.status);
        console.error('Response headers:', Object.fromEntries(tokenResponse.headers.entries()));
        
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
          console.error('Parsed error details:', errorDetails);
        } catch (e) {
          console.error('Could not parse error response as JSON');
        }
        
        return new Response(
          JSON.stringify({ 
            error: `Token exchange failed: ${tokenResponse.status}`,
            details: errorDetails || errorText,
            redirect_uri_used: redirectUri
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      
      console.log('Token exchange successful');

      // Get user's email address from Google
      let userEmail = 'user@gmail.com';
      try {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          userEmail = profileData.email || userEmail;
          console.log('Retrieved user email:', userEmail);
        }
      } catch (error) {
        console.error('Failed to get user profile:', error);
      }

      // Create Supabase client
      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

      // Get user_id from the already parsed jsonBody
      const { user_id } = jsonBody;
      
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store the Gmail token in the database
      const { error: upsertError } = await supabase
        .from('gmail_tokens')
        .upsert({
          user_id: user_id,
          email_address: userEmail, // Now using actual email
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw new Error(`Failed to store token: ${upsertError.message}`);
      }

      console.log('Gmail token stored successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Gmail access token stored successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If neither action matches
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "get_auth_url" or "exchange_token"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gmail-auth function:', error);
    console.error('Error stack:', error.stack);
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