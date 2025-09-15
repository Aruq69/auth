import { useState } from "react";
import { MessageSquare, Star, Bug, Lightbulb, X, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface FeedbackData {
  type: 'general' | 'bug' | 'feature' | 'ux';
  category: string;
  rating?: number;
  feedback: string;
  email?: string;
  page: string;
  userAgent: string;
  timestamp: string;
}

const FeedbackSystem = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature' | 'ux'>('general');
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'bg-blue-500' },
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'bg-red-500' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'bg-yellow-500' },
    { value: 'ux', label: 'UX/UI Feedback', icon: Star, color: 'bg-purple-500' }
  ];

  const categories = {
    general: ['Overall Experience', 'Performance', 'Usability', 'Other'],
    bug: ['Login Issues', 'Email Analysis', 'Chat Assistant', 'Display Problems', 'Performance', 'Other'],
    feature: ['New Feature', 'Improvement', 'Integration', 'Customization', 'Other'],
    ux: ['Navigation', 'Design', 'Mobile Experience', 'Accessibility', 'Clarity', 'Other']
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Missing feedback",
        description: "Please provide your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Missing category", 
        description: "Please select a category for your feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackData = {
        type: feedbackType,
        category,
        rating: feedbackType === 'ux' || feedbackType === 'general' ? rating : undefined,
        feedback: feedback.trim(),
        email: email.trim() || user?.email || 'anonymous',
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      // Store feedback in database and send email notification
      const [storeResult, emailResult] = await Promise.allSettled([
        // Store in database
        supabase.functions.invoke('store-feedback', {
          body: {
            user_id: user?.id || null,
            feedback_type: feedbackData.type,
            category: feedbackData.category,
            rating: feedbackData.rating,
            feedback_text: feedbackData.feedback,
            email: feedbackData.email,
            page_url: feedbackData.page,
            user_agent: feedbackData.userAgent
          }
        }),
        // Send email notification
        supabase.functions.invoke('send-feedback-email', {
          body: {
            feedback_type: feedbackData.type,
            category: feedbackData.category,
            rating: feedbackData.rating,
            feedback_text: feedbackData.feedback,
            email: feedbackData.email,
            page_url: feedbackData.page,
            user_agent: feedbackData.userAgent
          }
        })
      ]);

      // Check if database storage failed
      if (storeResult.status === 'rejected') {
        console.error('Database storage failed:', storeResult.reason);
      }

      // Check if email sending failed
      if (emailResult.status === 'rejected') {
        console.error('Email sending failed:', emailResult.reason);
      }

      // If both failed, throw error
      if (storeResult.status === 'rejected' && emailResult.status === 'rejected') {
        throw new Error('Failed to process feedback');
      }

      toast({
        title: "Feedback submitted!",
        description: "Thank you for helping us improve Mail Guard. Your feedback has been sent to our team and saved for analysis.",
      });

      // Reset form
      setFeedback("");
      setEmail("");
      setCategory("");
      setRating(0);
      setIsOpen(false);

    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Submission failed",
        description: "Unable to submit feedback. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = feedbackTypes.find(type => type.value === feedbackType);

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="group relative h-12 w-12 sm:h-16 sm:w-16 aspect-square rounded-full bg-gradient-to-br from-secondary via-secondary/90 to-secondary-foreground shadow-lg hover:shadow-2xl hover:shadow-secondary/25 transition-all duration-500 hover:scale-110 flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping [animation-duration:3s]" />
            <ThumbsUp className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground transition-all duration-300 group-hover:scale-110" />
            
            {/* Feedback indicator */}
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <div className="absolute h-full w-full rounded-full bg-green-500 animate-ping [animation-duration:2s]" />
              <div className="relative h-2 w-2 rounded-full bg-green-400 border border-background" />
            </div>

            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg bg-popover px-2 py-1 text-[10px] sm:text-xs font-medium text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-border/20 z-30">
              Share Feedback
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
            </div>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedType && <selectedType.icon className="h-5 w-5 text-primary" />}
              <span>Share Your Feedback</span>
            </DialogTitle>
            <DialogDescription>
              Help us improve Mail Guard by sharing your experience, reporting bugs, or suggesting new features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Feedback Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              {feedbackTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={feedbackType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackType(type.value as 'general' | 'bug' | 'feature' | 'ux')}
                  className="h-auto p-2 flex flex-col items-center space-y-1"
                >
                  <type.icon className="h-4 w-4" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              ))}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories[feedbackType].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating for UX/General feedback */}
            {(feedbackType === 'ux' || feedbackType === 'general') && (
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => setRating(star)}
                      className="p-1 h-auto"
                    >
                      <Star 
                        className={`h-6 w-6 ${
                          star <= rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground'
                        }`} 
                      />
                    </Button>
                  ))}
                  {rating > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {rating}/5
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Text */}
            <div className="space-y-2">
              <Label htmlFor="feedback">
                {feedbackType === 'bug' ? 'Describe the issue' : 
                 feedbackType === 'feature' ? 'Describe your idea' : 
                 'Your feedback'}
              </Label>
              <Textarea
                id="feedback"
                placeholder={
                  feedbackType === 'bug' ? 'What happened? What did you expect? Steps to reproduce...' :
                  feedbackType === 'feature' ? 'What feature would you like to see? How would it help?' :
                  feedbackType === 'ux' ? 'What did you like or dislike about the interface?' :
                  'Share your thoughts about Mail Guard...'
                }
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Email (optional) */}
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll only use this to follow up on your feedback if needed.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !feedback.trim() || !category}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackSystem;