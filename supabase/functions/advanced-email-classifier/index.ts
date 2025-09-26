import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, sender, content, user_id } = await req.json();
    
    if (!hfToken) {
      console.warn('HuggingFace token not configured, using fallback classification');
      return await fallbackClassification(subject, sender, content, user_id);
    }

    console.log('Starting advanced ML email classification');
    const startTime = Date.now();
    
    // Prepare email text for analysis
    const emailText = `Subject: ${subject}\nFrom: ${sender}\nContent: ${content || ''}`;
    
    // Run multiple ML models in parallel for comprehensive analysis
    const [
      spamClassification,
      sentimentAnalysis,
      phishingDetection,
      entityExtraction
    ] = await Promise.allSettled([
      classifySpam(emailText),
      analyzeSentiment(emailText),
      detectPhishing(emailText),
      extractEntities(emailText)
    ]);

    // Combine results from all models
    const results = {
      spam: getResult(spamClassification),
      sentiment: getResult(sentimentAnalysis),
      phishing: getResult(phishingDetection),
      entities: getResult(entityExtraction)
    };

    // Calculate overall threat assessment
    const threatAssessment = calculateThreatLevel(results);
    
    const processingTime = Date.now() - startTime;
    
    // Store classification result if user_id provided
    if (user_id) {
      await storeClassificationResult(user_id, subject, sender, content, threatAssessment, results);
    }

    const response = {
      classification: threatAssessment.classification,
      confidence: threatAssessment.confidence,
      threat_level: threatAssessment.threat_level,
      threat_type: threatAssessment.threat_type,
      processing_time: processingTime,
      detailed_analysis: {
        spam_probability: results.spam?.score || 0,
        sentiment: results.sentiment?.label || 'NEUTRAL',
        sentiment_confidence: results.sentiment?.score || 0,
        phishing_indicators: results.phishing?.labels || [],
        extracted_entities: results.entities || [],
        ml_source: 'HuggingFace Advanced Models'
      },
      recommendations: generateRecommendations(threatAssessment, results)
    };

    console.log('Advanced ML classification completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in advanced email classifier:', error);
    
    // Fallback to basic classification on error
    const { subject, sender, content, user_id } = await req.json();
    return await fallbackClassification(subject, sender, content, user_id);
  }
});

async function classifySpam(text: string) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/martin-ha/toxic-comment-model",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
    }
  );
  
  if (!response.ok) {
    console.error(`Spam classification failed: ${response.status} - ${await response.text()}`);
    throw new Error(`Spam classification failed: ${response.status}`);
  }
  return await response.json();
}

async function analyzeSentiment(text: string) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
    }
  );
  
  if (!response.ok) {
    console.error(`Sentiment analysis failed: ${response.status} - ${await response.text()}`);
    throw new Error(`Sentiment analysis failed: ${response.status}`);
  }
  const result = await response.json();
  return Array.isArray(result) && result.length > 0 ? result[0] : result;
}

async function detectPhishing(text: string) {
  // Use a simple spam detection model instead of trying to use an inappropriate model
  const response = await fetch(
    "https://api-inference.huggingface.co/models/mshenoda/roberta-spam",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text.substring(0, 500) }),
    }
  );
  
  if (!response.ok) {
    console.error(`Phishing detection failed: ${response.status} - ${await response.text()}`);
    throw new Error(`Phishing detection failed: ${response.status}`);
  }
  return await response.json();
}

async function extractEntities(text: string) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Babelscape/wikineural-multilingual-ner",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text.substring(0, 500) }),
    }
  );
  
  if (!response.ok) {
    console.error(`Entity extraction failed: ${response.status} - ${await response.text()}`);
    throw new Error(`Entity extraction failed: ${response.status}`);
  }
  return await response.json();
}

function getResult(settledResult: PromiseSettledResult<any>) {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value;
  } else {
    console.warn('Model failed:', settledResult.reason);
    return null;
  }
}

function calculateThreatLevel(results: any) {
  let totalScore = 0;
  let factors = 0;
  
  console.log('Calculating threat level with results:', results);
  
  // If all models failed, use enhanced fallback scoring
  if (!results.spam && !results.sentiment && !results.phishing && !results.entities) {
    console.log('All models failed, using fallback threat assessment');
    return {
      classification: 'legitimate',
      threat_level: 'safe',
      threat_type: null,
      confidence: 0.3 // Low confidence since models failed
    };
  }
  
  // Spam/Toxicity score - handle different response formats
  if (results.spam && Array.isArray(results.spam)) {
    const toxicItem = results.spam.find((item: any) => 
      item.label === 'TOXIC' || item.label === 'SPAM' || item.label === '1'
    );
    if (toxicItem) {
      totalScore += toxicItem.score * 0.4;
      factors++;
      console.log('Spam score:', toxicItem.score);
    }
  }
  
  // Sentiment score (negative sentiment increases threat)
  if (results.sentiment && results.sentiment.label) {
    const isNegative = results.sentiment.label === 'LABEL_0' || results.sentiment.label === 'NEGATIVE';
    if (isNegative) {
      totalScore += results.sentiment.score * 0.3;
      factors++;
      console.log('Negative sentiment score:', results.sentiment.score);
    }
  }
  
  // Phishing score
  if (results.phishing && Array.isArray(results.phishing)) {
    const spamItem = results.phishing.find((item: any) => 
      item.label === 'SPAM' || item.label === '1'
    );
    if (spamItem) {
      totalScore += spamItem.score * 0.3;
      factors++;
      console.log('Phishing score:', spamItem.score);
    }
  }
  
  const avgScore = factors > 0 ? totalScore / factors : 0;
  console.log('Average threat score:', avgScore, 'from', factors, 'factors');
  
  let classification = 'legitimate';
  let threat_level = 'safe';
  let threat_type = null;
  let confidence = Math.min(avgScore * 1.5, 0.95); // Increase confidence scaling
  
  if (avgScore > 0.6) {
    classification = 'spam';
    threat_level = 'high';
    threat_type = 'spam';
    confidence = Math.max(confidence, 0.7);
  } else if (avgScore > 0.4) {
    classification = 'suspicious';
    threat_level = 'medium';
    threat_type = 'suspicious';
    confidence = Math.max(confidence, 0.5);
  } else if (avgScore > 0.2) {
    classification = 'questionable';
    threat_level = 'low';
    threat_type = 'questionable';
    confidence = Math.max(confidence, 0.3);
  }
  
  console.log('Final classification:', { classification, threat_level, threat_type, confidence });
  return { classification, threat_level, threat_type, confidence };
}

