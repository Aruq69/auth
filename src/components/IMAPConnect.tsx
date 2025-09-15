import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Shield, Eye, Database, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IMAPConnectProps {
  onConnected: () => void;
}

const EMAIL_PROVIDERS = [
  { value: 'gmail.com', label: 'Gmail', requiresAppPassword: true },
  { value: 'outlook.com', label: 'Outlook.com', requiresAppPassword: false },
  { value: 'hotmail.com', label: 'Hotmail', requiresAppPassword: false },
  { value: 'yahoo.com', label: 'Yahoo Mail', requiresAppPassword: true },
  { value: 'icloud.com', label: 'iCloud Mail', requiresAppPassword: true },
];

export default function IMAPConnect({ onConnected }: IMAPConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provider, setProvider] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const connectEmail = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect your email account.",
        variant: "destructive",
      });
      return;
    }

    if (!email || !password || !provider) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    toast({
      title: "Connecting...",
      description: "Connecting to your email account via IMAP...",
    });

    try {
      
      const { data, error } = await supabase.functions.invoke("fetch-imap-emails", {
        body: { 
          user_id: user.id,
          email,
          password,
          provider 
        },
      });

      

      if (error) {
        console.error("❌ IMAP function error:", error);
        toast({
          title: "Connection failed",
          description: error.message || "Failed to connect to email account",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        console.error("❌ IMAP returned error:", data.error);
        toast({
          title: "Email connection failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      
      const emailCount = data?.total || 0;
      
      if (emailCount === 0) {
        toast({
          title: "Connected but no emails found",
          description: `Connected to ${data?.provider || 'your account'} but found no recent emails.`,
        });
      } else {
        toast({
          title: "Email connected successfully!",
          description: `Analyzed ${emailCount} emails from ${data?.provider || 'your account'}`,
        });
      }

      onConnected();
      
    } catch (error) {
      console.error("🚨 IMAP connection error:", error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect email account",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const selectedProvider = EMAIL_PROVIDERS.find(p => p.value === provider);

  return (
    <Card className="bg-gradient-to-br from-card via-card to-muted/20 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Connect Email Account</CardTitle>
        <CardDescription>
          Connect any email provider using secure IMAP protocol
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-6">
          <div className="border border-border/20 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
            <div className="relative mb-3">
              <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Universal</h3>
            <p className="text-xs text-muted-foreground">Works with any provider</p>
          </div>
          <div className="border border-border/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
            <div className="relative mb-3">
              <div className="p-3 rounded-full bg-blue-500/20 w-fit mx-auto">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">AI Analysis</h3>
            <p className="text-xs text-muted-foreground">Real-time detection</p>
          </div>
          <div className="border border-border/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
            <div className="relative mb-3">
              <div className="p-3 rounded-full bg-purple-500/20 w-fit mx-auto">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Secure</h3>
            <p className="text-xs text-muted-foreground">Read-only access</p>
          </div>
          <div className="border border-border/20 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent backdrop-blur-sm rounded-lg p-4 text-center hover:scale-105 transition-all duration-300">
            <div className="relative mb-3">
              <div className="p-3 rounded-full bg-teal-500/20 w-fit mx-auto">
                <Database className="h-6 w-6 text-teal-500" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-teal-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">ML Engine</h3>
            <p className="text-xs text-muted-foreground">Adaptive learning</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="provider">Email Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your email provider" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">
              {selectedProvider?.requiresAppPassword ? "App Password" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={selectedProvider?.requiresAppPassword ? "App-specific password" : "Your email password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {selectedProvider?.requiresAppPassword && (
              <div className="flex items-start mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                <Info className="h-3 w-3 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-blue-700 dark:text-blue-300">
                  {provider === 'gmail.com' && "Enable 2FA and generate an app password in your Google Account settings."}
                  {provider === 'yahoo.com' && "Generate an app password in your Yahoo Account Security settings."}
                  {provider === 'icloud.com' && "Generate an app-specific password in your Apple ID settings."}
                </p>
              </div>
            )}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              size="sm" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl" 
              disabled={isConnecting || !email || !password || !provider}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Connect Account
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <AlertDialogTitle className="text-xl">IMAP Connection</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                Your credentials will be used only to read emails for security analysis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 my-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Read-only access</h4>
                    <p className="text-xs text-muted-foreground">We can only read your emails, not send or delete</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Credentials not stored</h4>
                    <p className="text-xs text-muted-foreground">Your password is used once and not saved</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">AI analysis only</h4>
                    <p className="text-xs text-muted-foreground">Emails analyzed for security threats only</p>
                  </div>
                </div>
              </div>
            </div>
            
            <AlertDialogFooter className="flex space-x-2">
              <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={connectEmail}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Shield className="mr-2 h-4 w-4" />
                Connect Securely
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}