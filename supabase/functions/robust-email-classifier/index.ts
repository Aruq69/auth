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

// Enhanced email classifier combining traditional ML with modern approaches
class RobustEmailClassifier {
  private spamKeywords: string[];
  private legitimateIndicators: string[];
  private phishingDomains: string[];

  constructor() {
    this.spamKeywords = [
      // Financial spam - HIGH RISK
      'free', 'winner', 'congratulations', 'prize', 'cash', 'money', '$', 'million', 'inheritance',
      'lottery', 'sweepstakes', 'jackpot', 'investment', 'profit', 'earn', 'income', 'reward',
      'selected', 'chosen', 'exclusive', 'special offer', 'limited offer', 'gift card', 'gift',
      
      // Urgency indicators - HIGH RISK
      'urgent', 'immediate', 'act now', 'limited time', 'expires', 'deadline', 'hurry',
      'quick', 'instant', 'asap', 'rush', 'emergency', '24 hours', 'today only', 'last chance',
      
      // Phishing indicators - HIGH RISK
      'verify', 'confirm', 'update', 'suspended', 'compromised', 'security alert',
      'unusual activity', 'click here', 'login', 'password', 'account', 'click the link',
      'claim now', 'claim your', 'verify account', 'update payment',
      
      // Medical/pharmaceutical spam
      'viagra', 'cialis', 'pharmacy', 'prescription', 'pills', 'medication',
      'weight loss', 'diet', 'supplement',
      
      // Nigerian prince style
      'nigeria', 'prince', 'beneficiary', 'transfer', 'fund', 'diplomat'
    ];
    
    this.legitimateIndicators = [
      // Business terms
      'meeting', 'conference', 'schedule', 'agenda', 'team', 'project', 'report',
      'presentation', 'deadline', 'client', 'customer', 'colleague', 'manager',
      
      // Personal communication
      'thanks', 'please', 'regards', 'sincerely', 'hello', 'hi', 'dear',
      'family', 'friend', 'weekend', 'vacation', 'birthday',
      
      // Professional context
      'company', 'department', 'office', 'work', 'business', 'professional',
      'contract', 'agreement', 'proposal', 'invoice'
    ];
    
    this.phishingDomains = [
      'paypal', 'amazon', 'microsoft', 'apple', 'google', 'facebook', 'twitter',
      'netflix', 'spotify', 'dropbox', 'adobe', 'instagram'
    ];
  }

  // Advanced text preprocessing
  preprocessText(text: string): string {
    if (!text) return '';
    
    // Convert to lowercase
    text = text.toLowerCase();
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Replace URLs with placeholder
    text = text.replace(/https?:\/\/[^\s]+/g, 'URL_PLACEHOLDER');
    
    // Replace email addresses with placeholder
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'EMAIL_PLACEHOLDER');
    
