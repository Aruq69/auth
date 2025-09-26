import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Search, Shield, AlertTriangle, Clock, CheckCircle, Ban, FileText, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertEmailButton } from '@/components/AlertEmailButton';

export default function AdminEmails() {
  const [searchTerm, setSearchTerm] = useState('');
  const [threatFilter, setThreatFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [blockingEmails, setBlockingEmails] = useState<Set<string>>(new Set());
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string>('');
  const [selectedEmailDetails, setSelectedEmailDetails] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');
  const { toast } = useToast();

  const { data: emails, isLoading, refetch } = useQuery({
    queryKey: ['admin-emails', threatFilter, userFilter],
    queryFn: async () => {
      let query = supabase
        .from('emails')
        .select(`
          *
        `)
        .order('received_date', { ascending: false });

      if (threatFilter !== 'all') {
        query = query.eq('threat_level', threatFilter);
      }

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      const { data: emails, error } = await query.limit(100);
      if (error) throw error;

      // Get user profiles separately
      const userIds = [...new Set(emails?.map(email => email.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Map profiles to emails
      const emailsWithProfiles = emails?.map(email => ({
        ...email,
        profiles: profiles?.find(p => p.user_id === email.user_id)
      })) || [];

      return emailsWithProfiles;
    }
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .order('username');
      if (error) throw error;
      return data;
    }
  });

  const handleBlockEmail = async (emailId: string, blockReason: string) => {
    console.log('=== STARTING EMAIL BLOCK PROCESS ===');
    console.log('Email ID:', emailId);
    console.log('Block Reason:', blockReason);
    
    // Add email to blocking set
    setBlockingEmails(prev => new Set(prev).add(emailId));
    
    try {
      // Get the email details and user's actual email first
      const { data: emailData, error: emailError } = await supabase
        .from('emails')
        .select(`
          sender, 
          subject, 
          outlook_id, 
          user_id,
          profiles(username)
        `)
        .eq('id', emailId)
        .single();

      if (emailError) {
        console.error('Error fetching email data:', emailError);
        throw emailError;
      }
      
      console.log('Email data retrieved:', emailData);

      // Block in app database
      console.log('=== BLOCKING IN APP DATABASE ===');
      const { error } = await supabase
        .from('email_blocks')
        .insert({
          email_id: emailId,
          blocked_by_user_id: (await supabase.auth.getUser()).data.user?.id,
          block_reason: blockReason,
          block_type: 'admin_action',
          is_active: true
         });

      if (error) {
        console.error('Error inserting email block:', error);
        throw error;
      }
      
      console.log('Email blocked in app database successfully');

      // Create actual Outlook mail rule to block future emails from this sender
      console.log('=== CREATING OUTLOOK MAIL RULE ===');
      try {
        const { data: ruleResult, error: ruleError } = await supabase.functions.invoke('create-outlook-mail-rule', {
          body: {
            senderEmail: emailData.sender,
            ruleName: `Block ${emailData.sender} - ${blockReason}`,
            blockType: 'sender',
            emailId: emailData.outlook_id // Pass the Outlook ID to delete the email
          }
         });

        console.log('Outlook rule result:', ruleResult);
        console.log('Outlook rule error:', ruleError);

        if (ruleError) {
          console.warn('Failed to create Outlook rule:', ruleError);
          toast({
            title: 'Partial Success',
            description: 'Email blocked in app but failed to create Outlook rule. The email is only blocked within the app.',
            variant: 'default',
          });
        } else {
          const alertEmailSent = ruleResult?.alertEmailSent;
          
          let description;
          if (alertEmailSent) {
            description = 'Email blocked in app, Outlook rule created for future emails, and security alert sent to user.';
          } else {
            description = 'Email blocked in app and Outlook rule created for future emails. Could not send alert email.';
          }
          
          toast({
            title: 'Email Blocked',
            description,
          });
         }
      } catch (ruleError) {
        console.error('Exception creating Outlook rule:', ruleError);
        toast({
          title: 'Partial Success',
          description: 'Email blocked in app but failed to create Outlook rule. The email is only blocked within the app.',
          variant: 'default',
        });
       }

      // Log admin action
      console.log('=== LOGGING ADMIN ACTION ===');
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'block_email',
          target_type: 'email',
          target_id: emailId,
          action_details: { block_reason: blockReason, sender: emailData.sender }
         });
      
      console.log('Admin action logged successfully');
      
      // Create an alert in the database for the user
      console.log('=== CREATING USER ALERT ===');
      await supabase
        .from('email_alerts')
        .insert({
          user_id: emailData.user_id,
          email_id: emailId,
          alert_type: 'suspicious',
          alert_message: `Suspicious email from ${emailData.sender} has been blocked by admin. Reason: ${blockReason}. A mail rule has been created to automatically block future emails from this sender.`,
          status: 'resolved',
          admin_notes: `Blocked by admin: ${blockReason}`,
          admin_action: 'Email blocked and Outlook rule created'
         });

      console.log('User alert created successfully');

      // Send security alert email using the dedicated function
      console.log('=== SENDING SECURITY ALERT EMAIL ===');
      try {
        // Get the user's actual email address from auth.users via Supabase Admin API
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(emailData.user_id);
         
        console.log('User data retrieved:', userData?.user?.email);
        
        if (userData?.user?.email) {
          await supabase.functions.invoke('send-feedback-email', {
            body: {
              feedback_type: 'security',
              category: 'Security Alert',
              feedback_text: `Suspicious email blocked from ${emailData.sender}. Reason: ${blockReason}. A mail rule has been created to automatically block future emails from this sender.`,
              email: userData.user.email
            }
           });
          console.log('Security alert email sent successfully');
        } else {
          console.log('No user email found, skipping security alert');
        }
      } catch (emailError) {
        console.error('Failed to send security alert:', emailError);
       }
      
      console.log('=== EMAIL BLOCK PROCESS COMPLETED SUCCESSFULLY ===');
      refetch();
    } catch (error) {
      console.error('=== ERROR BLOCKING EMAIL ===');
      console.error('Error details:', error);
      console.error('Error stack:', (error as Error).stack);
      toast({
        title: 'Error',
        description: `Failed to block email: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      // Remove email from blocking set
      setBlockingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
    }
  };

  const openBlockDialog = (emailId: string) => {
    setSelectedEmailId(emailId);
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const openDetailsDialog = async (emailId: string) => {
    try {
      const { data: emailDetails, error } = await supabase
        .from('emails')
        .select('*')
        .eq('id', emailId)
        .single();
      
      if (error) throw error;
      
      setSelectedEmailDetails(emailDetails);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching email details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email details',
        variant: 'destructive',
      });
    }
  };

  const confirmBlockEmail = async () => {
    if (!blockReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for blocking this email',
        variant: 'destructive',
      });
      return;
    }
    
    setBlockDialogOpen(false);
    await handleBlockEmail(selectedEmailId, blockReason);
  };

  const getThreatBadgeVariant = (threatLevel: string | null) => {
    switch (threatLevel?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getThreatIcon = (threatLevel: string | null) => {
    switch (threatLevel?.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredEmails = emails?.filter(email => 
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.profiles?.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage all emails across the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={threatFilter} onValueChange={setThreatFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by threat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Threats</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground self-center">
              {filteredEmails.length} emails found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>All Platform Emails</CardTitle>
          <CardDescription>
            Complete view of all emails processed by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading emails...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Threat Level</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          {getThreatIcon(email.threat_level)}
                          <span className="truncate" title={email.subject}>
                            {email.subject}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{email.profiles?.username}</TableCell>
                      <TableCell className="max-w-xs truncate" title={email.sender}>
                        {email.sender}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getThreatBadgeVariant(email.threat_level)}>
                          {email.threat_level || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {email.classification || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(email.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetailsDialog(email.id)}
                            className="animate-scale-in hover-scale"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBlockDialog(email.id)}
                            disabled={blockingEmails.has(email.id)}
                            className="animate-scale-in hover-scale"
                          >
                            {blockingEmails.has(email.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Blocking...
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Block
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Details & ML Analysis</DialogTitle>
            <DialogDescription>
              Complete email content with machine learning analysis scores
            </DialogDescription>
          </DialogHeader>
          {selectedEmailDetails && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <p className="text-sm text-muted-foreground break-words">{selectedEmailDetails.subject}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sender</Label>
                    <p className="text-sm text-muted-foreground break-words">{selectedEmailDetails.sender}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Received Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedEmailDetails.received_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Message ID</Label>
                    <p className="text-sm text-muted-foreground break-all">{selectedEmailDetails.message_id}</p>
                  </div>
                </div>

                {/* ML Analysis Scores */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    ML Analysis Results
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Threat Level</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getThreatIcon(selectedEmailDetails.threat_level)}
                        <Badge variant={getThreatBadgeVariant(selectedEmailDetails.threat_level)}>
                          {selectedEmailDetails.threat_level || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Classification</Label>
                      <p className="text-sm font-mono">
                        {selectedEmailDetails.classification || 'Pending'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Threat Type</Label>
                      <p className="text-sm font-mono">
                        {selectedEmailDetails.threat_type || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Confidence Score</Label>
                      <p className="text-sm font-mono">
                        {selectedEmailDetails.confidence ? 
                          `${(parseFloat(selectedEmailDetails.confidence) * 100).toFixed(1)}%` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {selectedEmailDetails.keywords && selectedEmailDetails.keywords.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-xs font-medium">Detected Keywords</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedEmailDetails.keywords.map((keyword: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Content */}
                <div>
                  <Label className="text-sm font-medium">Email Content</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-background">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedEmailDetails.content || 'No content available'}
                    </pre>
                  </div>
                </div>

                {/* Raw Content (if available) */}
                {selectedEmailDetails.raw_content && (
                  <div>
                    <Label className="text-sm font-medium">Raw Email Content</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground overflow-x-auto">
                        {selectedEmailDetails.raw_content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Email Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Email</DialogTitle>
            <DialogDescription>
              Please provide a reason for blocking this email. This reason will be included in the security alert sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-reason">Reason for blocking</Label>
              <Textarea
                id="block-reason"
                placeholder="e.g., Phishing attempt, Malicious content, Spam, etc."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmBlockEmail} disabled={!blockReason.trim()}>
                Block Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}