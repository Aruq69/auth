import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  ArrowRight, 
  Target,
  Zap,
  Eye,
  PlayCircle,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action?: string;
  completed?: boolean;
}

const UserOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const seen = localStorage.getItem('mailguard_onboarding_seen');
    // Show onboarding for new visitors (regardless of auth status)
    if (!seen) {
      setIsOpen(true);
    }
    setHasSeenOnboarding(!!seen);
  }, []);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mail Guard',
      description: 'Your advanced email security system powered by ML\AI. Let\'s take a quick tour of what you can do with Mail Guard.',
      icon: Shield,
    },
    {
      id: 'security',
      title: 'AI and ML-Powered Protection',
      description: 'Our advanced ML analyzes emails for phishing, spam, malware, and 24+ different threat types and provide AI chatbot assisstant in real-time.',
      icon: Zap,
    },
    {
      id: 'dashboard',
      title: 'Security Dashboard',
      description: 'Monitor threat statistics, view detailed analysis, and filter emails by risk level to focus on what matters most.',
      icon: Target,
    },
    {
      id: 'chat',
      title: 'AI Security Assistant',
      description: 'Ask questions like "Is this secure?" or "What\'s suspicious?" for instant security insights from our AI assistant.',
      icon: MessageSquare,
      action: 'Try the AI Assistant'
    },
    {
      id: 'connect',
      title: 'Connect Your Email',
      description: 'Connect your Microsoft Outlook account securely using OAuth 2.0. We never store passwords and only analyze for threats.',
      icon: Mail,
      action: 'Get Started'
    }
  ];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('mailguard_onboarding_seen', 'true');
    setIsOpen(false);
    setHasSeenOnboarding(true);
  };

  const handleSkip = () => {
    localStorage.setItem('mailguard_onboarding_seen', 'true');
    setIsOpen(false);
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('mailguard_onboarding_seen');
    setCurrentStep(0);
    setIsOpen(true);
    setHasSeenOnboarding(false);
  };

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <>
      {/* Onboarding Tour Button - Always visible */}
      {hasSeenOnboarding && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={resetOnboarding}
            variant="outline"
            size="sm"
            className="border-primary/30 hover:border-primary/50 bg-card/80 backdrop-blur-sm"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Take Tour
          </Button>
        </div>
      )}

      {/* Onboarding Dialog */}
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
                  <currentStepData.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <DialogTitle className="text-center text-xl">
              {currentStepData.title}
            </DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between pt-6">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip Tour
              </Button>
              
              <Button
                onClick={handleNext}
                className="flex items-center space-x-2"
              >
                <span>
                  {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
                </span>
                {currentStep === onboardingSteps.length - 1 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Button for specific steps */}
          {currentStepData.action && (
            <div className="pt-4 border-t border-border/20">
              <Button
                variant="outline"
                className="w-full border-primary/30 hover:border-primary/50"
                onClick={handleNext}
              >
                {currentStepData.action}
              </Button>
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex items-center justify-center space-x-2 pt-4">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-primary scale-125'
                    : index < currentStep
                    ? 'bg-primary/60'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserOnboarding;