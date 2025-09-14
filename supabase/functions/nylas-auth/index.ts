import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    if (!nylasApiKey) {
      console.error('❌ NYLAS_API_KEY not found in environment');
      return new Response(JSON.stringify({ error: 'Nylas API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();
    console.log('🎯 Nylas Auth Action:', action);

    if (action === 'get_auth_url') {
      console.log('🔗 Generating Nylas OAuth URL...');
      
      // Generate Nylas OAuth URL
      const redirectUri = `${new URL(req.url).origin.replace('functions', 'projects')}/nylas-callback`;
      
      const authUrl = new URL('https://api.nylas.com/v3/connect/auth');
      authUrl.searchParams.set('client_id', nylasApiKey);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      
      console.log('✅ Generated Nylas auth URL:', authUrl.toString());
      
      return new Response(JSON.stringify({ 
        auth_url: authUrl.toString(),
        redirect_uri: redirectUri 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_token') {
      const { code, user_id } = await req.json();
      console.log('🔄 Exchanging code for tokens for user:', user_id);

      if (!code || !user_id) {
        return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange code for access token using Nylas API
      const tokenResponse = await fetch('https://api.nylas.com/v3/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nylasApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: nylasApiKey,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('❌ Nylas token exchange failed:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to exchange token with Nylas' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenData = await tokenResponse.json();
      console.log('🎉 Token exchange successful');

      // Get account information
      const accountResponse = await fetch(`https://api.nylas.com/v3/grants/${tokenData.grant_id}`, {
        headers: {
          'Authorization': `Bearer ${nylasApiKey}`,
        },
      });

      const accountData = await accountResponse.json();
      console.log('📧 Account data retrieved:', accountData.email);

      // Store the tokens in Supabase
      const { data, error } = await supabase
        .from('nylas_tokens')
        .upsert({
          user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          email_address: accountData.email,
          provider: accountData.provider,
          grant_id: tokenData.grant_id,
          expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('❌ Failed to store tokens:', error);
        return new Response(JSON.stringify({ error: 'Failed to store authentication tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Tokens stored successfully');
      return new Response(JSON.stringify({ 
        success: true, 
        email: accountData.email,
        provider: accountData.provider 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Nylas auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});