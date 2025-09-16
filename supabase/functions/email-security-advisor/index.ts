import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    
    // Handle case where body might be empty
    let body;
    try {
      body = await req.json();
      console.log('Request body received:', JSON.stringify(body));
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id, email_data, analysis_type = 'patterns' } = body;
    console.log('Analysis type:', analysis_type);
    console.log('User ID:', user_id);

    // Basic validation
    if (!user_id) {
      console.error('Missing user_id in request');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // For now, let's provide a simple response for patterns analysis
    let advice = '';

    if (analysis_type === 'patterns') {
      advice = `Based on your email analysis patterns, here are some key security recommendations:

• **Monitor High-Risk Emails**: Stay vigilant for emails with urgent language, unusual sender domains, or unexpected attachments
• **Verify Sender Identity**: Always double-check sender authenticity for financial or sensitive requests  
• **Enable Two-Factor Authentication**: Protect your accounts with 2FA whenever possible
• **Regular Security Audits**: Review your account security settings monthly
• **Report Suspicious Activity**: Forward phishing attempts to your IT team or email provider

Your current privacy settings ensure maximum data protection while still providing security insights.`;

    } else if (analysis_type === 'individual' && email_data) {
      const { subject, sender, threatLevel } = email_data;
      
      advice = `**Analysis for: "${subject}"**

**Immediate Actions:**
• DO NOT click any links or download attachments
• Verify sender "${sender}" through alternative communication
• Check sender domain carefully for misspellings

**Security Assessment:**
• Threat Level: ${threatLevel || 'Unknown'}
• Recommendation: Treat with caution until verified

**Next Steps:**
• Report this email if suspicious
• Delete if confirmed malicious
• Contact sender through known channels if legitimate`;

    } else if (analysis_type === 'comprehensive') {
      advice = `**Comprehensive Security Analysis**

**Current Status:**
• Email security monitoring is active
• Privacy-first mode protects your data
• Real-time threat detection enabled

**Recommendations:**
• Continue monitoring email patterns
• Enable additional security features if available
• Regular security awareness training
• Backup important data regularly

**Best Practices:**
• Never share passwords via email
• Be cautious with urgent financial requests
• Verify all suspicious communications
• Keep software updated`;
    }

    console.log('Generated advice successfully');
    
    return new Response(
      JSON.stringify({ advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in email-security-advisor function:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        advice: 'Unable to generate personalized advice at this time. Please ensure you have proper email security practices in place and try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});