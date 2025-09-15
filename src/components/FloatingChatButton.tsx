import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Container for button with proper overflow handling */}
      <div className="relative p-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="group relative h-16 w-16 rounded-full border-2 border-primary/20 bg-gradient-to-br from-primary via-primary to-primary-glow shadow-lg hover:shadow-2xl hover:shadow-primary/25 transition-all duration-500 hover:scale-110 overflow-visible"
            >
              {/* Animated background gradient - contained within button */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-glow/50 to-primary opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-45" />
              
              {/* Glowing ring effects - properly contained */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-duration:2s] scale-100" />
              <div className="absolute inset-1 rounded-full bg-primary/10 animate-ping [animation-duration:2.5s] [animation-delay:0.5s] scale-100" />
              
              {/* Main icon container */}
              <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                {isOpen ? (
                  <X className="h-7 w-7 text-primary-foreground transition-all duration-300" />
                ) : (
                  <MessageCircle className="h-7 w-7 text-primary-foreground transition-all duration-300" />
                )}
              </div>
              
              {/* Status indicator - positioned relative to container */}
              {!isOpen && (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center z-20">
                  <div className="absolute h-full w-full rounded-full bg-green-500 animate-ping [animation-duration:1.5s] scale-100" />
                  <div className="relative h-3 w-3 rounded-full bg-green-400 border-2 border-background shadow-sm" />
                </div>
              )}
              
              {/* Hover tooltip - positioned outside button container */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-border/20 z-30">
                {isOpen ? 'Close Chat' : 'AI Assistant'}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </Button>
          </SheetTrigger>
          
          <SheetContent 
            side="right" 
            className="w-[400px] sm:w-[500px] p-0 border-border/20 bg-card/95 backdrop-blur-sm"
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