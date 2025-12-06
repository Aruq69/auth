import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Zap, 
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { RealTimeMLAnalysis } from './RealTimeMLAnalysis';
import { supabase } from '@/integrations/supabase/client';

interface MLStats {
  totalClassifications: number;
  accuracyRate: number;
  threatsBlocked: number;
  processingSpeed: number;
  modelPerformance: {
    spam: number;
    phishing: number;
    legitimate: number;
  };
}

export const MLDashboard: React.FC = () => {
  const [stats, setStats] = useState<MLStats>({
    totalClassifications: 0,
    accuracyRate: 0,
    threatsBlocked: 0,
    processingSpeed: 0,
    modelPerformance: { spam: 0, phishing: 0, legitimate: 0 }
  });
  
  const [testEmail, setTestEmail] = useState('');
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMLStats();
  }, []);

  const loadMLStats = async () => {
    try {
      // In a real app, you'd fetch this from your analytics table
      // For demo purposes, using mock data
      setStats({
        totalClassifications: 15420,
        accuracyRate: 94.2,
        threatsBlocked: 1337,
        processingSpeed: 127,
        modelPerformance: {
          spam: 89.5,
          phishing: 97.2,
          legitimate: 91.8
        }
      });
    } catch (error) {
      console.error('Failed to load ML stats:', error);
    }
  };

  const runTestClassification = async () => {
    if (!testEmail.trim()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('robust-email-classifier', {
        body: {
          subject: 'Test Email',
          sender: 'test@example.com',
          content: testEmail
        }
      });

      if (error) throw error;
      setClassificationResult(data);
    } catch (error) {
      console.error('Classification test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6" />
        <h2 className="text-2xl font-bold">ML Analytics Dashboard</h2>
        <Badge variant="outline" className="ml-auto">
          <Zap className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="testing">Live Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classifications</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClassifications.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.accuracyRate}%</div>
                <Progress value={stats.accuracyRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threats Blocked</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.threatsBlocked.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +8% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.processingSpeed}ms</div>
                <p className="text-xs text-muted-foreground">
                  Real-time analysis
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Model Performance by Category</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Spam Detection</span>
                    <span className="text-sm text-muted-foreground">{stats.modelPerformance.spam}%</span>
                  </div>
                  <Progress value={stats.modelPerformance.spam} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Phishing Detection</span>
                    <span className="text-sm text-muted-foreground">{stats.modelPerformance.phishing}%</span>
                  </div>
                  <Progress value={stats.modelPerformance.phishing} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Legitimate Email Recognition</span>
                    <span className="text-sm text-muted-foreground">{stats.modelPerformance.legitimate}%</span>
                  </div>
                  <Progress value={stats.modelPerformance.legitimate} className="h-2" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Model Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Primary Model:</span>
                    <br />
                    <span className="font-medium">BERT + Transformer</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fallback Model:</span>
                    <br />
                    <span className="font-medium">Naive Bayes</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Training Data:</span>
                    <br />
                    <span className="font-medium">500K+ emails</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <br />
                    <span className="font-medium">Real-time</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Email Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Content</label>
                  <textarea
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email content to test classification..."
                    className="w-full h-32 p-3 border rounded-md resize-none"
                  />
                </div>
                
                <Button 
                  onClick={runTestClassification}
                  disabled={!testEmail.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Analyzing...' : 'Run Classification Test'}
                </Button>

                {classificationResult && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Classification:</span>
                      <Badge variant={classificationResult.threat_level === 'high' ? 'destructive' : 'outline'}>
                        {classificationResult.classification}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Confidence:</span>
                      <span>{Math.round(classificationResult.confidence * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Processing Time:</span>
                      <span>{classificationResult.processing_time}ms</span>
                    </div>

                    {classificationResult.recommendations && (
                      <div className="space-y-1">
                        <span className="font-medium text-sm">Recommendations:</span>
                        {classificationResult.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2 text-sm">
                            {rec.toLowerCase().includes('warning') || rec.toLowerCase().includes('caution') ? 
                              <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" /> :
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                            }
                            <span className="text-muted-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <RealTimeMLAnalysis 
              emailText={testEmail}
              onAnalysisComplete={(result) => console.log('Real-time analysis:', result)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};