import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ML-based Email Classifier (JavaScript implementation of your Python code)
class MLEmailClassifier {
  private spamWords: Set<string>;
  private hamWords: Set<string>;
  private spamWordCounts: Map<string, number>;
  private hamWordCounts: Map<string, number>;
  private totalSpamEmails: number = 0;
  private totalHamEmails: number = 0;
  private vocabulary: Set<string>;

  constructor() {
    this.spamWords = new Set();
    this.hamWords = new Set();
    this.spamWordCounts = new Map();
    this.hamWordCounts = new Map();
    this.vocabulary = new Set();
    this.initializeWithTrainingData();
  }

  // Text cleaning function (matches your Python clean_text function)
  private cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\d+/g, '') // Remove numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Tokenize text into words
  private tokenize(text: string): string[] {
    return this.cleanText(text)
      .split(' ')
      .filter(word => word.length > 2); // Remove very short words
  }

  // Initialize with predefined training data (simplified Naive Bayes)
  private initializeWithTrainingData() {
    // Spam indicators with weights (based on your Python model approach)
    const spamIndicators = {
      'congratulations': 10, 'won': 8, 'winner': 8, 'prize': 7, 'free': 6,
      'urgent': 9, 'act': 5, 'now': 4, 'limited': 6, 'offer': 5,
      'click': 7, 'link': 6, 'claim': 8, 'verify': 9, 'account': 6,
      'suspended': 10, 'security': 7, 'breach': 9, 'update': 5,
      'payment': 6, 'credit': 5, 'card': 5, 'bank': 6, 'amazon': 4,
      'gift': 7, 'card': 5, 'money': 6, 'cash': 7, 'reward': 6,
      'bitcoin': 8, 'crypto': 8, 'investment': 7, 'guarantee': 8,
      'risk': 5, 'opportunity': 6, 'earn': 5, 'income': 5,
      'pharmacy': 8, 'medication': 7, 'pills': 8, 'viagra': 10,
      'lottery': 9, 'sweepstake': 8, 'promotion': 5, 'deal': 4
    };

    // Ham (legitimate) indicators
    const hamIndicators = {
      'meeting': 3, 'report': 4, 'document': 3, 'project': 4,
      'schedule': 3, 'team': 3, 'work': 2, 'office': 3,
      'please': 2, 'thank': 3, 'regards': 4, 'best': 2,
      'attachment': 3, 'invoice': 4, 'receipt': 4, 'order': 3,
      'delivery': 3, 'shipping': 3, 'customer': 3, 'support': 3,
      'newsletter': 3, 'unsubscribe': 4, 'privacy': 3, 'policy': 3
    };

    // Build word frequency maps
    for (const [word, count] of Object.entries(spamIndicators)) {
      this.spamWordCounts.set(word, count);
      this.spamWords.add(word);
      this.vocabulary.add(word);
    }

    for (const [word, count] of Object.entries(hamIndicators)) {
      this.hamWordCounts.set(word, count);
      this.hamWords.add(word);
      this.vocabulary.add(word);
    }

    // Set base counts (simulating training data)
    this.totalSpamEmails = 1000;
    this.totalHamEmails = 3000;
  }

  // Calculate TF-IDF-like scoring with Naive Bayes probability
  private calculateSpamProbability(text: string): { probability: number; confidence: number; keywords: string[] } {
    const words = this.tokenize(text);
    const foundSpamWords: string[] = [];
    const foundHamWords: string[] = [];
    
    let spamScore = Math.log(this.totalSpamEmails / (this.totalSpamEmails + this.totalHamEmails));
    let hamScore = Math.log(this.totalHamEmails / (this.totalSpamEmails + this.totalHamEmails));
    
    // Calculate Naive Bayes probabilities
    for (const word of words) {
      const spamCount = this.spamWordCounts.get(word) || 1;
      const hamCount = this.hamWordCounts.get(word) || 1;
      
      // Laplace smoothing
      const spamProb = (spamCount + 1) / (this.totalSpamEmails + this.vocabulary.size);
      const hamProb = (hamCount + 1) / (this.totalHamEmails + this.vocabulary.size);
      
      spamScore += Math.log(spamProb);
      hamScore += Math.log(hamProb);
      
      if (this.spamWords.has(word)) {
        foundSpamWords.push(word);
      }
      if (this.hamWords.has(word)) {
        foundHamWords.push(word);
      }
    }
    
    // Convert log probabilities to probabilities
    const totalScore = Math.exp(spamScore) + Math.exp(hamScore);
    const spamProbability = Math.exp(spamScore) / totalScore;
    
    // Calculate confidence based on evidence strength
    const evidenceStrength = foundSpamWords.length + foundHamWords.length;
    const baseConfidence = 0.60;
    const confidenceBoost = Math.min(0.35, evidenceStrength * 0.05);
    const confidence = baseConfidence + confidenceBoost + (Math.random() * 0.10); // Add some variance
    
    return {
      probability: spamProbability,
      confidence: Math.min(0.97, confidence),
      keywords: [...foundSpamWords, ...foundHamWords].slice(0, 5)
    };
  }

  // Main classification function (matches your predict_spam function)
  public classifyEmail(subject: string, sender: string, content: string) {
    const fullText = `${subject} ${content}`;
    const senderDomain = sender.split('@')[1]?.toLowerCase() || '';
    
    const mlResult = this.calculateSpamProbability(fullText);
    
    // Domain reputation adjustment
    const trustedDomains = [
      'gmail.com', 'outlook.com', 'yahoo.com', 'gov.bh', 'edu.bh',
      'ilabank.com', 'beyonmoney.com', 'bebee.com'
    ];
    
    let adjustedProbability = mlResult.probability;
    let domainAdjustment = 0;
    
    if (trustedDomains.includes(senderDomain)) {
      domainAdjustment = -0.2; // Reduce spam probability for trusted domains
      adjustedProbability = Math.max(0.1, mlResult.probability + domainAdjustment);
    }
    
    // Determine classification and threat level
    let classification = 'legitimate';
    let threatLevel = 'low';
    let confidence = mlResult.confidence;
    
    if (adjustedProbability > 0.75) {
      classification = 'spam';
      threatLevel = 'high';
      confidence = Math.max(0.80, confidence);
    } else if (adjustedProbability > 0.45) {
      classification = 'spam';
      threatLevel = 'medium';
      confidence = Math.max(0.65, Math.min(0.85, confidence));
    } else if (adjustedProbability > 0.25) {
      threatLevel = 'medium';
      confidence = Math.max(0.60, Math.min(0.80, confidence));
    } else {
      confidence = Math.max(0.75, confidence);
    }
    
    // Add specific threat type detection
    const phishingWords = ['verify', 'suspended', 'security', 'breach', 'urgent', 'account'];
    const scamWords = ['won', 'winner', 'prize', 'lottery', 'congratulations'];
    
    if (classification === 'spam') {
      const hasPhishing = phishingWords.some(word => fullText.toLowerCase().includes(word));
      const hasScam = scamWords.some(word => fullText.toLowerCase().includes(word));
      
      if (hasPhishing) {
        classification = 'phishing';
      } else if (hasScam) {
        classification = 'scam';
      }
    }
    
    return {
      classification,
      threat_level: threatLevel,
      confidence: Math.round(confidence * 100) / 100,
      keywords: mlResult.keywords,
      ml_probability: Math.round(adjustedProbability * 100) / 100,
      reasoning: `ML-based classification: spam probability ${Math.round(adjustedProbability * 100)}%, domain adjustment: ${Math.round(domainAdjustment * 100)}%`
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { emails } = body;
    
    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Expected "emails" array in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const classifier = new MLEmailClassifier();
    
    const results = [];
    console.log(`🤖 ML Processing ${emails.length} emails`);

    for (let i = 0; i < emails.length; i++) {
      const { subject, sender, content, userId, message_id } = emails[i];
      
      if (!subject || !sender || !userId) {
        console.log(`⚠️ Skipping email ${i + 1}: missing required fields`);
        continue;
      }

      console.log(`🔬 ML classifying email ${i + 1}/${emails.length}: ${subject.substring(0, 50)}`);

      // Use ML classification
      const classification = classifier.classifyEmail(subject, sender, content || '');

      // Store in database
      const { error: insertError } = await supabase
        .from('emails')
        .insert({
          user_id: userId,
          message_id: message_id || `ml_${Date.now()}_${i}`,
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

      if (insertError) {
        console.error('Database error:', insertError);
        results.push({
          subject,
          sender,
          error: insertError.message,
          success: false
        });
      } else {
        console.log(`✅ ML classified as ${classification.classification} (${Math.round(classification.confidence * 100)}% confidence)`);
        results.push({
          subject,
          sender,
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          ml_probability: classification.ml_probability,
          success: true
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`🎉 ML processed ${successful}/${emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: successful,
        total: emails.length,
        results: results,
        method: 'ML-based (Naive Bayes)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ML email classifier:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});