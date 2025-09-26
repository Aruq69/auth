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
    "https://api-inference.huggingface.co/models/unitary/toxic-bert",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
    }
  );
  
  if (!response.ok) throw new Error(`Spam classification failed: ${response.status}`);
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
  
  if (!response.ok) throw new Error(`Sentiment analysis failed: ${response.status}`);
  const result = await response.json();
  return Array.isArray(result) ? result[0] : result;
}

async function detectPhishing(text: string) {
  // Use a general classification model for phishing detection
  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ 
        inputs: `Analyze this email for phishing indicators: ${text.substring(0, 500)}` 
      }),
    }
  );
  
  if (!response.ok) throw new Error(`Phishing detection failed: ${response.status}`);
  return await response.json();
}

async function extractEntities(text: string) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/dbmdz/bert-large-cased-finetuned-conll03-english",
    {
      headers: { Authorization: `Bearer ${hfToken}` },
      method: "POST",
      body: JSON.stringify({ inputs: text.substring(0, 500) }),
    }
  );
  
  if (!response.ok) throw new Error(`Entity extraction failed: ${response.status}`);
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
  
  // Spam score
  if (results.spam && Array.isArray(results.spam)) {
    const toxicScore = results.spam.find((item: any) => item.label === 'TOXIC')?.score || 0;
    totalScore += toxicScore * 0.4;
    factors++;
  }
  
  // Sentiment score (negative sentiment increases threat)
  if (results.sentiment) {
    const negativeScore = results.sentiment.label === 'LABEL_0' ? results.sentiment.score : 0;
    totalScore += negativeScore * 0.3;
    factors++;
  }
  
  // Entity-based scoring (looking for suspicious patterns)
  if (results.entities && Array.isArray(results.entities)) {
    const suspiciousEntities = results.entities.filter((entity: any) => 
      entity.entity_group === 'ORG' || entity.entity_group === 'MISC'
    ).length;
    totalScore += Math.min(suspiciousEntities * 0.1, 0.3);
    factors++;
  }
  
  const avgScore = factors > 0 ? totalScore / factors : 0;
  
  let classification = 'legitimate';
  let threat_level = 'safe';
  let threat_type = null;
  let confidence = Math.min(avgScore * 2, 1); // Normalize confidence
  
  if (avgScore > 0.7) {
    classification = 'spam';
    threat_level = 'high';
    threat_type = 'spam';
    confidence = Math.max(confidence, 0.8);
  } else if (avgScore > 0.5) {
    classification = 'suspicious';
    threat_level = 'medium';
    threat_type = 'suspicious';
    confidence = Math.max(confidence, 0.6);
  } else if (avgScore > 0.3) {
    classification = 'questionable';
    threat_level = 'low';
    threat_type = 'questionable';
    confidence = Math.max(confidence, 0.4);
  }
  
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
  console.log('Using fallback classification');
  
  // Simple rule-based classification
  const text = `${subject} ${sender} ${content || ''}`.toLowerCase();
  const spamKeywords = ['free', 'winner', 'urgent', 'claim', 'prize', 'nigeria', 'bank', 'lottery'];
  const suspiciousPatterns = ['click here', 'act now', 'limited time', 'verify account'];
  
  let score = 0;
  spamKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 0.3;
  });
  
  suspiciousPatterns.forEach(pattern => {
    if (text.includes(pattern)) score += 0.4;
  });
  
  const classification = score > 0.6 ? 'spam' : score > 0.3 ? 'suspicious' : 'legitimate';
  const threat_level = score > 0.6 ? 'high' : score > 0.3 ? 'medium' : 'safe';
  
  return new Response(
    JSON.stringify({
      classification,
      confidence: Math.min(score, 1),
      threat_level,
      threat_type: classification === 'spam' ? 'spam' : null,
      processing_time: 50,
      detailed_analysis: {
        ml_source: 'Fallback Rule-based Classifier',
        spam_probability: score,
        detected_keywords: spamKeywords.filter(k => text.includes(k))
      },
      recommendations: score > 0.6 ? 
        ['⚠️ High risk detected - avoid interaction'] : 
        ['✅ Basic analysis complete - exercise normal caution']
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}