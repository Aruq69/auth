import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield } from "lucide-react";
import UserOnboarding from "@/components/UserOnboarding";
import MFAChallenge from "@/components/MFAChallenge";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, user, needsMfa } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect authenticated users to home page
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Access Granted!",
          description: "Welcome to the security command center.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOutlookSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'https://graph.microsoft.com/Mail.Read'
        }
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Failed to sign in with Outlook. Please try again.");
    } finally {
      setLoading(false);
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-destructive/20">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-border/20"
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 border-border/20"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full hover-button" 
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleOutlookSignIn}
              disabled={loading}
              className="w-full border-border/20 bg-background/30 hover:bg-background/50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                <path d="M23.5 12c0-6.627-5.373-12-12-12S-0.5 5.373-0.5 12s5.373 12 12 12 12-5.373 12-12z" fill="#0078d4"/>
                <path d="M12.5 5.8c3.905 0 7.067 3.162 7.067 7.067 0 3.905-3.162 7.067-7.067 7.067S5.433 16.772 5.433 12.867c0-3.905 3.162-7.067 7.067-7.067z" fill="#ffffff"/>
                <path d="M9.167 9.333h6.666v1.334H9.167V9.333zm0 2h6.666v1.334H9.167v-1.334zm0 2h4v1.334h-4v-1.334z" fill="#0078d4"/>
              </svg>
              Continue with Outlook
            </Button>
          </CardContent>
        </Card>

        <UserOnboarding />
      </div>
    </div>
  );
};

export default Auth;