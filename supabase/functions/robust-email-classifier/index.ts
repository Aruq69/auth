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

// Dataset-based ML email classifier using real training data
class RobustEmailClassifier {
  private trainingData: Array<{label: string, text: string}> = [];
  private vocabulary: Map<string, number> = new Map();
  private spamWordCounts: Map<string, number> = new Map();
  private hamWordCounts: Map<string, number> = new Map();
  private totalSpamWords = 0;
  private totalHamWords = 0;
  private spamCount = 0;
  private hamCount = 0;
  private isInitialized = false;

  constructor() {
    // Constructor will trigger dataset loading
  }

  // Load and parse the training dataset
  async loadTrainingData(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('Loading training dataset...');
      
      // Read the email dataset
      const datasetPath = '../_shared/datasets/email.csv';
      const csvContent = await Deno.readTextFile(datasetPath);
      const lines = csvContent.split('\n').slice(1); // Skip header
      
      // Parse CSV data
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const match = line.match(/^(ham|spam),"?(.*?)"?$/);
        if (match) {
          const [, label, text] = match;
          this.trainingData.push({ label, text: text.replace(/"/g, '') });
        }
      }
      
      console.log(`Loaded ${this.trainingData.length} training samples`);
      
      // Train the Naive Bayes model
      this.trainModel();
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Error loading training data:', error);
      // Fallback to basic classification
      this.isInitialized = true;
    }
  }

  // Train Naive Bayes classifier on the dataset
  trainModel(): void {
    console.log('Training Naive Bayes classifier...');
    
    // Count spam and ham emails
    this.spamCount = this.trainingData.filter(item => item.label === 'spam').length;
    this.hamCount = this.trainingData.filter(item => item.label === 'ham').length;
    
    // Build vocabulary and word counts
    for (const item of this.trainingData) {
      const words = this.tokenize(item.text);
      
      for (const word of words) {
        // Add to vocabulary
        this.vocabulary.set(word, (this.vocabulary.get(word) || 0) + 1);
        
        if (item.label === 'spam') {
          this.spamWordCounts.set(word, (this.spamWordCounts.get(word) || 0) + 1);
          this.totalSpamWords++;
        } else {
          this.hamWordCounts.set(word, (this.hamWordCounts.get(word) || 0) + 1);
          this.totalHamWords++;
        }
      }
    }
    
    console.log(`Model trained: ${this.spamCount} spam, ${this.hamCount} ham, ${this.vocabulary.size} unique words`);
  }

  // Tokenize text into words
  tokenize(text: string): string[] {
    if (!text) return [];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && word.length < 20)
      .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
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

  // Calculate Naive Bayes probability scores
  calculateNaiveBayesScore(text: string): { spamScore: number; features: string[] } {
    const words = this.tokenize(text);
    const features = [];
    
    if (!this.isInitialized || this.vocabulary.size === 0) {
      // Fallback to simple keyword detection
      return this.calculateFallbackScore(text);
    }
    
    // Calculate log probabilities to avoid underflow
    let logSpamProb = Math.log(this.spamCount / (this.spamCount + this.hamCount));
    let logHamProb = Math.log(this.hamCount / (this.spamCount + this.hamCount));
    
    const vocabularySize = this.vocabulary.size;
    
    for (const word of words) {
      // Laplace smoothing
      const spamWordCount = this.spamWordCounts.get(word) || 0;
      const hamWordCount = this.hamWordCounts.get(word) || 0;
      
      const spamWordProb = (spamWordCount + 1) / (this.totalSpamWords + vocabularySize);
      const hamWordProb = (hamWordCount + 1) / (this.totalHamWords + vocabularySize);
      
      logSpamProb += Math.log(spamWordProb);
      logHamProb += Math.log(hamWordProb);
      
      // Track significant features
      if (spamWordCount > 0 && spamWordProb > hamWordProb * 2) {
        features.push(`${word}(${spamWordCount})`);
      }
    }
    
    // Convert back from log space and normalize
    const spamProb = Math.exp(logSpamProb);
    const hamProb = Math.exp(logHamProb);
    const totalProb = spamProb + hamProb;
    
    const spamScore = totalProb > 0 ? spamProb / totalProb : 0;
    
    return { spamScore, features };
  }

  // Fallback scoring when dataset isn't available
  calculateFallbackScore(text: string): { spamScore: number; features: string[] } {
    const spamKeywords = [
      'free', 'winner', 'congratulations', 'prize', 'cash', 'money', 'urgent', 'click here',
      'verify', 'selected', 'exclusive', 'limited time', 'act now', 'claim now'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    let spamScore = 0;
    const features = [];
    
    for (const keyword of spamKeywords) {
      const occurrences = (text.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (occurrences > 0) {
        spamScore += (occurrences / totalWords) * 0.3;
        features.push(`${keyword}(${occurrences})`);
      }
    }
    
    return { spamScore: Math.min(spamScore, 1.0), features };
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
    
    // Check for common phishing domains (simplified check)
    const phishingDomains = ['paypal', 'amazon', 'microsoft', 'apple', 'google', 'facebook'];
    for (const domain of phishingDomains) {
      if (fullText.toLowerCase().includes(domain)) {
        analysis.hasPhishingDomain = true;
        break;
      }
    }
    
    // Analyze content length
    if (content.length < 50) analysis.lengthAnalysis = 'too_short';
    else if (content.length > 2000) analysis.lengthAnalysis = 'too_long';
    
    return analysis;
  }

  // Enhanced classification with dataset-based ML
  async classifyEmail(subject: string, sender: string, content: string): Promise<any> {
    const startTime = performance.now();
    
    // Ensure model is loaded
    await this.loadTrainingData();
    
    // Preprocess text
    const fullText = this.preprocessText(`${subject} ${content}`);
    
    // Calculate ML-based score using Naive Bayes
    const { spamScore, features } = this.calculateNaiveBayesScore(fullText);
    
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
    
    console.log('Starting dataset-based ML email classification');
    
    // Use the robust classifier with dataset training
    const result = await robustClassifier.classifyEmail(subject || '', sender || '', content || '');
    
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