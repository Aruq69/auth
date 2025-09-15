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

// Enhanced email classification with multiple methods
class EmailClassifier {
  private suspiciousKeywords = [
    // Financial/Crypto scams
    'urgent action required', 'account suspended', 'verify account', 'update payment',
    'crypto wallet', 'bitcoin', 'ethereum', 'wallet compromised', 'security breach',
    'immediate response', 'click here now', 'act now', 'limited time',
    
    // Phishing patterns
    'suspended account', 'unusual activity', 'verify identity', 'confirm payment',
    'tax refund', 'refund pending', 'prize winner', 'lottery winner',
    'free money', 'claim reward', 'congratulations you won',
    
    // Urgency indicators
    'expires today', 'final notice', 'last chance', 'time sensitive',
    'within 24 hours', 'immediate attention', 'respond immediately'
  ];

  private legitimateDomains = [
    'gmail.com', 'outlook.com', 'yahoo.com', 'apple.com', 'amazon.com',
    'paypal.com', 'microsoft.com', 'google.com', 'facebook.com', 'twitter.com',
    'linkedin.com', 'dropbox.com', 'github.com', 'stackoverflow.com',
    'ilabank.com', 'marketing.ilabank.com', 'info.beyonmoney.com', 'beyonmoney.com',
    'bebee.com', 'notification.bebee.com', 'bankofbahrain.com', 'btelco.com',
    'gov.bh', 'edu.bh', 'bahrain.bh'
  ];

  private suspiciousDomains = [
    '.tk', '.ml', '.ga', '.cf', 'secure-', 'verify-', 'update-', 'account-'
  ];

  // Rule-based classification with dynamic confidence calculation
  classifyWithRules(subject: string, sender: string, content: string) {
    const text = `${subject} ${content}`.toLowerCase();
    const senderDomain = sender.split('@')[1]?.toLowerCase() || '';
    
    let suspiciousScore = 0;
    let foundKeywords: string[] = [];
    let confidenceFactors = [];
    
    // Check for suspicious keywords with different weights
    for (const keyword of this.suspiciousKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        suspiciousScore += 2;
        foundKeywords.push(keyword);
        confidenceFactors.push(`keyword: ${keyword}`);
      }
    }
    
    // Check sender domain
    const isDomainSuspicious = this.suspiciousDomains.some(suspicious => 
      senderDomain.includes(suspicious)
    );
    if (isDomainSuspicious) {
      suspiciousScore += 3;
      confidenceFactors.push('suspicious domain pattern');
    }
    
    // Check for legitimate domains
    const isLegitDomain = this.legitimateDomains.includes(senderDomain);
    if (!isLegitDomain && senderDomain) {
      suspiciousScore += 1;
      confidenceFactors.push('unknown domain');
    } else if (isLegitDomain) {
      confidenceFactors.push('trusted domain');
    }
    
    // Check for URL shorteners and suspicious links
    if (text.includes('bit.ly') || text.includes('tinyurl') || text.includes('t.co')) {
      suspiciousScore += 2;
      confidenceFactors.push('URL shorteners detected');
    }
    
    // Check for financial/crypto content with suspicious domain
    const hasFinancialContent = /crypto|bitcoin|wallet|payment|account|bank|verify/i.test(text);
    if (hasFinancialContent && !isLegitDomain) {
      suspiciousScore += 4;
      confidenceFactors.push('financial content from untrusted source');
    }
    
    // Enhanced confidence calculation based on evidence strength
    let classification = 'legitimate';
    let threatLevel = 'low';
    let confidence = 0.65; // Base confidence
    
    // Calculate confidence based on evidence strength
    const evidenceStrength = confidenceFactors.length;
    const maxSuspiciousScore = 15; // Maximum possible suspicious score
    
    if (suspiciousScore >= 8) {
      classification = 'spam';
      threatLevel = 'high';
      // High confidence for clearly suspicious emails
      confidence = Math.min(0.95, 0.75 + (suspiciousScore / maxSuspiciousScore) * 0.2);
    } else if (suspiciousScore >= 4) {
      classification = 'spam';
      threatLevel = 'medium';
      // Medium-high confidence for moderately suspicious emails
      confidence = Math.min(0.85, 0.65 + (suspiciousScore / maxSuspiciousScore) * 0.2);
    } else if (suspiciousScore >= 2) {
      classification = 'legitimate';
      threatLevel = 'medium';
      // Lower confidence when some suspicious elements are present
      confidence = Math.max(0.55, 0.75 - (suspiciousScore / maxSuspiciousScore) * 0.2);
    } else if (isLegitDomain && suspiciousScore === 0) {
      // High confidence for emails from trusted domains with no suspicious elements
      confidence = 0.92;
    } else {
      // Adjust confidence based on available evidence
      confidence = Math.max(0.70, 0.85 - (suspiciousScore / maxSuspiciousScore) * 0.15);
    }
    
