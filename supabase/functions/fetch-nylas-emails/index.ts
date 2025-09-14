import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!nylasApiKey || !openaiApiKey) {
      console.error('❌ Missing API keys:', { nylas: !!nylasApiKey, openai: !!openaiApiKey });
      return new Response(JSON.stringify({ error: 'API keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();
    console.log('📨 Fetching emails for user:', user_id);

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Nylas tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('nylas_tokens')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('❌ No Nylas tokens found:', tokenError);
      return new Response(JSON.stringify({ error: 'Nylas account not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔑 Retrieved tokens for grant:', tokenData.grant_id);

    // Fetch recent emails using Nylas API
    const messagesResponse = await fetch(`https://api.nylas.com/v3/grants/${tokenData.grant_id}/messages?limit=20&received_after=${Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)}`, {
      headers: {
        'Authorization': `Bearer ${nylasApiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('❌ Nylas API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch emails from Nylas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messagesData = await messagesResponse.json();
    console.log(`📧 Retrieved ${messagesData.data?.length || 0} messages`);

    let processedCount = 0;
    const emailSummaries = [];

    // Process each email
    for (const message of messagesData.data || []) {
      try {
        console.log(`🔍 Processing message: ${message.id}`);

        // Check if we already processed this email
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('message_id', message.id)
          .maybeSingle();

        if (existingEmail) {
          console.log(`⏭️ Email ${message.id} already processed, skipping`);
          continue;
        }

        // Prepare email content for analysis
        const emailContent = {
          subject: message.subject || '',
          from: message.from?.[0]?.email || '',
          body: message.body || message.snippet || '',
          date: new Date(message.date * 1000).toISOString(),
        };

        // Analyze with OpenAI
        const analysisPrompt = `
        Analyze this email for security threats and spam detection:
        
        Subject: ${emailContent.subject}
        From: ${emailContent.from}
        Body: ${emailContent.body.substring(0, 2000)}
        
        Return a JSON response with:
        - classification: "spam", "phishing", "suspicious", or "legitimate"
        - threat_level: "high", "medium", "low", or null
        - confidence: number between 0-1
        - keywords: array of suspicious keywords found
        - reasoning: brief explanation
        `;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a cybersecurity expert analyzing emails for threats. Always respond with valid JSON.' },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        let analysis = {
          classification: 'legitimate',
          threat_level: null,
          confidence: 0.8,
          keywords: [],
          reasoning: 'Default analysis'
        };

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          try {
            analysis = JSON.parse(openaiData.choices[0].message.content);
            console.log(`✅ Analysis complete for ${message.id}:`, analysis.classification);
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI response:', parseError);
          }
        } else {
          console.error('❌ OpenAI API error:', await openaiResponse.text());
        }

        // Store in database
        const { error: insertError } = await supabase
          .from('emails')
          .insert({
            user_id,
            message_id: message.id,
            subject: emailContent.subject,
            sender: emailContent.from,
            content: emailContent.body,
            raw_content: JSON.stringify(message),
            classification: analysis.classification,
            threat_level: analysis.threat_level,
            confidence: analysis.confidence,
            keywords: analysis.keywords,
            received_date: emailContent.date,
            processed_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('❌ Database insert error:', insertError);
        } else {
          processedCount++;
          emailSummaries.push({
            id: message.id,
            subject: emailContent.subject,
            from: emailContent.from,
            classification: analysis.classification,
            threat_level: analysis.threat_level,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
      }
    }

    console.log(`🎉 Successfully processed ${processedCount} emails`);

    return new Response(JSON.stringify({
      success: true,
      total: processedCount,
      summary: emailSummaries,
      provider: tokenData.provider,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in fetch-nylas-emails:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});