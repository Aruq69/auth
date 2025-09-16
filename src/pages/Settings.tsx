import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Settings, User, ArrowLeft, CheckCircle, XCircle, Loader2, Calendar, Mail, Key, AlertTriangle, Trash2, Plus } from "lucide-react";
import MFASetup from "@/components/MFASetup";

const SettingsPage = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      checkMfaStatus();
    }
  }, [user, authLoading, navigate]);

  const checkMfaStatus = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error fetching MFA factors:', error);
        return;
      }
      
      const verifiedFactors = data?.totp?.filter(factor => factor.status === 'verified') || [];
      setFactors(verifiedFactors);
      setMfaEnabled(verifiedFactors.length > 0);
      
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled for your account.",
      });
      
      await checkMfaStatus();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable MFA. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (showMfaSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Button
            variant="outline"
            onClick={() => setShowMfaSetup(false)}
            className="mb-6 border-border/30 bg-background/80 backdrop-blur-sm hover:bg-background/90 hover:border-primary/50 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          
          <MFASetup 
            onComplete={() => {
              setShowMfaSetup(false);
              checkMfaStatus();
            }}
            onSkip={() => setShowMfaSetup(false)}
            showSkipOption={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 animate-fade-in">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-border/30 bg-background/80 backdrop-blur-sm hover:bg-background/90 hover:border-primary/50 transition-all duration-300 hover-scale"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Account Settings
                  </h1>
                  <p className="text-sm text-muted-foreground">Manage your security and preferences</p>
                </div>
              </div>
            </div>
            
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 animate-pulse">
              <Shield className="w-3 h-3 mr-1" />
              Secure Account
            </Badge>
          </div>

          <div className="grid gap-6 lg:gap-8">
            {/* User Profile Card */}
            <Card className="border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-scale-in">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-semibold">Profile Information</CardTitle>
                    <CardDescription className="text-muted-foreground">Your account details and status</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    </div>
                    <p className="text-foreground font-medium bg-muted/30 px-3 py-2 rounded-lg border">{user?.email}</p>
                  </div>
                  
                  <div className="space-y-2 group">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    </div>
                    <p className="text-foreground font-medium bg-muted/30 px-3 py-2 rounded-lg border">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">Email Verified</span>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings Card */}
            <Card className="border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-scale-in [animation-delay:100ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                      <Shield className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold">Security Center</CardTitle>
                      <CardDescription>Multi-factor authentication and security settings</CardDescription>
                    </div>
                  </div>
                  
                  {mfaEnabled && (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20 transition-colors">
                      <Key className="w-3 h-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Checking security status...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                      <div className="flex items-center space-x-3">
                        {mfaEnabled ? (
                          <>
                            <div className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-emerald-700">MFA Enabled</span>
                              <p className="text-sm text-muted-foreground">Your account is secured with 2FA</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30">
                              <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-red-700">MFA Disabled</span>
                              <p className="text-sm text-muted-foreground">Enable 2FA for enhanced security</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {!mfaEnabled && (
                        <Button
                          onClick={() => setShowMfaSetup(true)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Enable MFA
                        </Button>
                      )}
                    </div>

                    {mfaEnabled ? (
                      <div className="space-y-4">
                        <Alert className="border-emerald-200 bg-emerald-50/50">
                          <Shield className="h-4 w-4 text-emerald-600" />
                          <AlertDescription className="text-emerald-800">
                            Excellent! Your account is protected with multi-factor authentication.
                            You have <strong>{factors.length}</strong> authenticator{factors.length !== 1 ? 's' : ''} configured.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-3">
                          {factors.map((factor, index) => (
                            <div key={factor.id} className="flex items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-all duration-300 group">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                  <Key className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{factor.friendly_name || `Authenticator ${index + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">TOTP Authenticator App</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisableMfa(factor.id)}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="border-red-200 bg-red-50/50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Security Risk:</strong> Your account is not protected with multi-factor authentication. 
                          Enable MFA now to secure your email data and prevent unauthorized access.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-slate-200/50 bg-gradient-to-br from-slate-50/50 to-slate-100/30 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-scale-in [animation-delay:200ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-slate-500/20 to-gray-500/20 border border-slate-500/30">
                    <AlertTriangle className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-700">Danger Zone</CardTitle>
                    <CardDescription className="text-slate-600/80">
                      Irreversible and destructive actions that affect your account
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-slate-800">Sign Out</h4>
                      <p className="text-sm text-slate-600">End your current session and return to login</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300 hover-scale"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-slate-500/80 bg-slate-50/60 p-3 rounded-lg border border-slate-150">
                  ⚠️ <strong>Note:</strong> Signing out will end your current session. You'll need to log in again to access Mail Guard.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;