    // Additional confidence adjustments
    if (evidenceStrength >= 3) {
      confidence = Math.min(0.95, confidence + 0.05); // More evidence = higher confidence
    }
    
    // Round confidence to 2 decimal places
    confidence = Math.round(confidence * 100) / 100;
    
    return {
      classification,
      threat_level: threatLevel,
      confidence,
      keywords: foundKeywords,
      reasoning: `Rule-based analysis: suspicious score ${suspiciousScore}/${maxSuspiciousScore}. Evidence: ${confidenceFactors.join(', ') || 'minimal indicators'}`
    };
  }

  // AI-enhanced classification with rate limiting and retry logic
  async classifyWithAI(subject: string, sender: string, content: string, retryCount = 0) {
    if (!openAIApiKey) {
      console.log('No OpenAI API key, falling back to rule-based classification');
      return this.classifyWithRules(subject, sender, content);
    }

    const maxRetries = 2;
    const baseDelay = 1000; // 1 second
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-nano-2025-08-07', // Using faster, cheaper model
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert email security analyst. Analyze emails for spam/phishing. Respond only with valid JSON.' 
            },
            { 
              role: 'user', 
              content: `Analyze this email for spam/phishing:

Subject: ${subject}
Sender: ${sender}
Content: ${content.substring(0, 1000)} // Limit content to avoid token limits

Respond with JSON:
{
  "classification": "spam" or "legitimate",
  "threat_level": "high", "medium", or "low", 
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"],
  "reasoning": "brief explanation"
}`
            }
          ],
          max_completion_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        
        // Handle rate limiting with exponential backoff
        if (response.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.classifyWithAI(subject, sender, content, retryCount + 1);
        }
        
        // Fallback to rule-based classification
        console.log('OpenAI failed, using rule-based classification');
        return this.classifyWithRules(subject, sender, content);
      }

      const aiData = await response.json();
      const aiResult = aiData.choices[0].message.content;
      
      try {
        const classification = JSON.parse(aiResult);
        console.log('✅ AI classification successful');
        return classification;
      } catch (parseError) {
        console.error('Failed to parse AI response, using rule-based fallback');
        return this.classifyWithRules(subject, sender, content);
      }

    } catch (error) {
      console.error('AI classification error:', error);
      console.log('Using rule-based classification as fallback');
      return this.classifyWithRules(subject, sender, content);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { emails } = body; // Support batch processing
    
    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Expected "emails" array in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const classifier = new EmailClassifier();
    
    const results = [];
    console.log(`🔍 Processing ${emails.length} emails for classification`);

    // Process emails with rate limiting consideration
    for (let i = 0; i < emails.length; i++) {
      const { subject, sender, content, userId, message_id, ...additionalFields } = emails[i];
      
      console.log(`📧 Processing email ${i + 1}: subject="${subject?.substring(0, 50)}", sender="${sender}", userId="${userId}"`);
      
      if (!subject || !sender || !userId) {
        console.log(`⚠️ Skipping email ${i + 1}: missing required fields - subject: ${!!subject}, sender: ${!!sender}, userId: ${!!userId}`);
        continue;
      }

      console.log(`🔍 Classifying email ${i + 1}/${emails.length}: ${subject}`);

      // Use AI for more emails, with progressive fallback to rule-based
      const useAI = i < 10 || (emails.length <= 5); // Use AI for first 10 emails or if small batch
      
      const classification = useAI 
        ? await classifier.classifyWithAI(subject, sender, content || '')
        : classifier.classifyWithRules(subject, sender, content || '');

      // Store the email analysis in the database
      const { data: emailData, error: emailError } = await supabase
        .from('emails')
        .insert({
          user_id: userId,
          message_id: message_id || `classified_${Date.now()}_${i}`,
          subject,
          sender,
          content: content || '',
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          keywords: classification.keywords || [],
          received_date: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (emailError) {
        console.error('Database error for email:', emailError);
        results.push({
          subject,
          sender,
          error: emailError.message,
          success: false
        });
      } else {
        console.log(`✅ Email classified as ${classification.classification} (${classification.threat_level} threat)`);
        results.push({
          subject,
          sender,
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          success: true
        });
      }

      // Add small delay between requests to avoid overwhelming the system
      if (useAI && i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`🎉 Successfully processed ${successful}/${emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: successful,
        total: emails.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});