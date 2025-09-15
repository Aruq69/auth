import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Mail, AlertTriangle, CheckCircle, Clock, Search, User, Zap, Activity, Eye, Lock, LogOut, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmailSubmissionForm from "@/components/EmailSubmissionForm";
import FloatingChatButton from "@/components/FloatingChatButton";
import IMAPConnect from "@/components/IMAPConnect";
import shieldIcon from "@/assets/shield-icon.png";

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  confidence: number | null;
  keywords: string[] | null;
  message_id: string;
  content: string | null;
  raw_content: string | null;
}

const Index = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      checkEmailConnection();
      const timer = setTimeout(() => {
        fetchEmails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  const fetchEmails = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
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

  const fetchIMAPEmails = async () => {
    if (!user) {
      
      toast({
        title: "Authentication required",
        description: "Please sign in to fetch emails.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    
    try {
      // This will trigger the IMAP connection form to show
      toast({
        title: "Connect Email Account",
        description: "Use the Connect Email Account section below to fetch real emails.",
      });
      
      // Refresh emails after a brief delay to show any newly connected emails
      setTimeout(() => {
        fetchEmails();
      }, 1000);
      
    } catch (error) {
      console.error('🚨 IMAP fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate IMAP connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add test data function for debugging
  const addTestEmails = async () => {
    if (!user) return;
    
    const testEmails = [
      {
        user_id: user.id,
        message_id: 'test-1',
        subject: 'Suspicious Login Attempt',
        sender: 'security@phishing-site.com',
        content: 'Click here to verify your account immediately!',
        classification: 'spam',
        threat_level: 'high',
        confidence: 0.95,
        keywords: ['urgent', 'verify', 'click here'],
        received_date: new Date().toISOString(),
      },
      {
        user_id: user.id,
        message_id: 'test-2',
        subject: 'Meeting Reminder',
        sender: 'colleague@company.com',
        content: 'Don\'t forget our meeting tomorrow at 2 PM.',
        classification: 'legitimate',
        threat_level: 'low',
        confidence: 0.98,
        keywords: ['meeting', 'reminder'],
        received_date: new Date(Date.now() - 86400000).toISOString(),
      }
    ];

    const { error } = await supabase
      .from('emails')
      .insert(testEmails);
    
    if (!error) {
      toast({
        title: "Test emails added",
        description: "Added sample emails for testing",
      });
      fetchEmails();
    }
  };

  const checkEmailConnection = async () => {
    if (!user) return;
    
    try {
      // Check if user has analyzed any emails (indicates they've connected an account)
      const { data, error } = await supabase
        .from('emails')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      setGmailConnected(!!(data && data.length > 0) && !error);
    } catch (error) {
      setGmailConnected(false);
    }
  };

  const handleUnsync = async () => {
    if (!user) return;
    
    try {
      // Clear all analyzed emails (since IMAP doesn't store persistent tokens)
      await supabase
        .from('emails')
        .delete()
        .eq('user_id', user.id);
      
      setGmailConnected(false);
      toast({
        title: "Cleared",
        description: "Email analysis history cleared successfully.",
      });
      
      // Refresh to show empty state
      fetchEmails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear email data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const connectGmail = async () => {
    try {
      
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url' },
      });

      

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
        
        window.location.href = data.auth_url;
      } else {
        
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
    // Map classification to threat levels for dashboard display
    let displayCategory;
    if (email.classification === 'spam' && email.threat_level === 'high') {
      displayCategory = 'high';
    } else if (email.classification === 'spam' && email.threat_level === 'medium') {
      displayCategory = 'medium'; 
    } else if (email.classification === 'legitimate' || email.threat_level === 'low') {
      displayCategory = 'low'; // Legitimate emails count as low risk
    } else if (email.classification === 'pending') {
      displayCategory = 'medium'; // Pending emails count as medium risk
    } else {
      displayCategory = 'unknown';
    }
    
    acc[displayCategory] = (acc[displayCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Cyber Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img src={shieldIcon} alt="Mail Guard Shield" className="h-10 w-10" />
              <div className="absolute inset-0 h-10 w-10 border border-primary/30 rounded-full animate-ping" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                MAIL GUARD
              </h1>
              <p className="text-muted-foreground">
                Advanced Email Security & Threat Analysis System
              </p>
              {user && (
                <div className="flex items-center space-x-2 mt-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">{user.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {gmailConnected && (
              <Button onClick={fetchIMAPEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50 hover-button">
                <Activity className="h-4 w-4 mr-2" />
                Connect New Account
              </Button>
            )}
            <Button onClick={fetchEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50 hover-button">
              <Mail className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={addTestEmails} variant="outline" className="border-accent/30 hover:border-accent/50 hover-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Emails
            </Button>
            {gmailConnected && (
              <Button onClick={handleUnsync} variant="outline" className="border-destructive/30 hover:border-destructive/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover-button">
                <Lock className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            )}
            <Button onClick={signOut} variant="outline" className="border-muted-foreground/30 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover-button">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Threat Level Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL EMAILS</CardTitle>
              <Mail className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{emails.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active monitoring</div>
            </CardContent>
          </Card>
          
          <Card className="threat-high border-border/20 bg-card/50 backdrop-blur-sm hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">HIGH THREATS</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{threatStats.high || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Critical alerts</div>
            </CardContent>
          </Card>
          
          <Card className="threat-medium border-border/20 bg-card/50 backdrop-blur-sm hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MEDIUM THREATS</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{threatStats.medium || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Under review</div>
            </CardContent>
          </Card>
          
          <Card className="threat-low border-border/20 bg-card/50 backdrop-blur-sm hover-card">
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

        {/* Email Connection */}
        {!gmailConnected && (
          <IMAPConnect onConnected={checkEmailConnection} />
        )}

        {/* Email Submission Form */}
        <EmailSubmissionForm onEmailSubmitted={fetchEmails} />

        {/* Main Content - Full Width */}
        <div className="space-y-6">
          {/* Email Analysis */}
          <div className="w-full space-y-6">
            {/* Search Interface */}
            <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
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
            <div className="h-[700px] flex flex-col">
              <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>THREAT ANALYSIS RESULTS</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time security assessment and threat classification
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4 h-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="text-primary">SCANNING EMAIL THREATS...</div>
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
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto space-y-4 pr-4">
                        {filteredEmails.map((email) => {
                          const threatClass = email.threat_level === 'high' ? 'threat-high' : 
                                            email.threat_level === 'medium' ? 'threat-medium' : 'threat-low';
                          
                          return (
                            <div 
                              key={email.id} 
                              className={`${threatClass} p-4 hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-border/20 bg-card/50 backdrop-blur-sm rounded-lg hover-card ${
                                selectedEmail?.id === email.id ? 'ring-2 ring-primary' : ''
                              }`}
                              onClick={() => {
                                setSelectedEmail(email);
                                setShowEmailDialog(true);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 space-y-2.5">
                                  <div className="flex items-center space-x-3">
                                    {getThreatIcon(email.threat_level)}
                                    <span className="font-semibold text-foreground text-base">{email.subject}</span>
                                    {email.threat_level && (
                                      <Badge 
                                        variant={getThreatBadgeVariant(email.threat_level)}
                                        className="text-xs px-2.5 py-1"
                                      >
                                        {email.threat_level.toUpperCase()}
                                      </Badge>
                                    )}
                                    {email.classification && (
                                      <Badge variant="outline" className="border-primary/30 text-primary text-xs px-2.5 py-1">
                                        {email.classification}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span className="text-primary font-medium">From:</span> {email.sender} • 
                                    <span className="text-primary font-medium ml-2">Date:</span> {new Date(email.received_date).toLocaleDateString()}
                                  </div>
                                  {email.keywords && email.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
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
                                  <div className="text-right ml-4">
                                    <div className="text-xl font-bold text-primary">
                                      {Math.round(email.confidence * 100)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium">CONFIDENCE</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </div>

        {/* Floating Chat Button */}
        <FloatingChatButton selectedEmail={selectedEmail} emails={emails} />

        {/* Email Details Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto border-border/20 bg-card/95 backdrop-blur-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Mail className="h-6 w-6 text-primary" />
                <span className="text-xl">EMAIL ANALYSIS REPORT</span>
                {selectedEmail?.threat_level && (
                  <Badge variant={getThreatBadgeVariant(selectedEmail.threat_level)}>
                    {selectedEmail.threat_level.toUpperCase()} THREAT
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Complete email content analysis and security assessment
              </DialogDescription>
            </DialogHeader>
            
            {selectedEmail && (
              <div className="space-y-6 mt-6">
                {/* Security Status Banner */}
                <div className={`p-6 border-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                  selectedEmail.threat_level === 'high' ? 'border-destructive/50 bg-destructive/10' :
                  selectedEmail.threat_level === 'medium' ? 'border-yellow-500/50 bg-yellow-500/10' :
                  'border-accent/50 bg-accent/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getThreatIcon(selectedEmail.threat_level)}
                      <div>
                        <h3 className="font-semibold text-lg">
                          Security Status: {selectedEmail.threat_level?.toUpperCase() || 'UNKNOWN'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Confidence: {Math.round((selectedEmail.confidence || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Info */}
                  <Card className="border-border/20 bg-card/80 backdrop-blur-sm hover-card transition-all duration-300 hover:bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-sm text-primary">📧 EMAIL DETAILS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                        <p className="text-sm font-mono">{selectedEmail.sender}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
                        <p className="text-sm">{selectedEmail.subject}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Received</label>
                        <p className="text-sm">{new Date(selectedEmail.received_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message ID</label>
                        <p className="text-xs font-mono text-muted-foreground break-all">{selectedEmail.message_id}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analysis Results */}
                  <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
                    <CardHeader>
                      <CardTitle className="text-sm text-primary">🔍 ANALYSIS RESULTS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classification</label>
                        <p className="text-sm font-semibold">
                          {selectedEmail.classification || 'Not classified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threat Level</label>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getThreatBadgeVariant(selectedEmail.threat_level)}>
                            {selectedEmail.threat_level?.toUpperCase() || 'UNKNOWN'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((selectedEmail.confidence || 0) * 100)}% confidence)
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Assessment</label>
                        <p className="text-sm">
                          {selectedEmail.threat_level === 'high' ? 'HIGH RISK - Immediate attention required' :
                           selectedEmail.threat_level === 'medium' ? 'MEDIUM RISK - Review recommended' :
                           'LOW RISK - Safe to proceed'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Keywords */}
                {selectedEmail.keywords && selectedEmail.keywords.length > 0 && (
                  <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
                    <CardHeader>
                      <CardTitle className="text-sm text-primary">🔍 DETECTED KEYWORDS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-block bg-primary/20 text-primary px-3 py-1 text-sm rounded border border-primary/30"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Email Content */}
                <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
                  <CardHeader>
                    <CardTitle className="text-sm text-primary">📄 EMAIL CONTENT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-background/50 p-6 rounded-lg border-2 border-muted/20 min-h-[300px] max-h-[400px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                        {selectedEmail.content || selectedEmail.raw_content || 'No content available'}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-primary/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedEmail.content || selectedEmail.raw_content || '');
                      toast({
                        title: "Content Copied",
                        description: "Email content copied to clipboard",
                      });
                    }}
                  >
                    📋 Copy Content
                  </Button>
                  <Button
                    onClick={() => setShowEmailDialog(false)}
                    className="hover-button"
                  >
                    Close Viewer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;