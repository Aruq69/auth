import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Send, User, MessageSquare, Loader2, Shield, AlertTriangle, Activity, Eye, Brain, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  classification: string | null;
  threat_level: string | null;
  threat_type: string | null; // Add new threat_type field
  confidence: number | null;
  keywords: string[] | null;
}

interface ChatAssistantProps {
  selectedEmail?: Email | null;
  emails?: Email[];
}

interface ThreatStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  scanned: number;
}

const ChatAssistant = ({ selectedEmail, emails = [] }: ChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! I'm MAIL GUARD AI, your cybersecurity assistant. I'm here to help you understand email security and analyze any threats. Feel free to ask me questions like:\n\n• \"Is this email secure?\"\n• \"What makes this suspicious?\"\n• \"Should I trust this sender?\"\n• \"Why was this flagged?\"\n\nJust ask me anything about email security!",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [animatedStats, setAnimatedStats] = useState<ThreatStats>({ total: 0, high: 0, medium: 0, low: 0, scanned: 0 });
  const [systemStatus, setSystemStatus] = useState<'active' | 'scanning' | 'idle'>('active');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Calculate threat statistics from emails
  const calculateThreatStats = (): ThreatStats => {
    const stats = emails.reduce((acc, email) => {
      acc.total++;
      if (email.threat_level === 'high') acc.high++;
      else if (email.threat_level === 'medium') acc.medium++;
      else if (email.threat_level === 'low') acc.low++;
      return acc;
    }, { total: 0, high: 0, medium: 0, low: 0, scanned: emails.length });
    return stats;
  };

  // Animate stats on email updates
  useEffect(() => {
    const newStats = calculateThreatStats();
    
    // Animate numbers counting up
    const animateValue = (start: number, end: number, setter: (value: number) => void) => {
      const duration = 1000;
      const increment = Math.ceil((end - start) / (duration / 50));
      let current = start;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          current = end;
          clearInterval(timer);
        }
        setter(current);
      }, 50);
    };

    // Set system status based on activity
    setSystemStatus(isLoading ? 'scanning' : emails.length > 0 ? 'active' : 'idle');

    // Animate stats
    setTimeout(() => {
      setAnimatedStats(prev => {
        const stats = { ...prev };
        animateValue(prev.total, newStats.total, (val) => setAnimatedStats(s => ({ ...s, total: val })));
        animateValue(prev.high, newStats.high, (val) => setAnimatedStats(s => ({ ...s, high: val })));
        animateValue(prev.medium, newStats.medium, (val) => setAnimatedStats(s => ({ ...s, medium: val })));
        animateValue(prev.low, newStats.low, (val) => setAnimatedStats(s => ({ ...s, low: val })));
        animateValue(prev.scanned, newStats.scanned, (val) => setAnimatedStats(s => ({ ...s, scanned: val })));
        return stats;
      });
    }, 100);
  }, [emails, isLoading]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Enhanced auto-scroll effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Prepare conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10);

      

      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: input,
          emailData: selectedEmail,
          conversationHistory: conversationHistory
        },
      });

      

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to get response from assistant');
      }

      if (!data) {
        throw new Error('No data received from assistant');
      }

      if (data.error) {
        console.error('Assistant function error:', data.error);
        throw new Error(data.error);
      }

      if (!data.response) {
        throw new Error('No response field in data');
      }

      // Simulate typing delay for better UX
      setTimeout(() => {
        setIsTyping(false);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isBot: true,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Force scroll to bottom after adding bot message
        setTimeout(() => {
          if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
              viewport.scrollTop = viewport.scrollHeight;
            }
          }
        }, 100);
      }, 800);

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      // Check for specific error types to provide better user feedback
      let errorMessage = "Failed to get response from the assistant. Please try again.";
      let errorTitle = "Chat Error";
      
      if (error instanceof Error) {
        const errorString = error.message.toLowerCase();
        
        if (errorString.includes('exceeded your current quota') || errorString.includes('429')) {
          errorTitle = "Service Temporarily Unavailable";
          errorMessage = "The AI service is currently experiencing high demand and has exceeded its quota. This typically resolves within 24 hours. Please try again later or contact support if this persists.";
        } else if (errorString.includes('insufficient_quota')) {
          errorTitle = "Service Quota Exceeded";
          errorMessage = "The AI service quota has been exceeded. Please try again later or contact support for assistance.";
        } else if (errorString.includes('network') || errorString.includes('connection')) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the AI service. Please check your internet connection and try again.";
        } else {
          errorMessage = `Service error: ${error.message}`;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });

      const botErrorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I'm currently experiencing service limitations. ${errorMessage.includes('quota') ? 'This is a temporary service limitation that should resolve soon.' : 'Please try your question again in a moment.'}`,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const askAboutEmail = () => {
    if (!selectedEmail) return;
    
    const question = `Can you explain why this email was classified as "${selectedEmail.classification}" with a ${selectedEmail.threat_level} threat level? The subject is "${selectedEmail.subject}" and it's from "${selectedEmail.sender}". Please provide a detailed breakdown of the security analysis.`;
    setInput(question);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="border-none bg-transparent flex-1 flex flex-col overflow-hidden h-full">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Bot className="h-5 w-5 text-primary" />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                systemStatus === 'active' ? 'bg-green-500' :
                systemStatus === 'scanning' ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-500'
              }`} />
            </div>
            <div>
              <span>MAIL GUARD ASSISTANT</span>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={systemStatus === 'active' ? 'default' : systemStatus === 'scanning' ? 'secondary' : 'outline'} className="text-xs">
                  {systemStatus === 'active' ? '🟢 ACTIVE' : systemStatus === 'scanning' ? '🟡 SCANNING' : '⚪ IDLE'}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Activity className="h-3 w-3 mr-1" />
                  {animatedStats.scanned} emails analyzed
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Threat Detection</div>
            <div className="text-lg font-bold">
              {((animatedStats.high + animatedStats.medium) / Math.max(animatedStats.total, 1) * 100).toFixed(1)}%
            </div>
          </div>
        </CardTitle>
        

        {/* Real-time Analysis Progress */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center">
              <Brain className="h-3 w-3 mr-1" />
              AI Analysis Progress
            </span>
            <span className="text-primary">
              {animatedStats.total > 0 ? Math.round((animatedStats.scanned / animatedStats.total) * 100) : 0}%
            </span>
          </div>
          <Progress 
            value={animatedStats.total > 0 ? (animatedStats.scanned / animatedStats.total) * 100 : 0} 
            className="h-2 cyber-progress"
          />
        </div>

        <CardDescription className="text-xs mt-2">
          Real-time email threat analysis and security consultation
        </CardDescription>
        
        {selectedEmail && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setInput("Is this email secure?")}
                size="sm"
                variant="outline"
                className="border-primary/30 hover:border-primary/50 text-xs"
              >
                <Shield className="h-3 w-3 mr-1" />
                Is it secure?
              </Button>
              <Button 
                onClick={() => setInput("What makes this suspicious?")}
                size="sm"
                variant="outline"
                className="border-orange-500/30 hover:border-orange-500/50 text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                What's suspicious?
              </Button>
              <Button 
                onClick={() => setInput("Should I trust this sender?")}
                size="sm"
                variant="outline"
                className="border-secondary/30 hover:border-secondary/50 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Trust this sender?
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={askAboutEmail}
                size="sm"
                variant="outline"
                className="border-primary/30 hover:border-primary/50 text-xs flex-1"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Full Analysis
              </Button>
              <Button 
                onClick={() => setInput("What are the latest email security threats?")}
                size="sm"
                variant="outline"
                className="border-secondary/30 hover:border-secondary/50 text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Security Tips
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-4 h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 h-full">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.isBot
                      ? 'bg-primary/10 border border-primary/20 text-foreground'
                      : 'bg-secondary/10 border border-secondary/20 text-foreground'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.isBot ? (
                      <Bot className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(isLoading && isTyping) && (
              <div className="flex justify-start">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">MAIL GUARD AI is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex space-x-2 pt-2 border-t border-border/20">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about email security..."
            disabled={isLoading}
            className="flex-1 bg-muted/50 border-primary/20 focus:border-primary/50 cyber-input"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 hover-button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default ChatAssistant;