import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Gmail connection...');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) {
        console.log('No user found, redirecting to auth...');
        navigate('/auth');
        return;
      }

      console.log('User found:', user.id, 'Processing Gmail callback...');

      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        console.log('Callback params:', { 
          code: code ? code.substring(0, 10) + '...' : null, 
          error,
          hasUser: !!user,
          userId: user?.id 
        });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('Missing authorization code');
        }

        setMessage('Exchanging authorization code for access token...');
        console.log('Attempting token exchange with code:', code.substring(0, 10) + '...');
        console.log('User ID:', user.id);

        // Exchange the code for access token
        const { data, error: exchangeError } = await supabase.functions.invoke('gmail-auth', {
          body: { 
            action: 'exchange_token',
            code,
            user_id: user.id
          },
        });

        console.log('Exchange response:', { data, error: exchangeError });

        if (exchangeError) {
          throw new Error(exchangeError.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setStatus('success');
        setMessage('Gmail connected successfully!');
        
        toast({
          title: "Gmail Connected",
          description: "Your Gmail account has been connected successfully. Redirecting...",
        });

        // Redirect to main page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('Gmail callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect Gmail');
        
        toast({
          title: "Connection Failed",
          description: "Failed to connect Gmail. Please try again.",
          variant: "destructive",
        });

        // Redirect to main page after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="p-8 text-center space-y-6 max-w-md border rounded-lg bg-card">
          <div className="relative">
            <Shield className="h-16 w-16 text-primary mx-auto" />
            <div className="absolute inset-0 h-16 w-16 border border-primary/30 rounded-full animate-ping mx-auto" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              GMAIL CONNECTION
            </h1>
            
            <div className="flex items-center justify-center space-x-2">
              {status === 'loading' && (
                <>
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-primary">Processing...</span>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-accent">Success!</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Error</span>
                </>
              )}
            </div>
            
            <p className="text-muted-foreground text-sm">
              {message}
            </p>
            
            {status === 'success' && (
              <p className="text-xs text-muted-foreground">
                Redirecting to dashboard in a few seconds...
              </p>
            )}
            
            {status === 'error' && (
              <p className="text-xs text-muted-foreground">
                Redirecting back in a few seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GmailCallback;