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

    // Get Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare AI prompt based on analysis type
    let systemPrompt = `You are MAIL GUARD AI, an expert email security advisor. Provide detailed, actionable security advice based on email analysis.

Your responses should be:
- Specific and actionable
- Security-focused
- Professional but approachable
- Include bullet points for clear guidance
- Mention specific threat indicators when relevant

Format your response with clear sections using **bold headers** and • bullet points.`;

    let userMessage = '';

    if (analysis_type === 'patterns') {
      userMessage = `Provide comprehensive email security advice based on overall email patterns and trends. Focus on proactive security measures and best practices for email safety.`;
      
    } else if (analysis_type === 'individual' && email_data) {
      const { subject, sender, threatLevel, threatType, classification, keywords } = email_data;
      
      userMessage = `Analyze this specific email and provide targeted security advice:

Email Details:
- Subject: "${subject}"
- Sender: "${sender}"
- Threat Level: ${threatLevel || 'Unknown'}
- Threat Type: ${threatType || 'Unknown'}
- Classification: ${classification || 'Unknown'}
- Detected Keywords: ${keywords?.join(', ') || 'None'}

Provide specific advice for this email including immediate actions, risk assessment, and next steps.`;

    } else if (analysis_type === 'comprehensive') {
      userMessage = `Provide a comprehensive email security analysis covering current security status, recommendations for improvement, and best practices for ongoing email safety.`;
    }

    // Call Groq API
    console.log('Calling Groq API for email security advice');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorData);
      
      // Return fallback advice if AI fails
      let fallbackAdvice = '';
      if (analysis_type === 'individual' && email_data) {
        const { subject, sender, threatLevel } = email_data;
        fallbackAdvice = `**Security Alert for: "${subject}"**\n\n• Verify sender "${sender}" through alternative channels\n• Exercise caution with this ${threatLevel} threat level email\n• Do not click links or download attachments until verified`;
      } else {
        fallbackAdvice = `**Email Security Recommendations**\n\n• Verify sender authenticity before taking action\n• Be cautious with urgent requests\n• Enable two-factor authentication\n• Report suspicious emails`;
      }
      
      return new Response(
        JSON.stringify({ advice: fallbackAdvice }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const advice = groqData.choices[0]?.message?.content || 'Unable to generate security advice at this time.';

    console.log('Generated advice successfully');
    
    return new Response(
      JSON.stringify({ advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in email-security-advisor function:', error);
    console.error('Error details:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message,
        advice: 'Unable to generate personalized advice at this time. Please ensure you have proper email security practices in place and try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});