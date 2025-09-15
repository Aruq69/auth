import { useState } from 'react';
import { MessageCircle, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ChatAssistant from '@/components/ChatAssistant';

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  threat_type: string | null; // Add new threat_type field
  confidence: number | null;
  keywords: string[] | null;
  content?: string;
  raw_content?: string;
}

interface FloatingChatButtonProps {
  selectedEmail: Email | null;
  emails: Email[];
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ selectedEmail, emails }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Container for button with proper overflow handling */}
      <div className="relative">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="group relative h-12 w-12 sm:h-16 sm:w-16 aspect-square rounded-full border-2 border-primary/20 bg-gradient-to-br from-primary via-primary to-primary-glow shadow-lg hover:shadow-2xl hover:shadow-primary/25 transition-all duration-500 hover:scale-110 overflow-visible flex items-center justify-center"
            >
              {/* Animated background gradient - contained within button */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-glow/50 to-primary opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-45" />
              
              {/* Glowing ring effects - properly contained */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-duration:2s] scale-100" />
              <div className="absolute inset-1 rounded-full bg-primary/10 animate-ping [animation-duration:2.5s] [animation-delay:0.5s] scale-100" />
              
              {/* Main icon container */}
              <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                {isOpen ? (
                  <X className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground transition-all duration-300" />
                ) : (
                  <ShieldCheck className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground transition-all duration-300" />
                )}
              </div>
              
              {/* Status indicator - positioned relative to container */}
              {!isOpen && (
                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center z-20">
                  <div className="absolute h-full w-full rounded-full bg-green-500 animate-ping [animation-duration:1.5s] scale-100" />
                  <div className="relative h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-400 border-2 border-background shadow-sm" />
                </div>
              )}
              
              {/* Hover tooltip - positioned outside button container */}
              <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 rounded-lg bg-popover px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-border/20 z-30">
                {isOpen ? 'Close Chat' : 'AI Assistant'}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </Button>
          </SheetTrigger>
          
          <SheetContent 
            side="right" 
            className="w-full sm:w-[400px] md:w-[500px] p-0 border-border/20 bg-card/95 backdrop-blur-sm"
          >
            <div className="h-full">
              <ChatAssistant selectedEmail={selectedEmail} emails={emails} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default FloatingChatButton;