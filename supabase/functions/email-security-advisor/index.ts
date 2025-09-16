import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { user_id, email_data, analysis_type = 'patterns' } = body;

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let advice = '';

    try {
      if (analysis_type === 'individual' && email_data) {
        console.log('Generating individual email advice');
        advice = await generateIndividualEmailAdvice(email_data);
      } else if (analysis_type === 'patterns' && user_id) {
        console.log('Generating pattern-based advice for user:', user_id);
        advice = await generatePatternBasedAdvice(supabase, user_id);
      } else if (analysis_type === 'comprehensive' && user_id) {
        console.log('Generating comprehensive advice for user:', user_id);
        advice = await generateComprehensiveAdvice(supabase, user_id, email_data);
      } else {
        console.error('Invalid request parameters:', { analysis_type, user_id: !!user_id, email_data: !!email_data });
        return new Response(
          JSON.stringify({ error: 'Invalid request parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (analysisError) {
      console.error('Error during analysis:', analysisError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate analysis', details: analysisError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated advice length:', advice.length);
    return new Response(
      JSON.stringify({ advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in email-security-advisor function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateIndividualEmailAdvice(emailData: any): Promise<string> {
  console.log('Generating individual advice for email:', emailData.subject);
  const { subject, sender, threatLevel, threatType, classification, keywords, confidence } = emailData;

  const prompt = `You are a cybersecurity expert providing actionable advice about a specific email threat.

Email Analysis:
- Subject: "${subject}"
- Sender: "${sender}"
- Classification: ${classification}
- Threat Level: ${threatLevel}
- Threat Type: ${threatType || 'Unknown'}
- Confidence: ${confidence || 'Unknown'}%
- Risk Keywords: ${keywords?.join(', ') || 'None'}

Provide specific, actionable advice for this email:
1. Immediate actions (what to do/not do right now)
2. How to verify legitimacy
3. Red flags to note
4. Reporting steps if needed

Keep response under 200 words, use bullet points, be direct and practical.`;

  return await callOpenAI(prompt);
}

async function generatePatternBasedAdvice(supabase: any, userId: string): Promise<string> {
  console.log('Fetching email statistics for user:', userId);
  // Get user's email statistics
  const { data: stats, error } = await supabase
    .from('email_statistics')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30); // Last 30 days

  console.log('Email statistics query result:', { error, statsCount: stats?.length });
  
  if (error) {
    console.error('Error fetching email statistics:', error);
    return "Unable to fetch email statistics. Please try again later.";
  }
  
  if (!stats?.length) {
    console.log('No email statistics found for user');
    return "No email pattern data available yet. Sync your Gmail or analyze more emails to get personalized security insights.";
  }

  // Aggregate statistics
  const totalStats = stats.reduce((acc: any, stat: any) => ({
    total_emails: acc.total_emails + (stat.total_emails || 0),
    safe_emails: acc.safe_emails + (stat.safe_emails || 0),
    high_threat_emails: acc.high_threat_emails + (stat.high_threat_emails || 0),
    medium_threat_emails: acc.medium_threat_emails + (stat.medium_threat_emails || 0),
    low_threat_emails: acc.low_threat_emails + (stat.low_threat_emails || 0),
    spam_emails: acc.spam_emails + (stat.spam_emails || 0),
    phishing_emails: acc.phishing_emails + (stat.phishing_emails || 0),
    malware_emails: acc.malware_emails + (stat.malware_emails || 0),
    suspicious_emails: acc.suspicious_emails + (stat.suspicious_emails || 0)
  }), {
    total_emails: 0, safe_emails: 0, high_threat_emails: 0, medium_threat_emails: 0,
    low_threat_emails: 0, spam_emails: 0, phishing_emails: 0, malware_emails: 0, suspicious_emails: 0
  });

  const threatEmails = totalStats.high_threat_emails + totalStats.medium_threat_emails + totalStats.low_threat_emails;
  const safetyRate = totalStats.total_emails > 0 ? Math.round((totalStats.safe_emails / totalStats.total_emails) * 100) : 0;

  const prompt = `You are a cybersecurity expert analyzing a user's email security patterns over the last 30 days.

User's Email Security Profile:
- Total Emails: ${totalStats.total_emails}
- Safe Emails: ${totalStats.safe_emails}
- Threat Emails: ${threatEmails}
- Safety Rate: ${safetyRate}%

Threat Breakdown:
- Spam: ${totalStats.spam_emails}
- Phishing: ${totalStats.phishing_emails}
- Malware: ${totalStats.malware_emails}
- Suspicious: ${totalStats.suspicious_emails}
- High Risk: ${totalStats.high_threat_emails}
- Medium Risk: ${totalStats.medium_threat_emails}
- Low Risk: ${totalStats.low_threat_emails}

Provide personalized security advice based on these patterns:
1. Risk assessment of their email environment
2. Specific vulnerabilities they're facing
3. Targeted protection recommendations
4. Behavioral changes to improve security

Keep response under 250 words, be specific to their threat profile.`;

  return await callOpenAI(prompt);
}

async function generateComprehensiveAdvice(supabase: any, userId: string, emailData?: any): Promise<string> {
  console.log('Generating comprehensive advice for user:', userId);
  // Get both statistics and recent emails for comprehensive analysis
  const [statsResult, emailsResult] = await Promise.all([
    supabase
      .from('email_statistics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7), // Last week
    
    supabase
      .from('emails')
      .select('subject, sender, threat_level, threat_type, classification, keywords, received_date')
      .eq('user_id', userId)
      .order('received_date', { ascending: false })
      .limit(10) // Recent emails
  ]);

  const stats = statsResult.data || [];
  const emails = emailsResult.data || [];

  // Calculate trends
  const totalStats = stats.reduce((acc: any, stat: any) => ({
    total_emails: acc.total_emails + (stat.total_emails || 0),
    safe_emails: acc.safe_emails + (stat.safe_emails || 0),
    threat_emails: acc.threat_emails + (stat.high_threat_emails || 0) + (stat.medium_threat_emails || 0) + (stat.low_threat_emails || 0),
    spam_emails: acc.spam_emails + (stat.spam_emails || 0),
    phishing_emails: acc.phishing_emails + (stat.phishing_emails || 0)
  }), { total_emails: 0, safe_emails: 0, threat_emails: 0, spam_emails: 0, phishing_emails: 0 });

  // Analyze sender patterns
  const senderPatterns = emails.reduce((acc: any, email: any) => {
    if (email.threat_level && email.threat_level !== 'safe') {
      const domain = email.sender.split('@')[1] || 'unknown';
      acc[domain] = (acc[domain] || 0) + 1;
    }
    return acc;
  }, {});

  const topThreatDomains = Object.entries(senderPatterns)
    .sort(([,a]: any, [,b]: any) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([domain]) => domain);

  const prompt = `You are a cybersecurity expert providing comprehensive email security analysis.

User's Security Overview (Last 7 Days):
- Total Emails: ${totalStats.total_emails}
- Safe: ${totalStats.safe_emails}
- Threats: ${totalStats.threat_emails}
- Spam: ${totalStats.spam_emails}
- Phishing: ${totalStats.phishing_emails}

${emailData ? `Current Email Alert:
- Subject: "${emailData.subject}"
- Threat: ${emailData.threatType} (${emailData.threatLevel})` : ''}

${topThreatDomains.length > 0 ? `Top Threat Domains: ${topThreatDomains.join(', ')}` : ''}

Provide comprehensive security recommendations:
1. Current risk assessment
2. Immediate action items
3. Long-term security improvements
4. Monitoring recommendations
${emailData ? '5. Specific advice for the current email threat' : ''}

Keep response under 300 words, prioritize actionable items.`;

  return await callOpenAI(prompt);
}

async function callOpenAI(prompt: string): Promise<string> {
  console.log('Calling OpenAI with prompt length:', prompt.length);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a cybersecurity expert providing clear, actionable email security advice. Use bullet points and be direct.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}