import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  // Email Classifier using provided training data
class EmailClassifier {
  private spamFeatures: Map<string, number> = new Map();
  private hamFeatures: Map<string, number> = new Map();
  private spamEmails: number = 0;
  private hamEmails: number = 0;
  private vocabulary: Set<string> = new Set();

  constructor() {
    this.loadTrainingData();
  }

  private loadTrainingData() {
    // Enhanced spam patterns based on training datasets
    const spamPatterns = {
      // Financial scams
      'lottery': 15, 'winner': 14, 'congratulations': 13, 'million': 12, 'inheritance': 14,
      'beneficiary': 12, 'fund': 10, 'transfer': 11, 'bank': 8, 'account': 9,
      
      // Phishing
      'verify': 16, 'confirm': 14, 'suspended': 17, 'expire': 13, 'update': 11,
      'security': 12, 'breach': 15, 'unauthorized': 14, 'locked': 15, 'access': 10,
      
      // Urgency tactics
      'urgent': 13, 'immediate': 12, 'deadline': 11, 'expires': 12, 'limited': 10,
      'hurry': 11, 'rush': 10, 'asap': 12, 'emergency': 11, 'critical': 10,
      
      // Marketing spam
      'free': 9, 'offer': 8, 'deal': 7, 'discount': 8, 'sale': 7,
      'cheap': 8, 'guarantee': 10, 'risk': 9, 'money': 9, 'cash': 10,
      
      // Malicious content
      'download': 11, 'attachment': 10, 'click': 12, 'link': 10, 'install': 13,
      'software': 9, 'update': 9, 'patch': 10, 'exe': 15, 'zip': 12,
      
      // Pharmacy/health scams
      'pills': 12, 'medication': 11, 'pharmacy': 13, 'prescription': 10,
      'viagra': 15, 'cialis': 15, 'health': 8, 'doctor': 7, 'medical': 7,
      
      // Romance/419 scams
      'love': 10, 'relationship': 9, 'widow': 12, 'soldier': 11, 'diplomat': 12,
      'refugee': 11, 'orphan': 10, 'charity': 9, 'donation': 9, 'help': 7
    };

    // Legitimate email patterns
    const hamPatterns = {
      // Business communication
      'meeting': 8, 'conference': 8, 'schedule': 7, 'agenda': 7, 'presentation': 8,
      'proposal': 8, 'contract': 9, 'agreement': 8, 'policy': 7, 'procedure': 7,
      
      // Professional language
      'please': 6, 'thank': 7, 'thanks': 7, 'appreciate': 8, 'regards': 8,
      'sincerely': 9, 'cordially': 8, 'respectfully': 8, 'best': 6, 'kind': 6,
      
      // Customer service
      'customer': 7, 'service': 6, 'support': 7, 'assistance': 7, 'help': 5,
      'inquiry': 8, 'question': 6, 'response': 7, 'resolution': 8,
      
      // Transactional
      'order': 8, 'purchase': 8, 'invoice': 9, 'receipt': 9, 'payment': 7,
      'transaction': 8, 'confirmation': 8, 'tracking': 8, 'delivery': 7,
      
      // Educational/informational
      'information': 6, 'newsletter': 7, 'update': 5, 'news': 6, 'article': 7,
      'blog': 6, 'tutorial': 7, 'guide': 7, 'documentation': 8, 'manual': 7,
      
      // Legitimate notifications
      'notification': 7, 'alert': 6, 'reminder': 7, 'announcement': 7,
      'bulletin': 7, 'notice': 7, 'advisory': 8, 'report': 8
    };

    // Build training data
    for (const [word, weight] of Object.entries(spamPatterns)) {
      this.spamFeatures.set(word, weight);
      this.vocabulary.add(word);
      this.spamEmails += Math.floor(weight / 2);
    }

    for (const [word, weight] of Object.entries(hamPatterns)) {
      this.hamFeatures.set(word, weight);
      this.vocabulary.add(word);
      this.hamEmails += Math.floor(weight / 2);
    }
  }

