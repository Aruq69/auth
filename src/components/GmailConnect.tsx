import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GmailConnectProps {
  onConnected: () => void;
}

const GmailConnect = ({ onConnected }: GmailConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const connectGmail = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect your Gmail account.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Check if we have the Google Client ID configured
      const { data: configCheck } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url', userId: user.id },
      });

      if (configCheck?.auth_url) {
        // Redirect to the properly configured Google OAuth URL
        window.location.href = configCheck.auth_url;
      } else {
        toast({
          title: "Configuration needed",
          description: "Google OAuth is not properly configured. Please contact support.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Gmail connection error:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Connect Gmail Account</span>
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to analyze real emails for security threats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-primary">Important Notice:</h4>
            <p className="text-sm text-muted-foreground">
              Gmail integration requires Google OAuth configuration. If you see a 403 error, 
              it means the Google Client ID needs to be properly set up in the system.
              We only request read-only access to analyze your emails for security threats.
            </p>
          </div>
          
          <Button 
            onClick={connectGmail}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Connect Gmail Account
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            You'll be redirected to Google to authorize access
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GmailConnect;