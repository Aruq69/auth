import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message.includes("User already registered")) {
          setError("An account with this email already exists. Please sign in instead.");
          setIsSignUp(false);
        } else if (error.message.includes("Password should be at least 6 characters")) {
          setError("Password must be at least 6 characters long.");
        } else {
          setError(error.message || "An error occurred during authentication.");
        }
      } else {
        if (isSignUp) {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully signed in.",
          });
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes("provider is not enabled")) {
          setError("Google sign-in is not configured yet. Please use email/password for now, or contact support to enable Google authentication.");
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      if (err.message?.includes("provider is not enabled")) {
        setError("Google sign-in is not configured yet. Please use email/password for now.");
      } else {
        setError(err.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background matrix-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-md cyber-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-primary cyber-text-glow cyber-pulse" />
              <div className="absolute inset-0 h-12 w-12 border border-primary/30 rounded-full animate-ping" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold cyber-text-glow">
            {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Join the Mail Guard Security System"
              : "Access your Mail Guard Security System"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="cyber-card threat-high">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-primary">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted/50 border-primary/20 focus:border-primary/50"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-primary">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-muted/50 border-primary/20 focus:border-primary/50"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className={`w-full transition-all duration-300 ${
                isSignUp 
                  ? 'cyber-button' 
                  : 'bg-accent hover:bg-accent/80 text-accent-foreground hover:shadow-[0_0_20px_hsl(142_69%_58%/0.5)]'
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-primary/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 relative"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Connecting..." : "Continue with Google"}
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1 rounded text-[10px]">
              SETUP REQUIRED
            </span>
          </Button>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Google Sign-in Setup Required:</strong> To enable Google authentication, 
              configure the Google OAuth provider in your Supabase dashboard under Authentication → Providers.
            </p>
          </div>
          
          <div className="mt-6 text-center text-sm">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                  className="text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Create account
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;