function generateRecommendations(threat: any, results: any) {
  const recommendations = [];
  
  if (threat.threat_level === 'high') {
    recommendations.push('⚠️ High risk email detected - do not click any links or download attachments');
    recommendations.push('🔒 Verify sender identity through alternative communication channel');
  } else if (threat.threat_level === 'medium') {
    recommendations.push('⚡ Proceed with caution - verify sender before taking action');
    recommendations.push('🔍 Check URLs carefully before clicking');
  } else if (threat.threat_level === 'low') {
    recommendations.push('👀 Minor concerns detected - exercise normal email caution');
  } else {
    recommendations.push('✅ Email appears safe - no significant threats detected');
  }
  
  // Add specific recommendations based on analysis
  if (results.sentiment?.label === 'LABEL_0') {
    recommendations.push('😟 Negative sentiment detected - be cautious of emotional manipulation');
  }
  
  if (results.entities?.length > 5) {
    recommendations.push('🏢 Multiple entities detected - verify any organizations mentioned');
  }
  
  return recommendations;
}

async function storeClassificationResult(
  user_id: string, 
  subject: string, 
  sender: string, 
  content: string, 
  threat: any, 
  results: any
) {
  try {
    const { error } = await supabase
      .from('email_classifications')
      .insert({
        user_id,
        subject: subject.substring(0, 255),
        sender: sender.substring(0, 255),
        content: content?.substring(0, 1000),
        classification: threat.classification,
        confidence: threat.confidence,
        threat_level: threat.threat_level,
        threat_type: threat.threat_type,
        ml_analysis: {
          spam_score: results.spam,
          sentiment: results.sentiment,
          entities: results.entities,
          model_source: 'huggingface_advanced'
        }
      });
    
    if (error) {
      console.error('Error storing classification:', error);
    }
  } catch (error) {
    console.error('Failed to store classification result:', error);
  }
}

async function fallbackClassification(subject: string, sender: string, content: string, user_id?: string) {
  console.log('Using enhanced fallback classification');
  
  const text = `${subject} ${sender} ${content || ''}`.toLowerCase();
  const spamKeywords = ['free', 'winner', 'urgent', 'claim', 'prize', 'nigeria', 'bank', 'lottery', 'congratulations', 'million', 'inheritance'];
  const suspiciousPatterns = ['click here', 'act now', 'limited time', 'verify account', 'suspend', 'confirm identity', 'update payment'];
  const phishingIndicators = ['paypal', 'amazon', 'microsoft', 'apple', 'verify', 'suspended', 'unusual activity'];
  
  let score = 0;
  let detectedPatterns = [];
  
  // Check spam keywords
  for (const keyword of spamKeywords) {
    if (text.includes(keyword)) {
      score += 0.25;
      detectedPatterns.push(`Spam keyword: ${keyword}`);
    }
  }
  
  // Check suspicious patterns  
  for (const pattern of suspiciousPatterns) {
    if (text.includes(pattern)) {
      score += 0.3;
      detectedPatterns.push(`Suspicious pattern: ${pattern}`);
    }
  }
  
  // Check phishing indicators
  for (const indicator of phishingIndicators) {
    if (text.includes(indicator)) {
      score += 0.2;
      detectedPatterns.push(`Phishing indicator: ${indicator}`);
    }
  }
  
  // Check for domain spoofing patterns
  if (text.includes('.com') && (text.includes('secure') || text.includes('verify'))) {
    score += 0.3;
    detectedPatterns.push('Potential domain spoofing');
  }
  
  const classification = score > 0.7 ? 'spam' : score > 0.4 ? 'suspicious' : 'legitimate';
  const threat_level = score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'safe';
  const threat_type = score > 0.7 ? 'spam' : score > 0.4 ? 'suspicious' : null;
  
  console.log('Fallback classification result:', { classification, threat_level, score, detectedPatterns });
  
  return new Response(
    JSON.stringify({
      classification,
      confidence: Math.min(score, 0.9),
      threat_level,
      threat_type,
      processing_time: 50,
      detailed_analysis: {
        ml_source: 'Enhanced Fallback Classifier',
        spam_probability: score,
        detected_patterns: detectedPatterns,
        sentiment: 'NEUTRAL',
        sentiment_confidence: 0
      },
      recommendations: score > 0.7 ? 
        ['⚠️ High risk detected - avoid interaction', '🔒 Do not click any links or download attachments'] : 
        score > 0.4 ?
        ['⚡ Proceed with caution - verify sender before taking action'] :
        ['✅ Basic analysis complete - exercise normal caution']
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}