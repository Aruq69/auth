import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Mail, AlertTriangle, CheckCircle, Clock, Search, User, Zap, Activity, Eye, Lock, LogOut, Plus, Brain, Bot, Cpu, Target, Radar, ScanLine, Database, ShieldX, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmailSubmissionForm from "@/components/EmailSubmissionForm";
import FloatingChatButton from "@/components/FloatingChatButton";
import FeedbackSystem from "@/components/FeedbackSystem";
import UserOnboarding from "@/components/UserOnboarding";

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  threat_type: string | null; // Add new threat_type field
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
  const [threatFilter, setThreatFilter] = useState<string | null>(null); // Add threat level filter
  const [gmailConnected, setGmailConnected] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false); // Add sign out confirmation dialog
  const [showClearEmailsDialog, setShowClearEmailsDialog] = useState(false); // Add clear emails confirmation dialog
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
        .limit(100);
      
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
        // Get current email count to see how many were actually new
        const { data: currentEmails } = await supabase
          .from('emails')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
          
        const currentCount = currentEmails?.length || 0;
        
        toast({
          title: "Gmail sync completed",
          description: `Processed ${data.total} emails. Total emails in database: ${currentCount}`,
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
      // Only clear emails, keep Gmail connection active
      await supabase
        .from('emails')
        .delete()
        .eq('user_id', user.id);
      
      toast({
        title: "Data Cleared",
        description: "All email data has been cleared. Gmail connection remains active.",
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
      case 'high': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 cursor-pointer">
            <AlertTriangle className="h-3 w-3 text-white" />
          </div>
        );
      case 'medium': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 cursor-pointer">
            <Clock className="h-3 w-3 text-white" />
          </div>
        );
      case 'low': 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 cursor-pointer">
            <CheckCircle className="h-3 w-3 text-white" />
          </div>
        );
      default: 
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-500 hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 cursor-pointer">
            <Shield className="h-3 w-3 text-white" />
          </div>
        );
    }
  };

  const getThreatHoverEffect = (threatLevel: string | null) => {
    switch (threatLevel?.toLowerCase()) {
      case 'high': 
        return 'hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:border-red-500/50';
      case 'medium': 
        return 'hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:border-yellow-500/50';
      case 'low': 
        return 'hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:border-green-500/50';
      default: 
        return 'hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:border-gray-500/50';
    }
  };

  const filteredEmails = emails.filter(email => {
    // Apply search filter
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply threat level filter
    const matchesThreatFilter = !threatFilter || 
      (threatFilter === 'all') ||
      (threatFilter === 'high' && email.threat_level === 'high') ||
      (threatFilter === 'medium' && email.threat_level === 'medium') ||
      (threatFilter === 'low' && email.threat_level === 'low');
    
    return matchesSearch && matchesThreatFilter;
  });

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 py-4 sm:py-6">
        {/* Mobile-optimized Header with Shield */}
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Responsive Shield Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 aspect-square rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="h-12 w-12 sm:h-16 md:h-20 lg:h-24 text-primary" />
              </div>
              <div className="absolute inset-0 w-20 h-20 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border border-primary/30 animate-ping" />
              <div className="absolute inset-1 sm:inset-2 w-18 h-18 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full bg-primary/5 animate-pulse [animation-duration:3s]" />
            </div>
          </div>
          
          {/* Responsive Title and Description */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              MAIL GUARD
            </h1>
            <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Advanced Email Security & Threat Analysis System
            </p>
            {user && (
              <div className="flex items-center justify-center space-x-2 mt-3 sm:mt-4">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm text-primary font-medium truncate max-w-[250px]">{user.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile-optimized Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:space-x-2">
            {gmailConnected && (
              <Button 
                onClick={fetchGmailEmails} 
                disabled={loading} 
                variant="outline" 
                className="w-full sm:w-auto border-primary/30 hover:border-primary/50 hover-button text-xs sm:text-sm"
                size="sm"
              >
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Sync Gmail
              </Button>
            )}
            <Button 
              onClick={fetchEmails} 
              disabled={loading} 
              variant="outline" 
              className="w-full sm:w-auto border-primary/30 hover:border-primary/50 hover-button text-xs sm:text-sm"
              size="sm"
            >
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Refresh
            </Button>
            {gmailConnected && (
              <AlertDialog open={showClearEmailsDialog} onOpenChange={setShowClearEmailsDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500 hover:text-white transition-all duration-300 hover-button text-xs sm:text-sm"
                    size="sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Clear Emails
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border border-border/50 backdrop-blur-md shadow-2xl animate-scale-in">
                  <AlertDialogHeader className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-orange-500 animate-pulse" />
                    </div>
                    <AlertDialogTitle className="text-center text-xl font-semibold">
                      Clear All Emails?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-muted-foreground">
                      This action will permanently delete all email data from our system. Your Gmail connection will remain active, but all analyzed emails will be removed.
                      <br />
                      <span className="font-medium text-orange-500">This action cannot be undone.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="border-border/50 hover:bg-muted">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleUnsync}
                      className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Emails
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button 
              onClick={() => setShowSignOutDialog(true)} 
              variant="outline" 
              className="w-full sm:w-auto border-muted-foreground/30 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover-button text-xs sm:text-sm"
              size="sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Sign Out
            </Button>
        </div>


        {/* Mobile-optimized Threat Level Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card 
            className={`border-border/20 bg-card/50 backdrop-blur-sm hover-card cursor-pointer transition-all duration-300 hover:scale-105 ${threatFilter === 'all' ? 'ring-2 ring-primary/50 bg-primary/10' : ''}`}
            onClick={() => setThreatFilter(threatFilter === 'all' ? null : 'all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">TOTAL EMAILS</CardTitle>
              <Mail className="h-2 w-2 sm:h-3 sm:w-3 text-primary" />
            </CardHeader>
            <CardContent className="pt-1 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-xl font-bold text-primary">{emails.length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {threatFilter === 'all' ? 'All emails selected' : `Showing ${emails.length} most recent`}
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`threat-high border-border/20 bg-card/50 backdrop-blur-sm hover-card cursor-pointer transition-all duration-300 hover:scale-105 ${threatFilter === 'high' ? 'ring-2 ring-red-500/50 bg-red-500/10' : ''}`}
            onClick={() => setThreatFilter(threatFilter === 'high' ? null : 'high')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">HIGH THREATS</CardTitle>
              <AlertTriangle className="h-2 w-2 sm:h-3 sm:w-3 text-destructive" />
            </CardHeader>
            <CardContent className="pt-1 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-xl font-bold text-destructive">{threatStats.high || 0}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {threatFilter === 'high' ? 'High threats filtered' : 'Critical alerts'}
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`threat-medium border-border/20 bg-card/50 backdrop-blur-sm hover-card cursor-pointer transition-all duration-300 hover:scale-105 ${threatFilter === 'medium' ? 'ring-2 ring-yellow-500/50 bg-yellow-500/10' : ''}`}
            onClick={() => setThreatFilter(threatFilter === 'medium' ? null : 'medium')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">MEDIUM THREATS</CardTitle>
              <Clock className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-500" />
            </CardHeader>
            <CardContent className="pt-1 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-xl font-bold text-yellow-500">{threatStats.medium || 0}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {threatFilter === 'medium' ? 'Medium threats filtered' : 'Under review'}
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`threat-low border-border/20 bg-card/50 backdrop-blur-sm hover-card cursor-pointer transition-all duration-300 hover:scale-105 ${threatFilter === 'low' ? 'ring-2 ring-green-500/50 bg-green-500/10' : ''}`}
            onClick={() => setThreatFilter(threatFilter === 'low' ? null : 'low')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">SAFE EMAILS</CardTitle>
              <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-accent" />
            </CardHeader>
            <CardContent className="pt-1 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-xl font-bold text-accent">{threatStats.low || 0}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {threatFilter === 'low' ? 'Safe emails filtered' : 'Verified clean'}
              </div>
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
                              className={`group relative ${threatClass} p-3 transition-all duration-300 cursor-pointer border border-border/30 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-md rounded-lg hover-card animate-fade-in shadow-sm ${getThreatHoverEffect(email.threat_level)} ${
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
                              
                              <div className="flex items-start justify-between relative z-10 gap-3">
                                <div className="flex-1 min-w-0 space-y-3">
                                  {/* Header with icon and title */}
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-1">
                                      {getThreatIcon(email.threat_level)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                        {email.subject}
                                      </h3>
                                    </div>
                                  </div>
                                  
                                  {/* Badges section - mobile responsive */}
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    {email.threat_level && (
                                      <Badge 
                                        variant={getThreatBadgeVariant(email.threat_level)}
                                        className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 font-semibold shadow-sm shrink-0"
                                      >
                                        {email.threat_level.toUpperCase()}
                                      </Badge>
                                    )}
                                    {email.threat_type && email.threat_type !== 'spam' && (
                                      <Badge 
                                        variant="destructive" 
                                        className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 font-medium bg-red-500/10 border-red-500/30 text-red-600 shadow-sm shrink-0"
                                      >
                                        {email.threat_type.replace(/_/g, ' ').toUpperCase()}
                                      </Badge>
                                    )}
                                    {email.classification && (
                                      <Badge 
                                        variant="outline" 
                                        className="border-primary/40 text-primary text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 font-medium bg-primary/5 shadow-sm shrink-0"
                                      >
                                        {email.classification}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Email metadata - mobile responsive */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-primary font-semibold">From:</span>
                                      <span className="truncate max-w-[150px] sm:max-w-[200px]">{email.sender}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-primary font-semibold">Date:</span>
                                      <span>{new Date(email.received_date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Keywords tags - mobile responsive */}
                                  {email.keywords && email.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 sm:gap-2">
                                      {email.keywords.slice(0, 2).map((keyword, keywordIndex) => (
                                        <span
                                          key={keywordIndex}
                                          className="inline-flex items-center bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full border border-primary/30 font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                      {email.keywords.length > 2 && (
                                        <span className="inline-flex items-center bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full border border-secondary/30 font-medium shadow-sm">
                                          +{email.keywords.length - 2} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Confidence score - mobile responsive */}
                                {email.confidence && (
                                  <div className="text-right flex-shrink-0 self-start">
                                    <div className="relative">
                                      <div className="text-lg sm:text-2xl font-bold text-primary bg-gradient-to-b from-primary to-primary/70 bg-clip-text text-transparent">
                                        {Math.round(email.confidence * 100)}%
                                      </div>
                                      <div className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                        CONFIDENCE
                                      </div>
                                      {/* Confidence indicator bar */}
                                      <div className="mt-1 sm:mt-2 w-12 sm:w-16 h-1 sm:h-1.5 bg-muted/30 rounded-full overflow-hidden">
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

        {/* Feedback System */}
        <FeedbackSystem />

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
                      {selectedEmail.threat_type && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threat Type</label>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600">
                              {selectedEmail.threat_type.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
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

        {/* Sign Out Confirmation Dialog */}
        <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
          <DialogContent className="max-w-md mx-auto border-border/20 bg-card/95 backdrop-blur-lg">
            <DialogHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="p-6 rounded-full bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent border border-red-500/30 backdrop-blur-sm">
                    <ShieldX className="h-16 w-16 text-red-500" />
                  </div>
                  <div className="absolute inset-0 p-6 rounded-full border border-red-500/40 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-red-500/5 animate-pulse [animation-duration:2s]" />
                </div>
              </div>
              
              <DialogTitle className="text-2xl font-bold text-foreground">
                End Security Session?
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                You are about to sign out of Mail Guard. Your email analysis data will remain safe, but you'll need to sign in again to access the system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                onClick={() => setShowSignOutDialog(false)}
                variant="outline"
                className="flex-1 border-primary/30 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
              >
                <Shield className="h-4 w-4 mr-2" />
                Stay Protected
              </Button>
              
              <Button
                onClick={() => {
                  setShowSignOutDialog(false);
                  signOut();
                }}
                variant="outline"
                className="flex-1 border-red-500/30 hover:border-red-500/50 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;