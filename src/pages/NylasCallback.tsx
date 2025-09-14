import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function NylasCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) {
        console.log("❌ No user found, redirecting to auth");
        navigate("/auth");
        return;
      }

      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        console.error("❌ OAuth error:", error);
        setStatus("error");
        toast({
          title: "Connection failed",
          description: "Failed to connect your email account. Please try again.",
          variant: "destructive",
        });
        
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      if (!code) {
        console.error("❌ No authorization code received");
        setStatus("error");
        toast({
          title: "Connection failed",
          description: "No authorization code received. Please try again.",
          variant: "destructive",
        });
        
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      try {
        console.log("🔄 Exchanging authorization code for tokens...");
        
        const { data, error: functionError } = await supabase.functions.invoke(
          "nylas-auth",
          {
            body: {
              action: "exchange_token",
              code,
              user_id: user.id,
            },
          }
        );

        if (functionError) {
          console.error("❌ Function error:", functionError);
          throw new Error(functionError.message);
        }

        if (data?.error) {
          console.error("❌ Exchange error:", data.error);
          throw new Error(data.error);
        }

        console.log("✅ Successfully connected email account:", data.email);
        setStatus("success");
        
        toast({
          title: "Email connected successfully!",
          description: `Connected ${data.email} via ${data.provider}`,
        });

        setTimeout(() => navigate("/"), 2000);

      } catch (error) {
        console.error("🚨 Callback error:", error);
        setStatus("error");
        
        toast({
          title: "Connection failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
        
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [user, searchParams, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "error":
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "loading":
        return "Connecting your email account...";
      case "success":
        return "Email account connected successfully!";
      case "error":
        return "Failed to connect email account";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Mail Guard
          </h1>
          <p className="text-muted-foreground">Email Security Connection</p>
        </div>

        <div className="mb-8">
          {getStatusIcon()}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            {getStatusMessage()}
          </h2>
          
          {status === "loading" && (
            <p className="text-muted-foreground">
              Please wait while we securely connect your email account...
            </p>
          )}
          
          {status === "success" && (
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          )}
          
          {status === "error" && (
            <p className="text-muted-foreground">
              Redirecting back to dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}