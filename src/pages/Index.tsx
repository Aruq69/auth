import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Mail, AlertTriangle, CheckCircle, Clock, Search, User, Zap, Activity, Eye, Lock, LogOut, Plus, Brain, Bot, Cpu, Target, Radar, ScanLine, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmailSubmissionForm from "@/components/EmailSubmissionForm";
import FloatingChatButton from "@/components/FloatingChatButton";

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

  const fetchGmailEmails = async () => {
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
      console.log('🔄 Invoking Gmail email fetch...');
      
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('Gmail fetch error:', error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "Gmail sync successful",
          description: `Processed ${data.total} emails from your Gmail inbox.`,
        });
        
        // Refresh the emails list
        fetchEmails();
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('🚨 Gmail fetch error:', error);
      toast({
        title: "Gmail sync failed",
        description: error.message || "Failed to fetch emails from Gmail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const checkEmailConnection = async () => {
    if (!user) return;
    
    try {
      // Check if user has Gmail tokens (indicates they've connected Gmail)
      const { data, error } = await supabase
        .from('gmail_tokens')
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
      // Clear Gmail tokens and emails
      await Promise.all([
        supabase
          .from('gmail_tokens')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('emails')
          .delete()
          .eq('user_id', user.id)
      ]);
      
      setGmailConnected(false);
      toast({
        title: "Disconnected",
        description: "Gmail account and email data cleared successfully.",
      });
      
      // Refresh to show empty state
      fetchEmails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail. Please try again.",
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
      case 'high': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/20 border border-destructive/30">
            <AlertTriangle className="h-3 w-3 text-destructive" />
          </div>
        );
      case 'medium': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30">
            <Clock className="h-3 w-3 text-yellow-500" />
          </div>
        );
      case 'low': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 border border-accent/30">
            <CheckCircle className="h-3 w-3 text-accent" />
          </div>
        );
      default: 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/20 border border-muted/30">
            <Shield className="h-3 w-3 text-muted-foreground" />
          </div>
        );
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
        {/* Centered Header with Shield */}
        <div className="text-center space-y-6">
          {/* Centered Shield Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="p-8 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
                <Shield className="h-24 w-24 text-primary" />
              </div>
              <div className="absolute inset-0 p-8 rounded-full border border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/5 animate-pulse [animation-duration:3s]" />
            </div>
          </div>
          
          {/* Centered Title and Description */}
          <div className="space-y-3">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              MAIL GUARD
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced Email Security & Threat Analysis System
            </p>
            {user && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">{user.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-center space-x-4 flex-wrap gap-2">
            {gmailConnected && (
              <Button onClick={fetchGmailEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50 hover-button">
                <Activity className="h-4 w-4 mr-2" />
                Sync Gmail
              </Button>
            )}
            <Button onClick={fetchEmails} disabled={loading} variant="outline" className="border-primary/30 hover:border-primary/50 hover-button">
              <Mail className="h-4 w-4 mr-2" />
              Refresh
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

        {/* Gmail Connection */}
        {!gmailConnected && (
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <span>Connect Gmail Account</span>
              </CardTitle>
              <CardDescription>
                Connect your Gmail account to start analyzing emails for threats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feature Cards Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-6">
                {/* Universal */}
                <div className="border border-border/20 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
                  <div className="relative mb-3">
                    <div className="p-3 rounded-full bg-orange-500/20 w-fit mx-auto">
                      <Shield className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Universal</h3>
                  <p className="text-xs text-muted-foreground">Works with Gmail</p>
                </div>
                
                {/* AI Analysis */}
                <div className="border border-border/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
                  <div className="relative mb-3">
                    <div className="p-3 rounded-full bg-cyan-500/20 w-fit mx-auto">
                      <Eye className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-cyan-500 rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">AI Analysis</h3>
                  <p className="text-xs text-muted-foreground">Real-time detection</p>
                </div>
                
                {/* Secure */}
                <div className="border border-border/20 bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
                  <div className="relative mb-3">
                    <div className="p-3 rounded-full bg-pink-500/20 w-fit mx-auto">
                      <Database className="h-6 w-6 text-pink-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-pink-500 rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Secure</h3>
                  <p className="text-xs text-muted-foreground">OAuth 2.0</p>
                </div>
                
                {/* ML Engine */}
                <div className="border border-border/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
                  <div className="relative mb-3">
                    <div className="p-3 rounded-full bg-emerald-500/20 w-fit mx-auto">
                      <Database className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">ML Engine</h3>
                  <p className="text-xs text-muted-foreground">Adaptive learning</p>
                </div>
              </div>

              {/* Gmail Connection Button */}
              <div className="text-center space-y-4">
                <div className="relative p-6 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Gmail Integration</h3>
                      <p className="text-sm text-muted-foreground">Secure OAuth 2.0 connection to your Gmail account</p>
                    </div>
                  </div>
                  <Button onClick={connectGmail} className="w-full gradient-button" size="lg">
                    <Mail className="h-5 w-5 mr-2" />
                    Connect Gmail Account
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded border border-border/20">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Secure OAuth 2.0 authentication • Read-only access • No passwords stored</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                      <div className="h-full overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {filteredEmails.map((email, index) => {
                          const threatClass = email.threat_level === 'high' ? 'threat-high' : 
                                            email.threat_level === 'medium' ? 'threat-medium' : 'threat-low';
                          
                          return (
                            <div 
                              key={email.id} 
                              className={`group relative ${threatClass} p-5 hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-border/30 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-md rounded-xl hover-card animate-fade-in shadow-lg hover:shadow-xl ${
                                selectedEmail?.id === email.id ? 'ring-2 ring-primary/50 shadow-primary/20' : ''
                              }`}
                              style={{ animationDelay: `${index * 0.1}s` }}
                              onClick={() => {
                                setSelectedEmail(email);
                                setShowEmailDialog(true);
                              }}
                            >
                              {/* Gradient border overlay */}
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex-1 space-y-3">
                                  {/* Header with icons and badges */}
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-1">
                                      {getThreatIcon(email.threat_level)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors duration-300">
                                        {email.subject}
                                      </h3>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      {email.threat_level && (
                                        <Badge 
                                          variant={getThreatBadgeVariant(email.threat_level)}
                                          className="text-xs px-3 py-1.5 font-semibold shadow-sm"
                                        >
                                          {email.threat_level.toUpperCase()}
                                        </Badge>
                                      )}
                                      {email.classification && (
                                        <Badge 
                                          variant="outline" 
                                          className="border-primary/40 text-primary text-xs px-3 py-1.5 font-medium bg-primary/5 shadow-sm"
                                        >
                                          {email.classification}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Email metadata */}
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-primary font-semibold">From:</span>
                                      <span className="truncate max-w-[200px]">{email.sender}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-primary font-semibold">Date:</span>
                                      <span>{new Date(email.received_date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Keywords tags */}
                                  {email.keywords && email.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {email.keywords.slice(0, 3).map((keyword, keywordIndex) => (
                                        <span
                                          key={keywordIndex}
                                          className="inline-flex items-center bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-3 py-1.5 text-xs rounded-full border border-primary/30 font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                      {email.keywords.length > 3 && (
                                        <span className="inline-flex items-center bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary px-3 py-1.5 text-xs rounded-full border border-secondary/30 font-medium shadow-sm">
                                          +{email.keywords.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Confidence score */}
                                {email.confidence && (
                                  <div className="text-right ml-6 flex-shrink-0">
                                    <div className="relative">
                                      <div className="text-2xl font-bold text-primary bg-gradient-to-b from-primary to-primary/70 bg-clip-text text-transparent">
                                        {Math.round(email.confidence * 100)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                        CONFIDENCE
                                      </div>
                                      {/* Confidence indicator bar */}
                                      <div className="mt-2 w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                          style={{ width: `${Math.round(email.confidence * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Hover indicator */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
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