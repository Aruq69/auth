import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Shield } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        {/* Shield Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
              <Shield className="h-16 w-16 text-primary" />
            </div>
            <div className="absolute inset-0 p-6 rounded-full border border-primary/30 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/5 animate-pulse [animation-duration:3s]" />
          </div>
        </div>
        
        <div>
          <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/" className="text-primary underline hover:text-primary/80">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
