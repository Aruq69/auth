import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackEmailRequest {
  feedback_type: string;
  category: string;
  rating?: number;
  feedback_text: string;
  email: string;
  page_url?: string;
  user_agent?: string;
  user_id?: string; // Add user_id to get their Outlook tokens
}

// Function to refresh Microsoft Graph access token
async function refreshMicrosoftToken(refreshToken: string) {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
  
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const params = new URLSearchParams({
    client_id: clientId!,
    client_secret: clientSecret!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite offline_access'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return await response.json();
}

// Function to send email via Microsoft Graph
async function sendEmailViaGraph(accessToken: string, emailData: any) {
  const graphUrl = 'https://graph.microsoft.com/v1.0/me/sendMail';
  
  // First, let's check what scopes the current token has
  const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('Token validation response status:', profileResponse.status);
  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    console.log('Token validation error:', errorText);
    throw new Error(`Token validation failed: ${profileResponse.status} ${errorText}`);
  }
  
  const response = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.html
        },
        toRecipients: [
          {
            emailAddress: {
              address: emailData.to
            }
          }
        ]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via Graph: ${response.status} ${errorText}`);
  }

  return { success: true, status: response.status };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const feedback: FeedbackEmailRequest = await req.json();
    console.log('=== SEND-FEEDBACK-EMAIL FUNCTION CALLED ===');
    console.log('Feedback type:', feedback.feedback_type);
    console.log('Email recipient:', feedback.email);
    console.log('Category:', feedback.category);
    console.log('User ID:', feedback.user_id);
    console.log('Full feedback object:', JSON.stringify(feedback, null, 2));

    // Create different email templates based on type
    let emailHtml = '';
    let subject = '';

    if (feedback.feedback_type === 'security') {
      // Security Alert Email Template
      emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
              <span style="font-size: 40px;">🛡️</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">SECURITY ALERT</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">Mail Guard - ML&AI-powered email security system</p>
          </div>
          
          <!-- Alert Content -->
          <div style="padding: 40px 30px; background: #fff;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-top: 2px;">!</div>
                <div style="flex: 1;">
                  <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">Suspicious Email Blocked</h2>
                  <div style="color: #374151; line-height: 1.6; font-size: 16px;">
                    ${feedback.feedback_text.replace(/🛡️\s*SECURITY ALERT:\s*/i, '').replace(/\n/g, '<br>')}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- What We Did -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #22c55e; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">✓</span>
                Actions Taken
              </h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Email has been blocked and moved to quarantine</li>
                <li>Automatic mail rule created to block future emails from this sender</li>
                <li>Threat intelligence database updated</li>
                <li>Your email security settings remain active</li>
              </ul>
            </div>
            
            <!-- Next Steps -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 25px;">
              <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">i</span>
                Stay Protected
              </h3>
              <p style="color: #374151; margin: 0; line-height: 1.6;">
                No action required from you. Our AI-powered system continues to monitor your emails 24/7. 
                If you have any concerns, please contact your system administrator.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #1f2937; padding: 25px; text-align: center;">
            <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">
              Mail Guard - ML&AI-powered email security system
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">
              Protecting your organization with advanced machine learning and artificial intelligence
            </p>
          </div>
        </div>
      `;
      
      subject = `🛡️ Security Alert: Suspicious Email Blocked - Mail Guard`;
    } else {
      // Standard Feedback Email Template
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #8b5cf6); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📧 Mail Guard Feedback</h1>
          </div>
          
          <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">New ${feedback.feedback_type.toUpperCase()} Feedback</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <h3 style="margin: 0 0 10px 0; color: #334155;">Feedback Details</h3>
              <p><strong>Type:</strong> <span style="background: #0ea5e9; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${feedback.feedback_type.toUpperCase()}</span></p>
              <p><strong>Category:</strong> ${feedback.category}</p>
              ${feedback.rating ? `<p><strong>Rating:</strong> ${'⭐'.repeat(feedback.rating)} (${feedback.rating}/5)</p>` : ''}
              <p><strong>From:</strong> ${feedback.email}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <h3 style="margin: 0 0 15px 0; color: #334155;">Message</h3>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; line-height: 1.6;">
                ${feedback.feedback_text.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            ${feedback.page_url && feedback.user_agent ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #64748b;">
              <p><strong>Page:</strong> ${feedback.page_url}</p>
              <p><strong>Browser:</strong> ${feedback.user_agent}</p>
              <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
            </div>
            ` : `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #64748b;">
              <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
            </div>
            `}
          </div>
          
          <div style="background: #1e293b; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">Mail Guard - ML&AI-powered email security system</p>
          </div>
        </div>
      `;

      // Create subject line based on feedback type
      const getSubject = () => {
        const emoji = {
          bug: '🐛',
          feature: '💡',
          ux: '⭐',
          general: '💬'
        }[feedback.feedback_type] || '📧';
        
        return `${emoji} Mail Guard ${feedback.feedback_type.charAt(0).toUpperCase() + feedback.feedback_type.slice(1)} Feedback - ${feedback.category}`;
      };
      
      subject = getSubject();
    }

    // Get user's Outlook tokens if user_id is provided
    let accessToken = null;
    if (feedback.user_id) {
      console.log('=== FETCHING OUTLOOK TOKENS ===');
      const { data: tokenData, error: tokenError } = await supabase
        .from('outlook_tokens')
        .select('access_token, refresh_token, expires_at, email_address')
        .eq('user_id', feedback.user_id)
        .single();

      if (tokenError) {
        console.error('Error fetching tokens:', tokenError);
      } else if (tokenData) {
        console.log('Token found for email:', tokenData.email_address);
        
        // Check if token needs refresh
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);
        
        if (now >= expiresAt) {
          console.log('Token expired, refreshing...');
          try {
            const refreshedTokens = await refreshMicrosoftToken(tokenData.refresh_token);
            
            // Update tokens in database
            const newExpiresAt = new Date(Date.now() + (refreshedTokens.expires_in * 1000));
            await supabase
              .from('outlook_tokens')
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: newExpiresAt.toISOString(),
              })
              .eq('user_id', feedback.user_id);
            
            accessToken = refreshedTokens.access_token;
            console.log('Token refreshed successfully');
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
          }
        } else {
          accessToken = tokenData.access_token;
          console.log('Using existing valid token');
        }
      }
    }

    console.log('=== ATTEMPTING TO SEND EMAIL ===');
    console.log('Using Microsoft Graph:', !!accessToken);
    console.log('To:', feedback.email);
    console.log('Subject:', subject);

    let emailResponse;
    
    if (accessToken) {
      // Send via Microsoft Graph
      try {
        emailResponse = await sendEmailViaGraph(accessToken, {
          to: feedback.email,
          subject: subject,
          html: emailHtml
        });
        console.log('=== EMAIL SENT VIA MICROSOFT GRAPH ===');
        console.log('Response:', emailResponse);
      } catch (graphError: any) {
        console.error('Microsoft Graph send failed:', graphError);
        
        // If it's a 403 error (access denied), delete the tokens to force re-authentication
        if (graphError.message && graphError.message.includes('403')) {
          console.log('=== 403 ERROR - DELETING TOKENS TO FORCE RE-AUTH ===');
          try {
            await supabase
              .from('outlook_tokens')
              .delete()
              .eq('user_id', feedback.user_id);
            console.log('Tokens deleted successfully');
          } catch (deleteError) {
            console.error('Failed to delete tokens:', deleteError);
          }
          
          throw new Error(`Access denied. Please disconnect and reconnect your Outlook account to update permissions. Original error: ${graphError.message || graphError}`);
        }
        
        throw new Error(`Failed to send email via Microsoft Graph: ${graphError.message || graphError}`);
      }
    } else {
      // Fallback: Send notification that email couldn't be sent
      console.log('=== NO OUTLOOK TOKEN AVAILABLE ===');
      console.log('Cannot send email - user needs to connect Outlook account');
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User needs to connect Outlook account to send emails',
        requiresOutlookAuth: true 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERROR IN SEND-FEEDBACK-EMAIL FUNCTION ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    return new Response(
      JSON.stringify({ error: error.message, details: error }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);