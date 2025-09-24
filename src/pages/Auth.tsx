import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield } from "lucide-react";
import UserOnboarding from "@/components/UserOnboarding";
import MFAChallenge from "@/components/MFAChallenge";

const Auth = () => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { user, needsMfa, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect authenticated users to home page (but only after auth is fully loaded)
  useEffect(() => {
    console.log('Auth: auth state changed', { user: !!user, authLoading, currentPath: window.location.pathname });
    
    // Wait for auth to fully load
    if (authLoading) {
      console.log('Auth: auth still loading, waiting...');
      return;
    }
    
    // Redirect authenticated users with a delay to ensure auth state is stable
    if (user) {
      console.log('Auth: user authenticated, redirecting to home');
      const timer = setTimeout(() => {
        navigate("/");
      }, 500); // Longer delay for OAuth flows
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  // If MFA is required, show the MFA challenge
  if (needsMfa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <MFAChallenge 
          onSuccess={() => navigate("/")}
          onCancel={() => navigate("/auth")}
        />
      </div>
    );
  }

  const handleOutlookSignIn = async () => {
    try {
      setSubmitLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'email'
        }
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Failed to sign in with Outlook. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="p-6 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
                <Shield className="h-16 w-16 text-primary" />
              </div>
              <div className="absolute inset-0 p-6 rounded-full border border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/5 animate-pulse [animation-duration:3s]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mail Guard</h1>
          <p className="text-muted-foreground mt-2">
            Secure your inbox with AI-powered threat detection
          </p>
        </div>

        <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">
              Sign In to Mail Guard
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Access your email security dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="border-destructive/20 mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={handleOutlookSignIn}
              disabled={submitLoading}
              className="group w-full relative overflow-hidden border-border/20 bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-blue-600/10 hover:from-blue-600/20 hover:via-blue-500/10 hover:to-blue-600/20 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
              
              {submitLoading && <Loader2 className="w-4 h-4 mr-3 animate-spin text-blue-500" />}
              
              <div className="relative flex items-center justify-center space-x-3">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500/20 to-blue-600/20 group-hover:from-blue-500/30 group-hover:to-blue-600/30 transition-all duration-300 group-hover:scale-110">
                  <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-500 transition-colors duration-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 12c0-6.627-5.373-12-12-12S-0.5 5.373-0.5 12s5.373 12 12 12 12-5.373 12-12z"/>
                    <path d="M12.5 5.8c3.905 0 7.067 3.162 7.067 7.067 0 3.905-3.162 7.067-7.067 7.067S5.433 16.772 5.433 12.867c0-3.905 3.162-7.067 7.067-7.067z" fill="white"/>
                    <path d="M9.167 9.333h6.666v1.334H9.167V9.333zm0 2h6.666v1.334H9.167v-1.334zm0 2h4v1.334h-4v-1.334z" fill="currentColor"/>
                  </svg>
                </div>
                
                <span className="font-medium text-foreground group-hover:text-blue-600 transition-colors duration-300">
                  Continue with Outlook
                </span>
              </div>
              
              <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/0 group-hover:ring-blue-500/20 transition-all duration-300" />
            </Button>
          </CardContent>
        </Card>

        <UserOnboarding />
      </div>
    </div>
  );
};

export default Auth;