import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, TrendingUp, AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

interface SecurityInsightsProps {
  selectedEmail?: any;
  emailStats?: any[];
}

export const SecurityInsights = ({ selectedEmail, emailStats }: SecurityInsightsProps) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<{
    individual?: string;
    patterns?: string;
    comprehensive?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patterns');

  const generateInsights = async (type: 'individual' | 'patterns' | 'comprehensive') => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const requestData: any = {
        user_id: user.id,
        analysis_type: type
      };

      if (type === 'individual' && selectedEmail) {
        requestData.email_data = {
          subject: selectedEmail.subject,
          sender: selectedEmail.sender,
          threatLevel: selectedEmail.threat_level,
          threatType: selectedEmail.threat_type,
          classification: selectedEmail.classification,
          keywords: selectedEmail.keywords,
          confidence: selectedEmail.confidence
        };
      }

      if (type === 'comprehensive' && selectedEmail) {
        requestData.email_data = {
          subject: selectedEmail.subject,
          sender: selectedEmail.sender,
          threatLevel: selectedEmail.threat_level,
          threatType: selectedEmail.threat_type,
          classification: selectedEmail.classification
        };
      }

      const { data, error } = await supabase.functions.invoke('email-security-advisor', {
        body: requestData
      });

      if (error) throw error;

      setInsights(prev => ({
        ...prev,
        [type]: data.advice
      }));

    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate security insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && emailStats?.length > 0) {
      generateInsights('patterns');
    }
  }, [user, emailStats]);

  useEffect(() => {
    if (selectedEmail && activeTab === 'individual') {
      generateInsights('individual');
    }
  }, [selectedEmail, activeTab]);

  const formatAdvice = (advice: string) => {
    return advice.split('\n').map((line, index) => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <li key={index} className="ml-4 text-muted-foreground">
            {line.replace(/^[•-]\s*/, '')}
          </li>
        );
      }
      if (line.trim().match(/^\d+\./)) {
        return (
          <div key={index} className="font-medium text-foreground mt-2">
            {line}
          </div>
        );
      }
      return line.trim() ? (
        <p key={index} className="text-muted-foreground">
          {line}
        </p>
      ) : null;
    });
  };

  const calculateTotalStats = () => {
    if (!emailStats?.length) return null;
    
    return emailStats.reduce((acc, stat) => ({
      total_emails: acc.total_emails + (stat.total_emails || 0),
      safe_emails: acc.safe_emails + (stat.safe_emails || 0),
      threat_emails: acc.threat_emails + (stat.high_threat_emails || 0) + (stat.medium_threat_emails || 0) + (stat.low_threat_emails || 0),
      spam_emails: acc.spam_emails + (stat.spam_emails || 0),
      phishing_emails: acc.phishing_emails + (stat.phishing_emails || 0)
    }), {
      total_emails: 0,
      safe_emails: 0,
      threat_emails: 0,
      spam_emails: 0,
      phishing_emails: 0
    });
  };

  const stats = calculateTotalStats();
  const safetyRate = stats ? Math.round((stats.safe_emails / stats.total_emails) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Security Insights</CardTitle>
          </div>
          {stats && (
            <Badge variant={safetyRate >= 90 ? "default" : safetyRate >= 70 ? "secondary" : "destructive"}>
              {safetyRate}% Safe
            </Badge>
          )}
        </div>
        <CardDescription>
          Dynamic security analysis based on your email patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="patterns" className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>Patterns</span>
            </TabsTrigger>
            <TabsTrigger 
              value="individual" 
              disabled={!selectedEmail}
              className="flex items-center space-x-1"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Current</span>
            </TabsTrigger>
            <TabsTrigger value="comprehensive" className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Full Analysis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Security Pattern Analysis</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateInsights('patterns')}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.total_emails}</div>
                  <div className="text-sm text-muted-foreground">Total Emails</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{stats.threat_emails}</div>
                  <div className="text-sm text-muted-foreground">Threats Detected</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {loading && activeTab === 'patterns' ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Analyzing your email patterns...</p>
                </div>
              ) : insights.patterns ? (
                formatAdvice(insights.patterns)
              ) : (
                <p className="text-muted-foreground">No pattern analysis available. More emails needed for insights.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Email Analysis</h3>
              {selectedEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateInsights('individual')}
                  disabled={loading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Analyze</span>
                </Button>
              )}
            </div>

            {selectedEmail ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedEmail.subject}</div>
                  <div className="text-sm text-muted-foreground">From: {selectedEmail.sender}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={
                      selectedEmail.threat_level === 'high' ? 'destructive' :
                      selectedEmail.threat_level === 'medium' ? 'secondary' : 'default'
                    }>
                      {selectedEmail.threat_level || 'safe'}
                    </Badge>
                    {selectedEmail.threat_type && (
                      <Badge variant="outline">{selectedEmail.threat_type}</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {loading && activeTab === 'individual' ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Analyzing this email...</p>
                    </div>
                  ) : insights.individual ? (
                    formatAdvice(insights.individual)
                  ) : (
                    <p className="text-muted-foreground">Click "Analyze" to get specific advice for this email.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select an email to get personalized security advice.</p>
            )}
          </TabsContent>

          <TabsContent value="comprehensive" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Comprehensive Security Analysis</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateInsights('comprehensive')}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Generate</span>
              </Button>
            </div>

            <div className="space-y-2">
              {loading && activeTab === 'comprehensive' ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Generating comprehensive analysis...</p>
                </div>
              ) : insights.comprehensive ? (
                formatAdvice(insights.comprehensive)
              ) : (
                <p className="text-muted-foreground">Click "Generate" to get a comprehensive security analysis of your email environment.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};