    // Replace phone numbers with placeholder
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, 'PHONE_PLACEHOLDER');
    
    // Remove excessive punctuation
    text = text.replace(/[!]{2,}/g, '!');
    text = text.replace(/[?]{2,}/g, '?');
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  // Calculate TF-IDF like scoring manually
  calculateFeatureScore(text: string): { spamScore: number; features: string[] } {
    const words = text.split(/\s+/);
    const totalWords = words.length;
    let spamScore = 0;
    const features = [];
    
    // Keyword frequency scoring
    for (const keyword of this.spamKeywords) {
      const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
      if (occurrences > 0) {
        const tf = occurrences / totalWords; // Term frequency
        const weight = this.getKeywordWeight(keyword);
        spamScore += tf * weight;
        features.push(`${keyword}(${occurrences})`);
      }
    }
    
    // Legitimate keyword scoring (reduces spam score)
    for (const keyword of this.legitimateIndicators) {
      const occurrences = (text.match(new RegExp(keyword, 'gi')) || []).length;
      if (occurrences > 0) {
        const tf = occurrences / totalWords;
        spamScore -= tf * 0.1; // Reduce spam score for legitimate terms
      }
    }
    
    return { spamScore: Math.max(0, spamScore), features };
  }

  // Assign weights to different types of spam keywords
  getKeywordWeight(keyword: string): number {
    const ultraHighRiskKeywords = [
      'congratulations', 'winner', 'selected', 'chosen', 'free', 'prize', 'reward',
      'click here', 'click the link', 'claim now', 'claim your', 'exclusive', 'special offer'
    ];
    const highRiskKeywords = ['urgent', 'verify', 'limited time', 'expires', 'act now', 'million', '$'];
    const mediumRiskKeywords = ['money', 'cash', 'lottery', 'investment', 'immediate'];
    
    if (ultraHighRiskKeywords.some(k => keyword.includes(k) || k.includes(keyword))) return 1.0;
    if (highRiskKeywords.includes(keyword)) return 0.7;
    if (mediumRiskKeywords.includes(keyword)) return 0.4;
    return 0.2;
  }

  // Analyze email structure and patterns
  analyzeEmailStructure(subject: string, sender: string, content: string): any {
    const analysis = {
      hasExcessiveCaps: false,
      hasExcessivePunctuation: false,
      hasSuspiciousDomain: false,
      hasPhishingDomain: false,
      lengthAnalysis: 'normal',
      urlCount: 0,
      emailCount: 0
    };

    const fullText = `${subject} ${content}`;
    
    // Check for excessive capital letters
    const capsRatio = (fullText.match(/[A-Z]/g) || []).length / fullText.length;
    analysis.hasExcessiveCaps = capsRatio > 0.3;
    
    // Check for excessive punctuation
    const punctRatio = (fullText.match(/[!?]{2,}/g) || []).length;
    analysis.hasExcessivePunctuation = punctRatio > 2;
    
    // Count URLs and emails
    analysis.urlCount = (fullText.match(/https?:\/\/[^\s]+/g) || []).length;
    analysis.emailCount = (fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length;
    
    // Check for suspicious domains
    for (const domain of this.phishingDomains) {
      if (fullText.includes(domain)) {
        analysis.hasPhishingDomain = true;
        break;
      }
    }
    
    // Analyze content length
    if (content.length < 50) analysis.lengthAnalysis = 'too_short';
    else if (content.length > 2000) analysis.lengthAnalysis = 'too_long';
    
    return analysis;
  }

  // Enhanced classification with multiple scoring methods
  classifyEmail(subject: string, sender: string, content: string): any {
    const startTime = performance.now();
    
    // Preprocess text
    const fullText = this.preprocessText(`${subject} ${content}`);
    
    // Calculate feature-based score
    const { spamScore, features } = this.calculateFeatureScore(fullText);
    
    // Analyze email structure
    const structureAnalysis = this.analyzeEmailStructure(subject, sender, content);
    
    // Calculate structure-based penalty
    let structurePenalty = 0;
    if (structureAnalysis.hasExcessiveCaps) structurePenalty += 0.2;
    if (structureAnalysis.hasExcessivePunctuation) structurePenalty += 0.15;
    if (structureAnalysis.hasPhishingDomain) structurePenalty += 0.3;
    if (structureAnalysis.urlCount > 3) structurePenalty += 0.1;
    
    // Final score calculation
    let finalScore = spamScore + structurePenalty;
    
    // Apply sender reputation (simplified)
    if (sender.includes('@gmail.com') || sender.includes('@outlook.com')) {
      finalScore *= 0.9; // Small reduction for common email providers
    }
    
    // Check for specific scam patterns that should trigger immediate high scores
    const scamPatterns = [
      'congratulations.*selected.*free',
      'winner.*prize.*claim',
      'exclusive.*reward.*click',
      'selected.*receive.*gift',
      'urgent.*verify.*account',
      'limited time.*expires.*hurry'
    ];
    
    for (const pattern of scamPatterns) {
      if (new RegExp(pattern, 'i').test(fullText)) {
        finalScore = Math.max(finalScore, 0.8); // Force high score for obvious scams
        console.log('SCAM PATTERN DETECTED:', pattern);
        break;
      }
    }
    
    // Normalize score
    finalScore = Math.min(finalScore, 1.0);
    
    // Classification with REALISTIC thresholds
    let classification = 'legitimate';
    let threat_level = 'safe';
    let threat_type = null;
    let confidence = 0.3;
    
    if (finalScore > 0.5) { // Much lower threshold for spam
      classification = 'spam';
      threat_level = 'high';
      threat_type = 'spam';
      confidence = Math.min(0.95, 0.7 + finalScore * 0.25);
    } else if (finalScore > 0.3) { // Lower threshold for suspicious
      classification = 'suspicious';
      threat_level = 'medium';
      threat_type = 'suspicious';
      confidence = Math.min(0.8, 0.5 + finalScore * 0.3);
    } else if (finalScore > 0.15) { // Lower threshold for questionable
      classification = 'questionable';
      threat_level = 'low';
      threat_type = 'questionable';
      confidence = Math.min(0.6, 0.3 + finalScore * 0.3);
    } else {
      classification = 'legitimate';
      threat_level = 'safe';
      threat_type = null;
      confidence = Math.max(0.4, 0.9 - finalScore);
    }
    
    const processingTime = performance.now() - startTime;
    
    console.log('=== ROBUST ML CLASSIFICATION ===');
    console.log('Spam Score:', spamScore);
    console.log('Structure Penalty:', structurePenalty);
    console.log('Final Score:', finalScore);
    console.log('Classification:', classification);
    console.log('Features detected:', features);
    console.log('Structure analysis:', structureAnalysis);
    console.log('=== END CLASSIFICATION ===');
    
    return {
      classification,
      confidence,
      threat_level,
      threat_type,
      processing_time: processingTime,
      detailed_analysis: {
        spam_probability: finalScore,
        feature_score: spamScore,
        structure_penalty: structurePenalty,
        detected_features: features,
        structure_analysis: structureAnalysis,
        ml_source: 'Robust Traditional ML + Modern Features'
      }
    };
  }
}

// Initialize the classifier
const robustClassifier = new RobustEmailClassifier();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, sender, content, user_id } = await req.json();
    
    console.log('Starting robust ML email classification');
    
    // Use the robust classifier
    const result = robustClassifier.classifyEmail(subject || '', sender || '', content || '');
    
    // Store classification result if user_id provided
    if (user_id) {
      await storeClassificationResult(user_id, subject, sender, content, result);
    }

    // Generate recommendations
    const recommendations = generateRecommendations(result);

    const response = {
      ...result,
      recommendations
    };

    console.log('Robust ML classification completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in robust email classifier:', error);
    
    // Simple fallback
    return new Response(
      JSON.stringify({
        classification: 'legitimate',
        confidence: 0.3,
        threat_level: 'safe',
        threat_type: null,
        processing_time: 10,
        detailed_analysis: {
          ml_source: 'Error Fallback',
          error: error instanceof Error ? error.message : String(error)
        },
        recommendations: ['⚠️ Classification error - exercise normal caution']
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRecommendations(result: any): string[] {
  const recommendations = [];
  
  if (result.threat_level === 'high') {
    recommendations.push('🚨 HIGH RISK: Do not click any links or download attachments');
    recommendations.push('🔒 Verify sender identity through alternative communication');
    recommendations.push('🗑️ Consider moving this email to spam folder');
  } else if (result.threat_level === 'medium') {
    recommendations.push('⚠️ SUSPICIOUS: Proceed with extreme caution');
    recommendations.push('🔍 Verify sender before taking any action');
    recommendations.push('🚫 Avoid clicking links or downloading files');
  } else if (result.threat_level === 'low') {
    recommendations.push('👀 QUESTIONABLE: Exercise normal email caution');
    recommendations.push('✅ Verify any requests before responding');
  } else {
    recommendations.push('✅ Email appears legitimate');
    recommendations.push('📧 Normal email security practices apply');
  }
  
  // Add specific recommendations based on analysis
  if (result.detailed_analysis?.structure_analysis?.hasPhishingDomain) {
    recommendations.push('🏢 Contains known brand names - verify authenticity');
  }
  
  if (result.detailed_analysis?.structure_analysis?.urlCount > 2) {
    recommendations.push('🔗 Multiple links detected - check URLs carefully');
  }
  
  if (result.detailed_analysis?.feature_score > 0.3) {
    recommendations.push('🎯 Contains spam-like keywords - be cautious');
  }
  
  return recommendations;
}

async function storeClassificationResult(
  user_id: string, 
  subject: string, 
  sender: string, 
  content: string, 
  result: any
) {
  try {
    const { error } = await supabase
      .from('emails')
      .insert({
        user_id,
        subject: subject?.substring(0, 255) || 'No Subject',
        sender: sender?.substring(0, 255) || 'Unknown Sender',
        content: content?.substring(0, 1000),
        classification: result.classification,
        confidence: result.confidence,
        threat_level: result.threat_level,
        threat_type: result.threat_type,
        keywords: result.detailed_analysis?.detected_features || [],
        message_id: `ml-classified-${Date.now()}`,
        received_date: new Date().toISOString(),
        processed_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error storing classification:', error);
    }
  } catch (error) {
    console.error('Failed to store classification result:', error);
  }
}