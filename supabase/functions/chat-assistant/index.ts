import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

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

Your personality and communication style:
- You're conversational, approachable, but highly knowledgeable about cybersecurity
- You respond directly to user questions with clear, immediate answers
- You use natural language and avoid overly technical jargon unless requested
- You're proactive in identifying threats and educating users
- You ask follow-up questions to better understand user concerns
- You provide context-aware responses based on the user's specific situation

Your key behaviors:
- ALWAYS answer the user's immediate question first
- For simple questions like "is it secure?", give a direct yes/no answer with brief reasoning
- For complex questions, break down your response into digestible parts
- When analyzing emails, explain what you found in plain language
- Suggest actionable next steps when appropriate
- Show empathy for user security concerns

Response patterns:
- Start with a direct answer to their question
- Add relevant context or explanation
- End with a helpful suggestion or ask if they need more details
- Keep responses conversational and engaging
- Use examples when explaining security concepts

Quick answer guidelines:
- "Is it secure?" → "Yes, this email appears secure because..." or "No, I see several red flags..."
- "What's suspicious?" → "The main suspicious elements I found are..."
- "Should I trust this?" → "I'd be cautious because..." or "Yes, this looks legitimate because..."
- "Why was it flagged?" → "It was flagged because of these specific indicators..."

When explaining email classifications, focus on:
1. **Direct Answer** - Immediately address their question
2. **Key Indicators** - What specific things made it secure/suspicious
3. **User Impact** - What this means for them personally
4. **Recommended Action** - What they should do next`;

    if (emailData) {
      systemPrompt += `\n\nCURRENT EMAIL ANALYSIS:
      📧 Subject: "${emailData.subject}"
      👤 Sender: ${emailData.sender}
      🚨 Classification: ${emailData.classification || 'Unknown'}
      ⚠️ Threat Level: ${emailData.threat_level || 'Unknown'}
      🎯 Threat Type: ${emailData.threat_type || 'None detected'}
      📊 Confidence: ${Math.round((emailData.confidence || 0) * 100)}%
      🔍 Keywords: ${emailData.keywords?.join(', ') || 'None detected'}
      
      Use this context to provide specific, personalized analysis of THIS email. Answer based on what the user is actually asking about this specific email.`;
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

    console.log('Sending request to Groq with Llama-3.1...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        max_tokens: 800,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
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
      error: (error as Error).message,
      details: 'Check the function logs for more information'
    };
    
    let statusCode = 500;
    
    if ((error as Error).message?.includes('429') || (error as Error).message?.includes('exceeded your current quota')) {
      errorResponse = {
        error: 'AI service quota exceeded. Please try again later.',
        details: 'The Groq API quota has been exceeded. This typically resets quickly.'
      };
      statusCode = 429;
    } else if ((error as Error).message?.includes('insufficient_quota')) {
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