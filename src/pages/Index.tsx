import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Mail, AlertTriangle, CheckCircle, Clock, Search, User, Zap, Activity, Eye, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmailSubmissionForm from "@/components/EmailSubmissionForm";
import ChatAssistant from "@/components/ChatAssistant";

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  confidence: number | null;
  keywords: string[] | null;
}

const Index = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkGmailConnection();
  }, []);

  useEffect(() => {
    // Defer API call to move it out of critical rendering path
    const timer = setTimeout(() => {
      fetchEmails();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchEmails = async () => {
    
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching emails:', error);
        toast({
          title: "Error",
          description: "Failed to fetch emails. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGmailEmails = async () => {
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: {},
      });

      if (error) {
        console.error('Gmail fetch error:', error);
        toast({
          title: "Gmail fetch failed",
          description: error.message || "Failed to fetch Gmail emails. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Gmail sync complete",
        description: `Analyzed ${data.total || 0} emails from Gmail`,
      });

      // Refresh the local email list
      fetchEmails();

    } catch (error) {
      console.error('Gmail fetch error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching Gmail emails.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const defaultUserId = '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase
        .from('gmail_tokens')
        .select('id')
        .eq('user_id', defaultUserId)
        .maybeSingle();
      
      setGmailConnected(!!data && !error);
    } catch (error) {
      setGmailConnected(false);
    }
  };

  const handleUnsync = async () => {
    try {
      // Remove Gmail tokens
      const defaultUserId = '00000000-0000-0000-0000-000000000000';
      await supabase
        .from('gmail_tokens')
        .delete()
        .eq('user_id', defaultUserId);
      
      setGmailConnected(false);
      toast({
        title: "Unsynced",
        description: "Gmail connection removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unsync. Please try again.",
        variant: "destructive",
      });
    }
  };

  const connectGmail = async () => {
    try {
      console.log('Gmail connect button clicked!');
      console.log('Starting Gmail connection...');
      
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url' },
      });

      console.log('Gmail auth response:', { data, error });

      if (error) {
        console.error('Gmail auth error:', error);
        toast({
          title: "Connection failed",
          description: error.message || "Failed to connect to Gmail. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.auth_url) {
        console.log('Redirecting to:', data.auth_url);
        window.location.href = data.auth_url;
      } else {
        console.error('No auth URL in response:', data);
        toast({
          title: "Connection failed",
          description: "No authorization URL received. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Gmail connection error:', error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getThreatBadgeVariant = (threatLevel: string | null) => {
    switch (threatLevel?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getThreatIcon = (threatLevel: string | null) => {
    switch (threatLevel?.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const threatStats = emails.reduce((acc, email) => {
    const level = email.threat_level?.toLowerCase() || 'unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background matrix-bg">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Cyber Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Shield className="h-10 w-10 text-primary cyber-text-glow cyber-pulse" />
              <div className="absolute inset-0 h-10 w-10 border border-primary/30 rounded-full animate-ping" />
            </div>
            <div>
              <h1 className="text-4xl font-bold cyber-text-glow bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                MAIL GUARD
              </h1>
              <p className="text-muted-foreground">
                Advanced Email Security & Threat Analysis System
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {gmailConnected && (
              <Button onClick={fetchGmailEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50">
                <Activity className="h-4 w-4 mr-2" />
                Refresh Gmail
              </Button>
            )}
            <Button onClick={fetchEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50">
              <Mail className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {gmailConnected && (
              <Button onClick={handleUnsync} variant="outline" className="border-destructive/30 hover:border-destructive/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300">
                <Lock className="h-4 w-4 mr-2" />
                Unsync
              </Button>
            )}
          </div>
        </div>

        {/* Threat Level Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="cyber-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL EMAILS</CardTitle>
              <Mail className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary cyber-text-glow">{emails.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active monitoring</div>
            </CardContent>
          </Card>
          
          <Card className="cyber-card threat-high">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">HIGH THREATS</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{threatStats.high || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Critical alerts</div>
            </CardContent>
          </Card>
          
          <Card className="cyber-card threat-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MEDIUM THREATS</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{threatStats.medium || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Under review</div>
            </CardContent>
          </Card>
          
          <Card className="cyber-card threat-low">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SAFE EMAILS</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{threatStats.low || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Verified clean</div>
            </CardContent>
          </Card>
        </div>

        {/* Gmail Connection */}
        {!gmailConnected && (
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <span>Connect Gmail Account</span>
              </CardTitle>
              <CardDescription>
                Connect your Gmail account to automatically analyze your emails for threats and security risks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Gmail Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <span>Gmail Access Permission</span>
                    </DialogTitle>
                    <DialogDescription className="space-y-4">
                      <p>
                        We need read-only access to your Gmail account to analyze your emails for security threats and spam.
                      </p>
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-primary">What we do:</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Read and analyze emails for security threats</li>
                          <li>• Classify emails as spam, phishing, or legitimate</li>
                          <li>• Provide threat level assessments</li>
                        </ul>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-accent">What we don't do:</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Send emails on your behalf</li>
                          <li>• Delete or modify your emails</li>
                          <li>• Share your data with third parties</li>
                        </ul>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This access is only used for email analysis and security purposes.
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={(e) => {
                      e.preventDefault();
                      connectGmail();
                    }} className="flex-1">
                      <Shield className="h-4 w-4 mr-2" />
                      Sync Gmail
                    </Button>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </DialogTrigger>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Email Submission Form */}
        <EmailSubmissionForm onEmailSubmitted={fetchEmails} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Email Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Interface */}
            <Card className="cyber-card">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-primary" />
                  <Input
                    placeholder="Search emails by subject or sender..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted/50 border-primary/20 focus:border-primary/50"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                </div>
              </CardContent>
            </Card>

            {/* Threat Analysis Dashboard */}
            <Card className="cyber-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary cyber-text-glow" />
                  <span className="cyber-text-glow">THREAT ANALYSIS RESULTS</span>
                </CardTitle>
                <CardDescription>
                  Real-time security assessment and threat classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <div className="text-primary cyber-text-glow">SCANNING EMAIL THREATS...</div>
                    </div>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                      <div className="text-muted-foreground">No email threats detected</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEmails.map((email) => {
                      const threatClass = email.threat_level === 'high' ? 'threat-high' : 
                                        email.threat_level === 'medium' ? 'threat-medium' : 'threat-low';
                      
                      return (
                        <div 
                          key={email.id} 
                          className={`cyber-card ${threatClass} p-4 hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                            selectedEmail?.id === email.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center space-x-3">
                                {getThreatIcon(email.threat_level)}
                                <span className="font-medium text-foreground">{email.subject}</span>
                                {email.threat_level && (
                                  <Badge 
                                    variant={getThreatBadgeVariant(email.threat_level)}
                                    className="cyber-text-glow"
                                  >
                                    {email.threat_level.toUpperCase()}
                                  </Badge>
                                )}
                                {email.classification && (
                                  <Badge variant="outline" className="border-primary/30 text-primary">
                                    {email.classification}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span className="text-primary">From:</span> {email.sender} • 
                                <span className="text-primary ml-2">Date:</span> {new Date(email.received_date).toLocaleDateString()}
                              </div>
                              {email.keywords && email.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {email.keywords.slice(0, 3).map((keyword, index) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-primary/20 text-primary px-2 py-1 text-xs rounded border border-primary/30"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                  {email.keywords.length > 3 && (
                                    <span className="inline-block bg-secondary/20 text-secondary px-2 py-1 text-xs rounded border border-secondary/30">
                                      +{email.keywords.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {email.confidence && (
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary cyber-text-glow">
                                  {Math.round(email.confidence * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">CONFIDENCE</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat Assistant */}
          <div className="lg:col-span-1">
            <ChatAssistant selectedEmail={selectedEmail} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;