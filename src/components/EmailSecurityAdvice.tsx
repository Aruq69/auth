import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, Shield, RefreshCw, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Email {
  subject: string;
  sender: string;
  threat_level: string | null;
  threat_type: string | null;
  classification: string | null;
  keywords: string[] | null;
}

interface EmailSecurityAdviceProps {
  email: Email;
}

const EmailSecurityAdvice = ({ email }: EmailSecurityAdviceProps) => {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  // Only show for high and medium threat emails
  if (!email.threat_level || !['high', 'medium'].includes(email.threat_level.toLowerCase())) {
    return null;
  }

  useEffect(() => {
    generateAdvice();
  }, [email.subject, email.sender, email.threat_level]);

  const generateAdvice = async () => {
    setLoading(true);
    setError("");
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('email-security-advisor', {
        body: {
          user_id: 'anonymous', // Provide a default user_id for individual email analysis
          analysis_type: 'individual',
          email_data: {
            subject: email.subject,
            sender: email.sender,
            threatLevel: email.threat_level,
            threatType: email.threat_type,
            classification: email.classification,
            keywords: email.keywords
          }
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.advice) {
        setAdvice(data.advice);
      } else {
        throw new Error('No advice received');
      }
    } catch (err: any) {
      console.error('Error generating security advice:', err);
      setError('Failed to generate security advice. Please try again.');
      toast({
        title: "Error",
        description: "Failed to generate security advice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryAdvice = () => {
    generateAdvice();
  };

  const getAlertVariant = () => {
    return email.threat_level === 'high' ? 'destructive' : 'default';
  };

  const getIcon = () => {
    return email.threat_level === 'high' ? (
      <AlertTriangle className="h-5 w-5 text-red-500" />
    ) : (
      <Shield className="h-5 w-5 text-yellow-500" />
    );
  };

  return (
    <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Brain className="h-5 w-5 text-orange-500" />
          <span>🤖 AI Security Advisor</span>
          {getIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant={getAlertVariant()} className="mb-4">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription className="font-medium">
            This {email.threat_level?.toLowerCase()} threat email requires your attention. Here's what you should do:
          </AlertDescription>
        </Alert>

        {loading && (
          <div className="flex items-center justify-center space-x-2 py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-sm text-muted-foreground">Generating security advice...</span>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={retryAdvice} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {advice && !loading && !error && (
          <div className="space-y-3">
            <div className="bg-background/50 border border-orange-500/20 rounded-lg p-4">
              <div className="prose prose-sm max-w-none">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {advice}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>💡 AI-generated security guidance</span>
              <Button 
                onClick={retryAdvice} 
                variant="ghost" 
                size="sm"
                className="h-auto p-1 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailSecurityAdvice;