import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feedback: FeedbackEmailRequest = await req.json();
    console.log('=== SEND-FEEDBACK-EMAIL FUNCTION CALLED ===');
    console.log('Feedback type:', feedback.feedback_type);
    console.log('Email recipient:', feedback.email);
    console.log('Category:', feedback.category);
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

    console.log('=== ATTEMPTING TO SEND EMAIL ===');
    console.log('From: Mail Guard <onboarding@resend.dev>');
    console.log('To:', [feedback.email]);
    console.log('Subject:', subject);
    console.log('Resend API Key present:', !!Deno.env.get("RESEND_API_KEY"));

    // For testing, use verified email address to avoid Resend domain restrictions
    const testRecipient = "arfalqtan@gmail.com"; // Your verified Resend email
    const actualRecipient = feedback.email;
    
    console.log(`=== EMAIL SEND (TEST MODE) ===`);
    console.log(`Original recipient: ${actualRecipient}`);
    console.log(`Test recipient: ${testRecipient}`);

    const emailResponse = await resend.emails.send({
      from: "Mail Guard <onboarding@resend.dev>",
      to: [testRecipient], // Using verified email for testing
      subject: `${subject} (Originally for: ${actualRecipient})`,
      html: `
        <div style="background-color: #f0f0f0; padding: 10px; margin-bottom: 20px; border-left: 4px solid #007bff;">
          <strong>Test Mode:</strong> This email was originally intended for: ${actualRecipient}
        </div>
        ${emailHtml}
      `,
    });

    console.log("=== EMAIL SEND RESULT ===");
    console.log("Email sent successfully:", emailResponse);

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