import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRuleRequest {
  senderEmail: string;
  ruleName: string;
  blockType: 'sender' | 'domain';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE OUTLOOK MAIL RULE FUNCTION START ===');
    
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

    // Parse request body
    const { senderEmail, ruleName, blockType }: CreateRuleRequest = await req.json();
    
    if (!senderEmail || !ruleName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: senderEmail, ruleName', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Check if token is expired and attempt refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      console.log('Access token expired, attempting to refresh...');
      
      if (tokenData.refresh_token) {
        try {
          const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
          const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
          
          const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: microsoftClientId!,
              client_secret: microsoftClientSecret!,
              refresh_token: tokenData.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
            
            await supabase
              .from('outlook_tokens')
              .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || tokenData.refresh_token,
                expires_at: newExpiresAt,
              })
              .eq('user_id', user.id);
            
            tokenData.access_token = refreshData.access_token;
            console.log('Token refreshed successfully');
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          return new Response(
            JSON.stringify({ 
              error: 'Access token expired and refresh failed. Please reconnect your Outlook account.',
              success: false,
              reconnect_required: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Create the mail rule in Outlook
    const ruleCondition = blockType === 'domain' 
      ? {
          fromAddresses: {
            addresses: [`@${senderEmail.split('@')[1]}`]
          }
        }
      : {
          fromAddresses: {
            addresses: [senderEmail]
          }
        };

    const ruleBody = {
      displayName: ruleName,
      sequence: 1,
      isEnabled: true,
      conditions: ruleCondition,
      actions: {
        delete: true
      }
    };

    console.log('Creating mail rule:', JSON.stringify(ruleBody, null, 2));

    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleBody)
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Failed to create mail rule:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to create mail rule: ${graphResponse.status} - ${errorText}`,
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ruleData = await graphResponse.json();
    console.log('Mail rule created successfully:', ruleData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mail rule created successfully',
        ruleId: ruleData.id,
        ruleName: ruleData.displayName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== CREATE OUTLOOK MAIL RULE ERROR ===');
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