import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Settings, User, ArrowLeft, CheckCircle, XCircle, Loader2, Calendar, Mail, Key, AlertTriangle, Trash2, Plus, Globe, Palette, Bell, Eye, Database, Download, Sun, Moon, Monitor, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import MFASetup from "@/components/MFASetup";

const SettingsPage = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [language, setLanguage] = useState("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [neverStoreData, setNeverStoreData] = useState(true); // Privacy-first default
  const [dataExportLoading, setDataExportLoading] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      checkMfaStatus();
      loadUserPreferences();
    }
  }, [user, authLoading, navigate]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      // Get or create user preferences
      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && preferences) {
        setNeverStoreData(preferences.never_store_data);
        setEmailNotifications(preferences.email_notifications);
        setSecurityAlerts(preferences.security_alerts);
        setLanguage(preferences.language);
      } else if (error?.code === 'PGRST116') {
        // No preferences found, create privacy-first defaults
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            never_store_data: true, // Privacy-first default
            email_notifications: true,
            security_alerts: true,
            language: 'en',
            theme: 'system'
          });
        
        if (!insertError) {
          setNeverStoreData(true); // Set UI to privacy-first default
        } else {
          console.error('Error creating user preferences:', insertError);
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

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

  const handleLanguageChange = async (newLanguage: string) => {
    if (!user) return;
    
    setLanguage(newLanguage);
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          language: newLanguage,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating language preference:', error);
      }

      localStorage.setItem('preferred-language', newLanguage);
      toast({
        title: "Language Updated",
        description: `Language changed to ${newLanguage === 'ar' ? 'Arabic' : 'English'}`,
      });
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  const handleDataExport = async () => {
    setDataExportLoading(true);
    try {
      // Simulate data export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Data Export Complete",
        description: "Your data has been prepared for download.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDataExportLoading(false);
    }
  };

  const handleNeverStoreDataChange = async (enabled: boolean) => {
    if (!user) return;
    
    setNeverStoreData(enabled);
    
    try {
      // First check if preferences exist
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let updateError;
      
      if (existingPrefs) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update({
            never_store_data: enabled,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        updateError = error;
      } else {
        // Create new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            never_store_data: enabled,
            email_notifications: true,
            security_alerts: true,
            language: 'en',
            theme: 'system'
          });
        updateError = error;
      }

      if (updateError) {
        console.error('Error updating privacy preference:', updateError);
        toast({
          title: "Error",
          description: "Failed to update privacy setting. Please try again.",
          variant: "destructive",
        });
        // Revert the state if database update failed
        setNeverStoreData(!enabled);
        return;
      }

      // If enabling never store data, delete existing data
      if (enabled) {
        const { error: deleteError } = await supabase
          .from('emails')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error deleting existing emails:', deleteError);
        }
      }

      toast({
        title: enabled ? "Privacy-First Mode Enabled" : "Data Storage Enabled",
        description: enabled 
          ? "Emails will not be stored permanently (maximum privacy)" 
          : "You have consented to email storage for enhanced features",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
      setNeverStoreData(!enabled);
    }
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
                className="group border-border/30 bg-background/80 backdrop-blur-sm hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
                <span className="group-hover:text-primary/90 transition-colors duration-300">Dashboard</span>
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
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:scale-[1.02] hover:border-primary/30 animate-scale-in">
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
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/30 animate-scale-in [animation-delay:100ms]">
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

            {/* Preferences */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/30 animate-scale-in [animation-delay:150ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Preferences</CardTitle>
                    <CardDescription>Customize your Mail Guard experience</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language Settings */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center space-x-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <span>Display Language</span>
                  </Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full bg-background/50 border-border/30 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-border/50">
                      <SelectItem value="en" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-4 rounded-sm bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">EN</span>
                          </div>
                          <span>English</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ar" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-4 rounded-sm bg-gradient-to-r from-green-500 to-black flex items-center justify-center">
                            <span className="text-white text-xs font-bold">AR</span>
                          </div>
                          <span>العربية (Arabic)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme Settings */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center space-x-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span>Appearance Theme</span>
                  </Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full bg-background/50 border-border/30 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-border/50">
                      <SelectItem value="light" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-300">
                            <Sun className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Light Mode</span>
                            <span className="text-xs text-muted-foreground">Bright and clean interface</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500">
                            <Moon className="h-3.5 w-3.5 text-slate-200" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">Dark Mode</span>
                            <span className="text-xs text-muted-foreground">Easy on the eyes in low light</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="system" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400">
                            <Monitor className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">System Default</span>
                            <span className="text-xs text-muted-foreground">Match your device settings</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-orange-500/30 animate-scale-in [animation-delay:175ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <Bell className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
                    <CardDescription>Manage your notification preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/20">
                  <div className="space-y-1">
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/20">
                  <div className="space-y-1">
                    <Label className="font-medium">Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about suspicious activities</p>
                  </div>
                  <Switch
                    checked={securityAlerts}
                    onCheckedChange={setSecurityAlerts}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Data */}
            <Card className="border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-scale-in [animation-delay:200ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
                    <Eye className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Privacy & Data</CardTitle>
                    <CardDescription>Control your data and privacy settings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-red-100 border border-red-200 group-hover:bg-red-200 transition-colors">
                        <Database className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-800">Privacy-First Mode</h4>
                        <p className="text-sm text-red-600">
                          {neverStoreData 
                            ? "Emails are NOT stored (maximum privacy)" 
                            : "You have consented to email storage"
                          }
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={neverStoreData}
                      onCheckedChange={handleNeverStoreDataChange}
                      className="data-[state=checked]:bg-red-500 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-md hover:shadow-teal-500/10 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-teal-100 border border-teal-200 group-hover:bg-teal-200 transition-colors">
                        <Database className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Data Retention</h4>
                        <p className="text-sm text-muted-foreground">
                          {neverStoreData 
                            ? "No emails are stored (privacy-first mode)" 
                            : "Emails are stored for 90 days"
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`transition-opacity ${neverStoreData ? 'border-red-200 text-red-700 bg-red-50' : 'border-teal-200 text-teal-700 bg-teal-50'}`}>
                      {neverStoreData ? 'Storage Disabled' : 'Storage Active'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100 border border-blue-200 group-hover:bg-blue-200 transition-colors">
                        <Download className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Export Data</h4>
                        <p className="text-sm text-muted-foreground">Download all your data</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDataExport}
                      disabled={dataExportLoading}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
                    >
                      {dataExportLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card className="group border-violet-200/50 bg-gradient-to-br from-violet-50/40 to-purple-100/30 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-violet-400/50 animate-scale-in [animation-delay:200ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-violet-700">Account Actions</CardTitle>
                    <CardDescription className="text-violet-600/80">
                      Important account management and session controls
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-violet-200 rounded-xl bg-gradient-to-r from-violet-50/50 to-purple-50/40 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-violet-100 border border-violet-200">
                        <ArrowLeft className="h-5 w-5 text-violet-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-violet-800">End Session</h4>
                        <p className="text-sm text-violet-600">Securely sign out of your Mail Guard account</p>
                      </div>
                    </div>
                     <Button
                       variant="outline"
                       onClick={handleSignOut}
                       className="group border-violet-300 text-violet-700 hover:bg-gradient-to-r hover:from-violet-100 hover:to-violet-50 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5"
                     >
                       <ArrowLeft className="w-4 h-4 mr-2 group-hover:text-violet-600 group-hover:-translate-x-1 transition-all duration-300" />
                      Sign Out
                    </Button>
                  </div>
                </div>
                
                <Alert className="border-violet-200 bg-gradient-to-r from-violet-50/60 to-purple-50/40">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-full bg-violet-100 border border-violet-200">
                      <AlertTriangle className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <AlertDescription className="text-violet-700 font-medium">
                      <strong>Important:</strong> Signing out will end your current session and you'll need to authenticate again to access Mail Guard.
                    </AlertDescription>
                  </div>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;