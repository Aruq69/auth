import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const OutlookCallback = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(`Authentication failed: ${errorDescription || errorParam}`);
          setLoading(false);
          return;
        }

        if (!code) {
          setError('No authorization code received from Outlook');
          setLoading(false);
          return;
        }

        if (!user) {
          setError('User not authenticated. Please sign in first.');
          setLoading(false);
          return;
        }

        console.log('Exchanging authorization code for access token...');

        const { data, error: exchangeError } = await supabase.functions.invoke('outlook-auth', {
          body: {
            action: 'exchange_token',
            code: code,
            user_id: user.id
          }
        });

        if (exchangeError) {
          console.error('Token exchange error:', exchangeError);
          setError(`Failed to exchange token: ${exchangeError.message}`);
          setLoading(false);
          return;
        }

        if (data.error) {
          console.error('Exchange response error:', data.error);
          setError(`Failed to connect Outlook: ${data.error}`);
          setLoading(false);
          return;
        }

        console.log('Outlook connected successfully');
        setSuccess(true);
        setLoading(false);
        
        toast({
          title: "Outlook Connected!",
          description: "Your Outlook account has been successfully connected to Mail Guard.",
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('Callback error:', error);
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {success && <CheckCircle className="h-5 w-5 text-green-600" />}
            {error && <AlertTriangle className="h-5 w-5 text-red-600" />}
            
            {loading && "Connecting Outlook..."}
            {success && "Connected Successfully!"}
            {error && "Connection Failed"}
          </CardTitle>
          <CardDescription>
            {loading && "Processing your Outlook authentication..."}
            {success && "Redirecting you to the dashboard..."}
            {error && "There was an issue connecting your Outlook account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {loading && (
            <p className="text-muted-foreground text-sm">
              Please wait while we securely connect your Outlook account.
            </p>
          )}
          
          {success && (
            <p className="text-green-600 text-sm">
              Your Outlook account is now connected to Mail Guard. You can now analyze your emails for security threats.
            </p>
          )}
          
          {error && (
            <div className="space-y-4">
              <p className="text-red-600 text-sm break-words">
                {error}
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                variant="outline"
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OutlookCallback;