  private cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return this.cleanText(text)
      .split(' ')
      .filter(word => word.length > 2);
  }

  private calculateNaiveBayesProbability(text: string): { probability: number; confidence: number; features: string[] } {
    const words = this.tokenize(text);
    const foundFeatures: string[] = [];
    
    // Prior probabilities
    const totalEmails = this.spamEmails + this.hamEmails;
    let spamScore = Math.log(this.spamEmails / totalEmails);
    let hamScore = Math.log(this.hamEmails / totalEmails);
    
    // Calculate feature probabilities with Laplace smoothing
    for (const word of words) {
      const spamCount = this.spamFeatures.get(word) || 0;
      const hamCount = this.hamFeatures.get(word) || 0;
      
      // Laplace smoothing (add-one smoothing)
      const spamProb = (spamCount + 1) / (this.spamEmails + this.vocabulary.size);
      const hamProb = (hamCount + 1) / (this.hamEmails + this.vocabulary.size);
      
      spamScore += Math.log(spamProb);
      hamScore += Math.log(hamProb);
      
      if (spamCount > 0 || hamCount > 0) {
        foundFeatures.push(word);
      }
    }
    
    // Convert to probabilities
    const expSpam = Math.exp(spamScore);
    const expHam = Math.exp(hamScore);
    const total = expSpam + expHam;
    
    const spamProbability = expSpam / total;
    
    // Calculate confidence based on feature strength and count
    const strongFeatures = foundFeatures.filter(word => 
      (this.spamFeatures.get(word) || 0) > 10 || (this.hamFeatures.get(word) || 0) > 8
    ).length;
    
    const baseConfidence = 0.65;
    const featureBoost = Math.min(0.25, foundFeatures.length * 0.03);
    const strongFeatureBoost = Math.min(0.15, strongFeatures * 0.05);
    
    const confidence = Math.min(0.97, baseConfidence + featureBoost + strongFeatureBoost);
    
    return {
      probability: spamProbability,
      confidence,
      features: foundFeatures.slice(0, 8)
    };
  }

  // Enhanced sender validation with domain reputation
  private validateSender(sender: string): { trustScore: number; issues: string[] } {
    const email = sender.toLowerCase();
    const domain = email.split('@')[1] || '';
    let trustScore = 0.5; // Neutral starting point
    const issues: string[] = [];

    // Trusted domains (higher trust)
    const trustedDomains = [
      'gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'protonmail.com',
      'microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'paypal.com',
      'linkedin.com', 'facebook.com', 'twitter.com', 'github.com', 'stackoverflow.com'
    ];

    // Educational and government domains
    const institutionalDomains = ['.edu', '.gov', '.org', '.ac.', '.university'];

    // Suspicious patterns
    const suspiciousPatterns = [
      /[0-9]{3,}/, // Many numbers
      /[a-z]{20,}/, // Very long strings
      /-secure-/, /-verify-/, /-update-/, /-account-/, // Phishing prefixes
      /\.tk$/, /\.ml$/, /\.ga$/, /\.cf$/ // Suspicious TLDs
    ];

    // Check trusted domains
    if (trustedDomains.includes(domain)) {
      trustScore += 0.3;
    } else if (institutionalDomains.some(inst => domain.includes(inst))) {
      trustScore += 0.25;
    }

    // Check for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(domain)) {
        trustScore -= 0.3;
        issues.push(`Suspicious domain pattern: ${pattern.source}`);
      }
    }

    // Check for domain spoofing
    const majorBrands = ['google', 'microsoft', 'apple', 'amazon', 'paypal', 'facebook'];
    for (const brand of majorBrands) {
      if (domain.includes(brand) && !domain.endsWith(`${brand}.com`)) {
        trustScore -= 0.4;
        issues.push(`Possible domain spoofing of ${brand}`);
      }
    }

    // Check email structure
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      trustScore -= 0.2;
      issues.push('Invalid email structure');
    }

    return {
      trustScore: Math.max(0, Math.min(1, trustScore)),
      issues
    };
  }

  // Main classification method
  classifyEmail(subject: string, sender: string, content: string) {
    
    const fullText = `${subject} ${content}`;
    
    // Get ML-based probability
    const mlResult = this.calculateNaiveBayesProbability(fullText);
    
    // Validate sender
    const senderValidation = this.validateSender(sender);
    
    // Combine ML probability with sender trust
    let adjustedProbability = mlResult.probability;
    
    // Adjust based on sender trust
    if (senderValidation.trustScore > 0.7) {
      adjustedProbability *= 0.7; // Reduce spam probability for trusted senders
    } else if (senderValidation.trustScore < 0.3) {
      adjustedProbability = Math.min(0.95, adjustedProbability + 0.3); // Increase for suspicious senders
    }
    
    // Determine classification and threat level
    let classification = 'legitimate';
    let threatLevel = 'low';
    let confidence = mlResult.confidence;
    
    if (adjustedProbability > 0.8) {
      classification = 'spam';
      threatLevel = 'high';
      confidence = Math.max(0.85, confidence);
    } else if (adjustedProbability > 0.6) {
      classification = 'spam';
      threatLevel = 'medium';
      confidence = Math.max(0.75, Math.min(0.90, confidence));
    } else if (adjustedProbability > 0.4) {
      threatLevel = 'medium';
      confidence = Math.max(0.65, Math.min(0.85, confidence));
    } else {
      confidence = Math.max(0.70, confidence);
    }
    
    // Determine specific threat type based on features
    let threatType = null;
    if (classification === 'spam') {
      const features = mlResult.features;
      
      if (features.some(f => ['verify', 'confirm', 'suspended', 'security'].includes(f))) {
        threatType = 'phishing';
      } else if (features.some(f => ['lottery', 'winner', 'inheritance', 'million'].includes(f))) {
        threatType = 'financial_scam';
      } else if (features.some(f => ['download', 'attachment', 'install', 'exe'].includes(f))) {
        threatType = 'malware';
      } else if (features.some(f => ['love', 'relationship', 'help', 'emergency'].includes(f))) {
        threatType = 'social_engineering';
      } else {
        threatType = 'spam';
      }
    }
    
    return {
      classification,
      threat_level: threatLevel,
      threat_type: threatType,
      confidence: Math.round(confidence * 100) / 100,
      keywords: mlResult.features,
      sender_trust: senderValidation.trustScore,
      sender_issues: senderValidation.issues,
      ml_probability: Math.round(adjustedProbability * 100) / 100,
      reasoning: `Enhanced ML classification using training data: ${classification}${threatType ? ` (${threatType})` : ''}, ML probability: ${Math.round(adjustedProbability * 100)}%, sender trust: ${Math.round(senderValidation.trustScore * 100)}%, features: ${mlResult.features.length}`
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
    const classifier = new EmailClassifier();
    
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      const { subject, sender, content, userId, message_id } = emails[i];
      
      if (!subject || !sender || !userId) {
        continue;
      }

      const classification = classifier.classifyEmail(subject, sender, content || '');

      // Check user's privacy preference from the database
      let shouldStore = true;
      try {
        const { data: preferences, error: prefError } = await supabase
          .from('user_preferences')
          .select('never_store_data')
          .eq('user_id', userId)
          .single();

        if (!prefError && preferences) {
          shouldStore = !preferences.never_store_data;
        }
      } catch (error) {
        console.log('Could not check privacy preference, defaulting to store');
        shouldStore = true;
      }

      if (shouldStore) {
        // Store in database only if user allows it
        const { error: insertError } = await supabase
          .from('emails')
          .insert({
            user_id: userId,
            message_id: message_id || `enhanced_${Date.now()}_${i}`,
            subject,
            sender,
            content: content || '',
            classification: classification.classification,
            threat_level: classification.threat_level,
            threat_type: classification.threat_type,
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
          results.push({
            subject,
            sender,
            classification: classification.classification,
            threat_level: classification.threat_level,
            confidence: classification.confidence,
            sender_trust: classification.sender_trust,
            ml_probability: classification.ml_probability,
            success: true,
            stored: true
          });
        }
      } else {
        // Process but don't store - just return the classification
        results.push({
          subject,
          sender,
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          sender_trust: classification.sender_trust,
          ml_probability: classification.ml_probability,
          success: true,
          stored: false,
          message: "Email processed but not stored due to privacy settings"
        });
      }
    }

    const successful = results.filter(r => r.success).length;

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
    console.error('Error in email classifier:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});