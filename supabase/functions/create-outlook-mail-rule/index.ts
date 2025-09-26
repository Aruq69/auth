import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRuleRequest {
  senderEmail: string;
  ruleName: string;
  blockType: 'sender' | 'domain';
  emailId?: string; // Outlook message ID to delete
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
    const { senderEmail, ruleName, blockType, emailId }: CreateRuleRequest = await req.json();
    
    console.log('=== REQUEST DEBUGGING ===');
    console.log('Sender Email:', senderEmail);
    console.log('Rule Name:', ruleName);
    console.log('Block Type:', blockType);
    console.log('Email ID for deletion:', emailId);
    console.log('Email ID type:', typeof emailId);
    console.log('Email ID is null/undefined?', emailId == null);
    console.log('=== END REQUEST DEBUGGING ===');
    
    if (!senderEmail || !ruleName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: senderEmail, ruleName', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's Outlook tokens
    console.log('Fetching Outlook tokens for user:', user.id);
    const { data: tokenData, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token fetch error:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'No Outlook token found. Please connect your Outlook account first.',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token found, scope:', tokenData.scope);
    console.log('Token expires at:', tokenData.expires_at);

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

    // Create the mail rule in Outlook - using the working pattern from Microsoft docs
    const ruleCondition = blockType === 'domain' 
      ? {
          senderContains: [`@${senderEmail.split('@')[1]}`]
        }
      : {
          senderContains: [senderEmail]
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
    console.log('Using access token (last 20 chars):', tokenData.access_token.slice(-20));

    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleBody)
    });

    console.log('Microsoft Graph response status:', graphResponse.status);
    console.log('Microsoft Graph response headers:', Object.fromEntries(graphResponse.headers.entries()));

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Microsoft Graph API error response:', errorText);
      
      // Try to parse as JSON for better error details
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
        console.error('Parsed error details:', JSON.stringify(errorDetails, null, 2));
      } catch (parseError) {
        console.error('Could not parse error as JSON:', parseError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to create mail rule: ${graphResponse.status} - ${errorText}`,
          success: false,
          microsoftError: errorDetails || errorText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ruleData = await graphResponse.json();
    console.log('Mail rule created successfully:', ruleData.id);

    // Send alert email to user about the suspicious email
    let emailSent = false;
    try {
      // Get user's email from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Failed to get user profile:', profileError);
      } else {
        const userEmail = profileData.username; // username is actually email
        
        console.log('Sending alert email to:', userEmail);
        
        const emailResponse = await resend.emails.send({
          from: "MailGuard Security <onboarding@resend.dev>",
          to: [userEmail],
          subject: "🛡️ Security Alert: Suspicious Email Blocked",
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">🛡️ MailGuard Security Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">We've protected you from a suspicious email</p>
              </div>
              
              <div style="padding: 30px; background: #f9f9f9;">
                <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
                  <h2 style="color: #d63031; margin-top: 0;">⚠️ Suspicious Email Blocked</h2>
                  <p><strong>From:</strong> ${senderEmail}</p>
                  <p><strong>Action Taken:</strong> Future emails from this sender will be automatically blocked</p>
                  <p><strong>Reason:</strong> ${blockType === 'domain' ? 'Entire domain flagged as suspicious' : 'Sender flagged as suspicious'}</p>
                </div>
                
                <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #00b894;">
                  <h3 style="color: #00b894; margin-top: 0;">🛡️ Security Recommendations</h3>
                  <ul style="padding-left: 20px;">
                    <li><strong>Don't click suspicious links:</strong> Verify sender identity before clicking any links</li>
                    <li><strong>Check sender carefully:</strong> Look for misspelled domains or suspicious email addresses</li>
                    <li><strong>Verify requests independently:</strong> If someone asks for sensitive info, verify through other channels</li>
                    <li><strong>Keep software updated:</strong> Update your email client and browser regularly</li>
                    <li><strong>Use strong passwords:</strong> Enable 2FA on important accounts</li>
                  </ul>
                </div>
                
                <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #fdcb6e;">
                  <h3 style="color: #e17055; margin-top: 0;">🚨 Common Email Threats</h3>
                  <div style="display: grid; gap: 15px;">
                    <div>
                      <strong>Phishing:</strong> Fake emails trying to steal your login credentials or personal information
                    </div>
                    <div>
                      <strong>Malware:</strong> Attachments or links that install malicious software on your device
                    </div>
                    <div>
                      <strong>Scams:</strong> Fraudulent schemes asking for money, gift cards, or financial information
                    </div>
                    <div>
                      <strong>Spoofing:</strong> Emails that appear to be from trusted sources but are actually fake
                    </div>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
                  <p style="margin: 0; color: #636e72;">
                    <strong>Stay Safe!</strong><br>
                    MailGuard is continuously monitoring your emails to keep you protected.
                  </p>
                </div>
              </div>
              
              <div style="background: #2d3436; color: white; padding: 20px; text-align: center; font-size: 14px;">
                <p style="margin: 0;">This is an automated security notification from MailGuard</p>
              </div>
            </div>
          `,
        });

        console.log('Alert email sent successfully:', emailResponse);
        emailSent = true;
      }
    } catch (emailError) {
      console.error('Failed to send alert email:', emailError);
    }

    const responseData = {
      success: true,
      message: emailSent 
        ? 'Mail rule created and security alert sent to user successfully'
        : 'Mail rule created successfully - future emails will be blocked',
      ruleId: ruleData.id,
      ruleName: ruleData.displayName,
      alertEmailSent: emailSent,
      emailDeleted: false // Keep for backward compatibility but always false now
    };
    
    return new Response(
      JSON.stringify(responseData),
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