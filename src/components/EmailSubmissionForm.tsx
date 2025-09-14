import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailSubmissionFormProps {
  onEmailSubmitted: () => void;
}

const EmailSubmissionForm = ({ onEmailSubmitted }: EmailSubmissionFormProps) => {
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit emails for analysis.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !sender.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For now, let's store the email directly without AI classification to avoid any API issues
      const { data, error } = await supabase
        .from('emails')
        .insert({
          user_id: user.id,
          message_id: `manual_${Date.now()}`, // Generate a unique message ID
          subject: subject.trim(),
          sender: sender.trim(),
          content: content.trim(),
          classification: 'pending',
          threat_level: 'low',
          confidence: 0.5,
          keywords: [],
          received_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to store email');
      }

      console.log('Email stored successfully:', data);

      // Clear form
      setSubject("");
      setSender("");
      setContent("");

      toast({
        title: "Email submitted successfully",
        description: "Your email has been stored for analysis.",
      });

      // Refresh email list
      onEmailSubmitted();

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Submit Email for Analysis</span>
        </CardTitle>
        <CardDescription>
          Enter email details to store and analyze for spam and security threats
        </CardDescription>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            AI analysis is temporarily simplified to avoid authentication issues. 
            Emails will be stored and can be analyzed via the chat assistant.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
                className="bg-muted/50 border-primary/20 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Sender Email</Label>
              <Input
                id="sender"
                type="email"
                placeholder="sender@example.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                disabled={isSubmitting}
                className="bg-muted/50 border-primary/20 focus:border-primary/50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Email Content</Label>
            <Textarea
              id="content"
              placeholder="Paste the full email content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              rows={6}
              className="bg-muted/50 border-primary/20 focus:border-primary/50"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !subject.trim() || !sender.trim() || !content.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Storing Email...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Store Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmailSubmissionForm;