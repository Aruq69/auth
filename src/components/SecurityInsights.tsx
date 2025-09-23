import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormattedAdvice } from '@/components/ui/formatted-advice';
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

      console.log('Preparing request data:', requestData);

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
        console.log('Added individual email data:', requestData.email_data);
      }

      if (type === 'comprehensive' && selectedEmail) {
        requestData.email_data = {
          subject: selectedEmail.subject,
          sender: selectedEmail.sender,
          threatLevel: selectedEmail.threat_level,
          threatType: selectedEmail.threat_type,
          classification: selectedEmail.classification
        };
        console.log('Added comprehensive email data:', requestData.email_data);
      }

      console.log('Invoking email-security-advisor with:', JSON.stringify(requestData));

      const { data, error } = await supabase.functions.invoke('email-security-advisor', {
        body: requestData
      });

      console.log('Function response - data:', data);
      console.log('Function response - error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.advice) {
        console.error('No advice received in response:', data);
        throw new Error('No advice received from security advisor');
      }

      setInsights(prev => ({
        ...prev,
        [type]: data.advice
      }));

      console.log('Successfully set insights for type:', type);

    } catch (error) {
      console.error('Error generating insights:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details
      });
      toast({
        title: "Error",
        description: `Failed to generate security insights: ${error.message || 'Unknown error'}`,
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


  const calculateTotalStats = () => {
    if (!emailStats?.length) return null;
    
    return emailStats.reduce((acc, stat) => ({
      total_emails: acc.total_emails + (stat.total_emails || 0),
      safe_emails: acc.safe_emails + (stat.safe_emails || 0),
      // Only count high threats to match dashboard logic
      threat_emails: acc.threat_emails + (stat.high_threat_emails || 0),
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
  const safetyRate = stats && stats.total_emails > 0 ? Math.round((stats.safe_emails / stats.total_emails) * 100) : 0;

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
            <ScrollArea className="h-[350px]">
              <div className="space-y-4 pr-4">
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
            
            {stats && stats.total_emails > 0 ? (
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
            ) : (
              <div className="text-center p-6 bg-muted/50 rounded-lg mb-4">
                <div className="text-muted-foreground">No email statistics available yet</div>
                <div className="text-sm text-muted-foreground mt-1">Submit some emails to see analytics</div>
              </div>
            )}

                <div className="space-y-2">
                  {loading && activeTab === 'patterns' ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Analyzing your email patterns...</p>
                    </div>
                   ) : insights.patterns ? (
                     <FormattedAdvice content={insights.patterns} />
                   ) : (
                     <p className="text-muted-foreground">No pattern analysis available. More emails needed for insights.</p>
                   )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <ScrollArea className="h-[350px]">
              <div className="space-y-4 pr-4">
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
                       <FormattedAdvice content={insights.individual} />
                     ) : (
                       <p className="text-muted-foreground">Click "Analyze" to get specific advice for this email.</p>
                     )}
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <p className="text-muted-foreground">Select an email to get personalized security advice.</p>
                </div>
              )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comprehensive" className="space-y-4">
            <ScrollArea className="h-[350px]">
              <div className="space-y-4 pr-4">
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
                     <FormattedAdvice content={insights.comprehensive} />
                   ) : (
                     <p className="text-muted-foreground">Click "Generate" to get a comprehensive security analysis of your email environment.</p>
                   )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};