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
async function sendEmailViaGraph(accessToken: string, to: string, subject: string, htmlContent: string) {
  const graphUrl = 'https://graph.microsoft.com/v1.0/me/sendMail';
  
  const message = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: htmlContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    }
  };

  const response = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft Graph API Error:', errorText);
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
            
            <!-- What Happens Next -->
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 6px solid #0ea5e9;">
              <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #0ea5e9; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">🛡️</span>
                What We've Done
              </h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Created a mail rule to automatically block future emails from this sender</li>
                <li>Logged the security incident for analysis</li>
                <li>Enhanced our AI models with this threat pattern</li>
                <li>Notified system administrators of the incident</li>
              </ul>
            </div>
            
            <!-- Security Tips -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; border-left: 6px solid #16a34a;">
              <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="background: #16a34a; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">💡</span>
                Security Awareness Tips
              </h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li><strong>Verify sender identity:</strong> Always double-check sender addresses, especially for urgent requests</li>
                <li><strong>Hover before clicking:</strong> Hover over links to see where they really lead</li>
                <li><strong>Trust your instincts:</strong> If something feels suspicious, report it to your IT team</li>
                <li><strong>Keep systems updated:</strong> Regular updates help protect against new threats</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #374151; padding: 20px; text-align: center; color: #d1d5db;">
            <p style="margin: 0; font-size: 14px; font-weight: 500;">
              🤖 Mail Guard - AI-Powered Email Security
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
      
      // Set appropriate emoji for different feedback types
      const typeEmojis: { [key: string]: string } = {
        'bug': '🐛',
        'feature': '✨',
        'improvement': '📈',
        'complaint': '😞',
        'praise': '👏',
        'question': '❓',
        'security': '🛡️'
      };
      
      const emoji = typeEmojis[feedback.feedback_type] || '📧';
      subject = `${emoji} New ${feedback.feedback_type.charAt(0).toUpperCase() + feedback.feedback_type.slice(1)} Feedback from ${feedback.email}`;
    }

    console.log('Subject:', subject);

    // Check if user has Microsoft Graph token for more reliable email sending
    if (feedback.user_id) {
      console.log('=== FETCHING OUTLOOK TOKENS ===');
      const { data: tokens } = await supabase
        .from('outlook_tokens')
        .select('*')
        .eq('user_id', feedback.user_id)
        .single();

      if (tokens) {
        console.log('Token found for email:', tokens.email_address);
        
        try {
          // Check if token is expired
          const now = new Date();
          const expiresAt = new Date(tokens.expires_at);
          
          let accessToken = tokens.access_token;
          
          if (now >= expiresAt) {
            console.log('Token expired, refreshing...');
            const refreshedTokens = await refreshMicrosoftToken(tokens.refresh_token);
            
            // Update tokens in database
            await supabase
              .from('outlook_tokens')
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq('user_id', feedback.user_id);
              
            accessToken = refreshedTokens.access_token;
            console.log('Token refreshed successfully');
          } else {
            console.log('Using existing valid token');
          }

          // Validate token by making a test call
          const testResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          console.log('Token validation response status:', testResponse.status);
          
          if (testResponse.ok) {
            console.log('=== ATTEMPTING TO SEND EMAIL ===');
            console.log('To:', feedback.email);
            console.log('Using Microsoft Graph:', true);
            
            try {
              await sendEmailViaGraph(accessToken, feedback.email, subject, emailHtml);
              console.log('Email sent successfully via Microsoft Graph');
              
              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Email sent successfully',
                emailSent: true,
                method: 'microsoft-graph'
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            } catch (graphError: any) {
              console.error('Microsoft Graph send failed:', graphError);
              console.log('Graph API failed, trying fallback email service...');
              
              // Continue to fallback method below
            }
          }
        } catch (tokenError: any) {
          console.error('Token handling failed:', tokenError);
          console.log('Token handling failed, trying fallback email service...');
          // Continue to fallback method below
        }
      }
    }

    // Fallback to Resend if Microsoft Graph fails or is not available
    console.log('Using Resend as fallback email service');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('No email service available - both Microsoft Graph and Resend are unavailable');
    }

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MailGuard <arfalqtan@gmail.com>', // Use verified sender email for now
          to: [feedback.email],
          subject: subject,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text();
        console.error('Resend API Error:', resendError);
        
        // For security alerts, still return success to not block the email blocking action
        if (feedback.feedback_type === 'security') {
          console.log('Security alert failed via Resend but returning success to not block email blocking');
          return new Response(JSON.stringify({ 
            success: true, 
            warning: 'Security action completed but alert email failed',
            emailSent: false 
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        }
        
        throw new Error(`Failed to send email via Resend: ${resendError}`);
      }

      const resendResult = await resendResponse.json();
      console.log('Email sent successfully via Resend:', resendResult);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailSent: true,
        method: 'resend',
        result: resendResult
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
      
    } catch (resendError: any) {
      console.error('Resend send failed:', resendError);
      
      // For security alerts, still return success to not block the email blocking action
      if (feedback.feedback_type === 'security') {
        console.log('Security alert failed via Resend but returning success to not block email blocking');
        return new Response(JSON.stringify({ 
          success: true, 
          warning: 'Security action completed but alert email failed',
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

  } catch (error: any) {
    console.error("=== ERROR IN SEND-FEEDBACK-EMAIL FUNCTION ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    
    // For security alerts, still return success to not block the email blocking action
    // Check if this is a security alert by trying to parse the error context
    const errorMessage = error.message || '';
    const isSecurityAlert = errorMessage.includes('security') || 
                           error.context?.feedback_type === 'security';
    
    if (isSecurityAlert) {
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