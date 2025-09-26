import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  userEmail: string;
  senderEmail: string;
  blockType: 'sender' | 'domain';
  blockReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const alertData: SecurityAlertRequest = await req.json();
    console.log('Sending security alert email:', alertData);

    // Create formatted security alert email
    const emailHtml = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🛡️ MailGuard Security Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We've protected you from a suspicious email</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
            <h2 style="color: #d63031; margin-top: 0;">⚠️ Suspicious Email Blocked</h2>
            <p><strong>From:</strong> ${alertData.senderEmail}</p>
            <p><strong>Action Taken:</strong> Future emails from this ${alertData.blockType} will be automatically blocked</p>
            <p><strong>Reason:</strong> ${alertData.blockReason}</p>
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
    `;

    const emailResponse = await resend.emails.send({
      from: "MailGuard Security <onboarding@resend.dev>",
      to: [alertData.userEmail],
      subject: "🛡️ Security Alert: Suspicious Email Blocked",
      html: emailHtml,
    });

    console.log("Security alert email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error sending security alert email:", error);
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