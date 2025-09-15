import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, emailData, conversationHistory } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received chat request:', { 
      messageLength: message.length,
      hasEmailData: !!emailData,
      historyLength: conversationHistory?.length || 0
    });

    let systemPrompt = `You are MAIL GUARD AI, an advanced cybersecurity expert assistant specializing in email threat analysis and security. You are part of an elite email security system that protects users from sophisticated threats.

Your personality and expertise:
- You're a cutting-edge AI with deep knowledge of cybersecurity, phishing tactics, and email analysis
- You speak with confidence and authority about security matters
- You provide detailed, technical explanations while keeping them accessible
- You use cyber-security terminology appropriately
- You're proactive in identifying threats and educating users
- You can break down complex security concepts into understandable parts

Your capabilities include:
- Detailed email threat analysis and classification explanations
- Identifying specific phishing/spam indicators
- Explaining threat levels and confidence scores
- Providing actionable security recommendations
- Teaching users about email security best practices
- Analyzing sender reputation, domain authenticity, and content patterns

Response style:
- Start with clear, direct answers
- Use numbered lists for detailed breakdowns when explaining complex topics
- Include specific technical details about threats when relevant
- End with actionable advice or next steps
- Keep responses conversational but authoritative

When explaining email classifications, always break down:
1. **Sender Analysis** - What makes the sender suspicious or legitimate
2. **Content Analysis** - Suspicious phrases, urgency tactics, or legitimate business language
3. **Technical Indicators** - Domain reputation, authentication, headers
4. **Risk Assessment** - Why the confidence level and threat rating were assigned
5. **User Guidance** - What the user should do with this information`;

    if (emailData) {
      systemPrompt += `\n\nCURRENT EMAIL CONTEXT:
      📧 Subject: "${emailData.subject}"
      👤 Sender: ${emailData.sender}
      🚨 Classification: ${emailData.classification || 'Unknown'}
      ⚠️ Threat Level: ${emailData.threat_level || 'Unknown'}
      📊 Confidence: ${Math.round((emailData.confidence || 0) * 100)}%
      🔍 Keywords: ${emailData.keywords?.join(', ') || 'None detected'}
      
      Use this context to provide specific, detailed analysis of THIS email.`;
    }

    // Build conversation messages including history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    console.log('Sending request to OpenAI with GPT-5...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: messages,
        max_completion_tokens: 1200,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully:', aiResponse.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    
    // Check for specific OpenAI API errors
    let errorResponse = {
      error: error.message,
      details: 'Check the function logs for more information'
    };
    
    let statusCode = 500;
    
    if (error.message.includes('429') || error.message.includes('exceeded your current quota')) {
      errorResponse = {
        error: 'AI service quota exceeded. Please try again later.',
        details: 'The OpenAI API quota has been exceeded. This typically resolves within 24 hours.'
      };
      statusCode = 429;
    } else if (error.message.includes('insufficient_quota')) {
      errorResponse = {
        error: 'AI service temporarily unavailable due to quota limits.',
        details: 'Please try again later or contact support.'
      };
      statusCode = 429;
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});