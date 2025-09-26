import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Shield, AlertTriangle } from 'lucide-react';

interface MLAnalysisProps {
  emailText: string;
  onAnalysisComplete?: (result: any) => void;
}

interface AnalysisResult {
  toxicity: number;
  sentiment: string;
  confidence: number;
  threats: string[];
  processing: boolean;
}

export const RealTimeMLAnalysis: React.FC<MLAnalysisProps> = ({ 
  emailText, 
  onAnalysisComplete 
}) => {
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    toxicity: 0,
    sentiment: 'analyzing',
    confidence: 0,
    threats: [],
    processing: true
  });

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check WebGPU support
    const checkWebGPUSupport = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setIsSupported(!!adapter);
        } catch {
          setIsSupported(false);
        }
      }
    };
    
    checkWebGPUSupport();
  }, []);

  useEffect(() => {
    if (emailText && emailText.length > 10) {
      performRealTimeAnalysis(emailText);
    }
  }, [emailText]);

  const performRealTimeAnalysis = async (text: string) => {
    setAnalysis(prev => ({ ...prev, processing: true }));

    try {
      if (isSupported) {
        await performWebGPUAnalysis(text);
      } else {
        await performFallbackAnalysis(text);
      }
    } catch (error) {
      console.error('Real-time analysis failed:', error);
      await performFallbackAnalysis(text);
    }
  };

  const performWebGPUAnalysis = async (text: string) => {
    try {
      // Dynamic import to avoid build issues
      const { pipeline } = await import('@huggingface/transformers');
      
      console.log('Loading sentiment analysis model...');
      const sentiment = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        { device: 'webgpu' }
      );

      console.log('Loading text classification model...');
      const toxicity = await pipeline(
        'text-classification',
        'Xenova/toxic-bert',
        { device: 'webgpu' }
      );

      // Analyze sentiment
      const sentimentResult = await sentiment(text.substring(0, 512));
      const sentimentData = Array.isArray(sentimentResult) && sentimentResult.length > 0 ? sentimentResult[0] : sentimentResult;

      // Analyze toxicity
      const toxicityResult = await toxicity(text.substring(0, 512));
      const toxicityData = Array.isArray(toxicityResult) && toxicityResult.length > 0 ? toxicityResult[0] : toxicityResult;

      // Detect threats based on content
      const threats = detectThreats(text);

      const result = {
        toxicity: (toxicityData as any).label === 'TOXIC' ? (toxicityData as any).score : 1 - (toxicityData as any).score,
        sentiment: (sentimentData as any).label,
        confidence: Math.max((sentimentData as any).score, (toxicityData as any).score),
        threats,
        processing: false
      };

      setAnalysis(result);
      onAnalysisComplete?.(result);

    } catch (error) {
      console.error('WebGPU analysis failed:', error);
      throw error;
    }
  };

  const performFallbackAnalysis = async (text: string) => {
    // Simple rule-based analysis for fallback
    const lowerText = text.toLowerCase();
    
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'urgent', 'immediate', 'act now'];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    const sentiment = positiveCount > negativeCount ? 'POSITIVE' : 
                     negativeCount > positiveCount ? 'NEGATIVE' : 'NEUTRAL';
    
    // Simple toxicity detection
    const toxicKeywords = ['urgent', 'immediate', 'act now', 'limited time', 'click here', 'verify'];
    const toxicityScore = toxicKeywords.filter(word => lowerText.includes(word)).length / toxicKeywords.length;
    
    const threats = detectThreats(text);
    
    const result = {
      toxicity: toxicityScore,
      sentiment,
      confidence: 0.7,
      threats,
      processing: false
    };

    setAnalysis(result);
    onAnalysisComplete?.(result);
  };

  const detectThreats = (text: string): string[] => {
    const threats = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('click here') || lowerText.includes('click this link')) {
      threats.push('Suspicious link detected');
    }
    
    if (lowerText.includes('verify your account') || lowerText.includes('confirm your identity')) {
      threats.push('Potential phishing attempt');
    }
    
    if (lowerText.includes('urgent') || lowerText.includes('immediate action')) {
      threats.push('Urgency manipulation');
    }
    
    if (lowerText.includes('bank') && lowerText.includes('suspend')) {
      threats.push('Banking fraud indicator');
    }
    
    if (text.includes('$') && (lowerText.includes('win') || lowerText.includes('prize'))) {
      threats.push('Financial scam pattern');
    }
    
    return threats;
  };

  const getThreatLevel = () => {
    if (analysis.toxicity > 0.7 || analysis.threats.length > 2) return 'high';
    if (analysis.toxicity > 0.4 || analysis.threats.length > 0) return 'medium';
    return 'low';
  };

  const getThreatColor = () => {
    const level = getThreatLevel();
    return level === 'high' ? 'destructive' : level === 'medium' ? 'secondary' : 'outline';
  };

  if (!emailText || emailText.length < 10) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Brain className="h-5 w-5 mr-2" />
          <CardTitle className="text-sm font-medium">Real-time ML Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enter email content to begin real-time analysis...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Brain className="h-5 w-5 mr-2" />
        <CardTitle className="text-sm font-medium">Real-time ML Analysis</CardTitle>
        {isSupported && (
          <Badge variant="outline" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            WebGPU
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.processing ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Analyzing email content...</span>
            </div>
            <Progress value={50} className="w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Threat Level</span>
                  <Badge variant={getThreatColor() as any}>
                    {getThreatLevel().toUpperCase()}
                  </Badge>
                </div>
                <Progress 
                  value={analysis.toxicity * 100} 
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round(analysis.toxicity * 100)}% risk score
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sentiment</span>
                  <Badge variant="outline">
                    {analysis.sentiment}
                  </Badge>
                </div>
                <Progress 
                  value={analysis.confidence * 100} 
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round(analysis.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            {analysis.threats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Detected Threats</span>
                </div>
                <div className="space-y-1">
                  {analysis.threats.map((threat, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Shield className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-muted-foreground">{threat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {isSupported ? 
                  '🚀 Powered by WebGPU-accelerated transformers' : 
                  '⚡ Using optimized fallback analysis'
                }
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};