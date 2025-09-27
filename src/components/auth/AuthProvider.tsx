import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsMfa: boolean;
  setNeedsMfa: (needs: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [showSessionTimeoutDialog, setShowSessionTimeoutDialog] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session:', !!session);
        if (mounted) {
          if (event === 'MFA_CHALLENGE_VERIFIED') {
            setNeedsMfa(false);
          }
          
          // Check for session timeout/expiry
          if (event === 'TOKEN_REFRESHED' && !session) {
            // Session expired and couldn't be refreshed
            setShowSessionTimeoutDialog(true);
          } else if (event === 'SIGNED_OUT' && user) {
            // User was signed out due to session expiry
            setShowSessionTimeoutDialog(true);
          }
          
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', !!session);
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error?.message?.includes('MFA')) {
      setNeedsMfa(true);
    }
    
    return { error };
  };


  const signOut = async () => {
    // Clear session emails for privacy when signing out
    window.dispatchEvent(new CustomEvent('clearSessionData'));
    await supabase.auth.signOut();
  };

  const handleSessionTimeoutOk = () => {
    setShowSessionTimeoutDialog(false);
    // Redirect to auth page if we're not already there
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    needsMfa,
    setNeedsMfa,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      <AlertDialog open={showSessionTimeoutDialog} onOpenChange={setShowSessionTimeoutDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-xl font-semibold text-destructive flex items-center justify-center gap-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Session Expired
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground mt-2">
              Your session has timed out for security reasons. Please sign in again to continue using Mail Guard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center">
            <AlertDialogAction 
              onClick={handleSessionTimeoutOk}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              Sign In Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext.Provider>
  );
};