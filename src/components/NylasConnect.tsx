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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Connect Your Email Account</CardTitle>
        <CardDescription className="text-lg">
          Secure your inbox with AI-powered threat detection across multiple email providers
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-muted/30 border">
            <Shield className="h-8 w-8 text-green-500" />
            <h3 className="font-semibold">Multi-Provider Support</h3>
            <p className="text-sm text-muted-foreground">Gmail, Outlook, Yahoo, and more</p>
          </div>
          <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-muted/30 border">
            <Eye className="h-8 w-8 text-blue-500" />
            <h3 className="font-semibold">Real-time Analysis</h3>
            <p className="text-sm text-muted-foreground">AI-powered threat detection</p>
          </div>
          <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-muted/30 border">
            <Database className="h-8 w-8 text-purple-500" />
            <h3 className="font-semibold">Secure Storage</h3>
            <p className="text-sm text-muted-foreground">Encrypted data protection</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              size="lg" 
              className="w-full" 
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
                  Connect Email Account
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Email Account Permissions</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  To perform security analysis, Mail Guard needs <strong>read-only access</strong> to your email account.
                </p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">What we'll access:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Email messages and metadata</li>
                    <li>• Sender information and headers</li>
                    <li>• Message content for threat analysis</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Privacy & Security:</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Read-only access (we cannot send or delete emails)</li>
                    <li>• Data encrypted and securely stored</li>
                    <li>• Analysis performed by AI for threat detection only</li>
                    <li>• You can revoke access anytime</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={connectEmail}>
                Continue to Email Provider
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}