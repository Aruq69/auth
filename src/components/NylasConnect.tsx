import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Shield, Eye, Database, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface NylasConnectProps {
  onConnected: () => void;
}

export default function NylasConnect({ onConnected }: NylasConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
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

    setIsConnecting(true);
    try {
      console.log("🚀 Initiating Nylas email connection...");
      
      const { data, error } = await supabase.functions.invoke("nylas-auth", {
        body: { action: "get_auth_url" },
      });

      if (error) {
        console.error("❌ Failed to get auth URL:", error);
        throw new Error(error.message);
      }

      if (data?.error) {
        console.error("❌ Auth URL error:", data.error);
        throw new Error(data.error);
      }

      console.log("✅ Redirecting to Nylas OAuth...");
      window.location.href = data.auth_url;
      
    } catch (error) {
      console.error("🚨 Connection error:", error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to initiate email connection",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-muted/20 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Connect Email Account</CardTitle>
        <CardDescription>
          Secure your inbox with AI-powered threat detection
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-muted/30 border border-muted">
            <Shield className="h-6 w-6 text-green-500" />
            <h4 className="text-xs font-medium">Multi-Provider</h4>
            <p className="text-xs text-muted-foreground">Gmail, Outlook, Yahoo</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-muted/30 border border-muted">
            <Eye className="h-6 w-6 text-blue-500" />
            <h4 className="text-xs font-medium">AI Analysis</h4>
            <p className="text-xs text-muted-foreground">Real-time detection</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-muted/30 border border-muted">
            <Database className="h-6 w-6 text-purple-500" />
            <h4 className="text-xs font-medium">Secure Storage</h4>
            <p className="text-xs text-muted-foreground">Encrypted data</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              size="sm" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl" 
              disabled={isConnecting}
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
              <AlertDialogTitle className="text-xl">Email Connection Permissions</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                Mail Guard requires read-only access to analyze your emails for security threats.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 my-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">What we access</h4>
                    <p className="text-xs text-muted-foreground">Email messages, headers, and sender information</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Read-only access</h4>
                    <p className="text-xs text-muted-foreground">We cannot send, delete, or modify your emails</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Secure & encrypted</h4>
                    <p className="text-xs text-muted-foreground">All data is encrypted and securely stored</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Revoke anytime</h4>
                    <p className="text-xs text-muted-foreground">You can disconnect your account at any time</p>
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
                Authorize Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}