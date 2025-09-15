import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
  page_url: string;
  user_agent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feedback: FeedbackEmailRequest = await req.json();
    console.log('Sending feedback email:', feedback);

    // Create formatted feedback email
    const emailHtml = `
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
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #64748b;">
            <p><strong>Page:</strong> ${feedback.page_url}</p>
            <p><strong>Browser:</strong> ${feedback.user_agent}</p>
            <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div style="background: #1e293b; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">Mail Guard - AI-Powered Email Security System</p>
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

    const emailResponse = await resend.emails.send({
      from: "Mail Guard <onboarding@resend.dev>",
      to: ["arfalqtan@gmail.com"],
      subject: getSubject(),
      html: emailHtml,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending feedback email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);