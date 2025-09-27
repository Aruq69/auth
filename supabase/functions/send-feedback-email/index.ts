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
      // Parse the feedback text to extract admin name, subject, and reason
      const feedbackLines = feedback.feedback_text.split('. ');
      const adminMatch = feedbackLines.find(line => line.includes('Admin:'))?.replace('Admin:', '').trim() || 'System Administrator';
      const subjectMatch = feedbackLines.find(line => line.includes('Subject:'))?.replace('Subject:', '').trim() || 'Unknown Subject';
      const reasonMatch = feedbackLines.find(line => line.includes('Reason:'))?.replace('Reason:', '').trim() || 'Security Policy Violation';
      
      // Security Alert Email Template with modern design
      emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; text-align: center; position: relative;">
            <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 36px;">🛡️</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Security Alert
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">
              Email Blocked by Mail Guard Security System
            </p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <!-- Alert Message -->
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 6px solid #dc2626;">
              <h2 style="color: #991b1b; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                <span style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">⚠</span>
                Threat Detected & Neutralized
              </h2>
              <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.6;">
                Our advanced AI system detected and blocked a suspicious email sent to your account. 
                <strong>The email has been quarantined and will not appear in your inbox.</strong>
              </p>
            </div>
            
            <!-- Blocked Email Details -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #6b7280; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">📧</span>
                Blocked Email Details
              </h3>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #ef4444;">
                  <span style="font-weight: 600; color: #374151;">Subject:</span>
                  <span style="color: #374151; max-width: 60%; text-align: right; word-break: break-word;">${subjectMatch}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #f59e0b;">
                  <span style="font-weight: 600; color: #374151;">Threat Type:</span>
                  <span style="color: #dc2626; font-weight: 600; background: #fef2f2; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase;">${reasonMatch}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                  <span style="font-weight: 600; color: #374151;">Blocked By:</span>
                  <span style="color: #374151;">${adminMatch}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #06b6d4;">
                  <span style="font-weight: 600; color: #374151;">Blocked At:</span>
                  <span style="color: #374151;">${new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <!-- Security Actions Taken -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #22c55e; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">✓</span>
                Protective Actions Taken
              </h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Email quarantined and blocked from reaching your inbox</li>
                <li>Automatic mail rule created to block future emails from this sender</li>
                <li>Threat intelligence database updated with new indicators</li>
                <li>Security team notified for further analysis</li>
                <li>Your email security profile remains fully active</li>
              </ul>
            </div>
            
            <!-- Security Tips -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">💡</span>
                Security Awareness Tips
              </h3>
              <div style="color: #374151; line-height: 1.6;">
                <p style="margin: 0 0 12px 0; font-weight: 600;">Always be cautious of:</p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Unexpected emails requesting personal information</li>
                  <li>Urgent messages asking you to click links or download files</li>
                  <li>Emails from unknown senders with suspicious attachments</li>
                  <li>Messages with poor grammar or unusual formatting</li>
                </ul>
              </div>
            </div>
            
            <!-- Next Steps -->
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 25px;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #f59e0b; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">📝</span>
                What Should You Do?
              </h3>
              <p style="color: #374151; margin: 0; line-height: 1.6; font-weight: 500;">
                <strong>No action required from you.</strong> Our AI-powered system continues to monitor your emails 24/7. 
                If you have questions about this security alert, please contact ${adminMatch} or your IT department.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #1f2937; padding: 25px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <span style="background: #374151; color: #9ca3af; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                🤖 AI-Powered Protection
              </span>
            </div>
            <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">
              Mail Guard - Advanced Email Security System
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 12px;">
              Protecting your organization with machine learning and artificial intelligence
            </p>
          </div>
        </div>
      `;
      
      subject = `🛡️ Security Alert: Email Blocked by ${adminMatch} - Mail Guard`;
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
        
        // Don't delete tokens - just log the error and continue with fallback
        console.log('Graph API failed, trying fallback email service...');
        
        throw new Error(`Failed to send email via Microsoft Graph: ${graphError.message || graphError}`);
      }
    } else {
      // Fallback: Try to send via Resend if available
      console.log('=== NO OUTLOOK TOKEN AVAILABLE - TRYING RESEND FALLBACK ===');
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        console.log('Resend API key found, attempting to send via Resend...');
        
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: "Mail Guard Security <onboarding@resend.dev>", // Use Resend's default verified domain
              to: [feedback.email],
              subject: subject,
              html: emailHtml
            })
          });
          
          if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            throw new Error(`Resend API error: ${resendResponse.status} ${errorText}`);
          }
          
          emailResponse = await resendResponse.json();
          console.log('=== EMAIL SENT VIA RESEND ===');
          console.log('Response:', emailResponse);
        } catch (resendError: any) {
          console.error('Resend send failed:', resendError);
          
          // If both Outlook and Resend fail, return graceful error for security alerts
          if (feedback.feedback_type === 'security') {
            console.log('Security alert email failed - returning success to prevent blocking action failure');
            return new Response(JSON.stringify({ 
              success: true, 
              warning: 'Security action completed but alert email could not be sent',
              emailSent: false 
            }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            });
          }
          
          throw new Error(`Failed to send email via Resend: ${resendError.message || resendError}`);
        }
      } else {
        console.log('No Resend API key available');
        
        // For security alerts, don't fail the entire action if email can't be sent
        if (feedback.feedback_type === 'security') {
          console.log('Security alert email failed - returning success to prevent blocking action failure');
          return new Response(JSON.stringify({ 
            success: true, 
            warning: 'Security action completed but alert email could not be sent',
            emailSent: false 
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No email service available - need Outlook connection or Resend API key',
          requiresEmailService: true 
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
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
    
    // For security alerts, still return success to not block the email blocking action
    const requestBody = await req.clone().json();
    if (requestBody.feedback_type === 'security') {
      console.log('Security alert failed but returning success to not block email blocking');
      return new Response(JSON.stringify({ 
        success: true, 
        warning: 'Security action completed but alert email failed',
        emailSent: false,
        error: error.message 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
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