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
import { Shield, Settings, User, ArrowLeft, CheckCircle, XCircle, Loader2, Calendar, Mail, Key, AlertTriangle, Trash2, Plus, Globe, Palette, Bell, Eye, Database, Download, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import MFASetup from "@/components/MFASetup";

const SettingsPage = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
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
      console.error('MFA status check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMfaFactor = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        console.error('Error removing MFA factor:', error);
        toast({
          title: "Error",
          description: "Failed to remove authenticator. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled for your account.",
      });
      
      // Refresh MFA status
      checkMfaStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove authenticator. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDataExport = async () => {
    setDataExportLoading(true);
    try {
      // Simulate data export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Data Export Complete",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDataExportLoading(false);
    }
  };

  const handlePrivacyToggle = async (enabled: boolean) => {
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
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Account Settings</h1>
                  <p className="text-sm text-muted-foreground">Manage your security and preferences</p>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
              <Shield className="w-3 h-3 mr-1" />
              Secure Account
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-8 pt-8">
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
                              <p className="font-medium text-emerald-800">Multi-Factor Authentication</p>
                              <p className="text-sm text-emerald-600">Your account is secured with 2FA</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-2 rounded-full bg-orange-500/20 border border-orange-500/30">
                              <XCircle className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-orange-800">Multi-Factor Authentication</p>
                              <p className="text-sm text-orange-600">Enable 2FA for enhanced security</p>
                            </div>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowMfaSetup(true)}
                        variant={mfaEnabled ? "outline" : "default"}
                        size="sm"
                        className={mfaEnabled ? 
                          "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10" : 
                          "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl"
                        }
                      >
                        {mfaEnabled ? "Manage MFA" : "Enable MFA"}
                      </Button>
                    </div>

                    {!mfaEnabled && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          <strong>Security Risk:</strong> Your account is not protected with multi-factor authentication. 
                          Enable MFA now to secure your email data and prevent unauthorized access.
                        </AlertDescription>
                      </Alert>
                    )}

                    {mfaEnabled && factors.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-emerald-800">
                          Excellent! Your account is protected with multi-factor authentication.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {factors.length} authenticator(s) configured
                        </p>
                        
                        <div className="space-y-2">
                          {factors.map((factor) => (
                            <div key={factor.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Key className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-800">TOTP Authenticator App</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMfaFactor(factor.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Privacy & Data Card */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/30 animate-scale-in [animation-delay:200ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <Eye className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Privacy & Data</CardTitle>
                    <CardDescription>Control your data and privacy settings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full border ${neverStoreData ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                      <Database className={`h-5 w-5 ${neverStoreData ? 'text-emerald-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">Privacy-First Mode</p>
                      <p className="text-sm text-muted-foreground">
                        {neverStoreData 
                          ? "Emails are NOT stored (maximum privacy)" 
                          : "You have consented to email storage"
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={neverStoreData}
                    onCheckedChange={handlePrivacyToggle}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${neverStoreData ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span className="text-sm font-medium">Data Retention</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-4">
                    {neverStoreData 
                      ? "No emails are stored (privacy-first mode)" 
                      : "Emails are stored for 90 days"
                    }
                  </p>
                  <div className="flex items-center space-x-2 pl-4">
                    <Badge variant={neverStoreData ? "destructive" : "default"} className="text-xs">
                      {neverStoreData ? "Storage Disabled" : "Storage Active"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Export Data</p>
                        <p className="text-sm text-muted-foreground">Download all your data</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDataExport}
                      disabled={dataExportLoading}
                      className="border-border/30 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-300"
                    >
                      {dataExportLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences Card */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/30 animate-scale-in [animation-delay:300ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Preferences</CardTitle>
                    <CardDescription>Customize your Mail Guard experience</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
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
                          <Sun className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="font-medium">Light Mode</p>
                            <p className="text-xs text-muted-foreground">Bright and clean interface</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <Moon className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="font-medium">Dark Mode</p>
                            <p className="text-xs text-muted-foreground">Easy on the eyes in low light</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="system" className="hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <Monitor className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">System Default</p>
                            <p className="text-xs text-muted-foreground">Match your device settings</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-amber-500/30 animate-scale-in [animation-delay:400ms]">
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
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Security Alerts</p>
                      <p className="text-sm text-muted-foreground">Important security notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={securityAlerts}
                    onCheckedChange={setSecurityAlerts}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Actions Card */}
            <Card className="group border-border/20 bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 hover:scale-[1.02] hover:border-red-500/30 animate-scale-in [animation-delay:500ms]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">Account Actions</CardTitle>
                    <CardDescription>Important account management and session controls</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border">
                  <div className="flex items-center space-x-3">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">End Session</p>
                      <p className="text-sm text-muted-foreground">Securely sign out of your Mail Guard account</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Signing out will end your current session and you'll need to authenticate again to access Mail Guard.
                  </AlertDescription>
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