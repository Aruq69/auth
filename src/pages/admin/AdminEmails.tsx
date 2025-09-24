import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Mail, Search, Shield, AlertTriangle, Clock, CheckCircle, Ban, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertEmailButton } from '@/components/AlertEmailButton';

export default function AdminEmails() {
  const [searchTerm, setSearchTerm] = useState('');
  const [threatFilter, setThreatFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [blockingEmails, setBlockingEmails] = useState<Set<string>>(new Set());
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
    // Add email to blocking set
    setBlockingEmails(prev => new Set(prev).add(emailId));
    
    try {
      // Get the email details first
      const { data: emailData, error: emailError } = await supabase
        .from('emails')
        .select('sender, subject, outlook_id')
        .eq('id', emailId)
        .single();

      if (emailError) throw emailError;

      // Block in app database
      const { error } = await supabase
        .from('email_blocks')
        .insert({
          email_id: emailId,
          blocked_by_user_id: (await supabase.auth.getUser()).data.user?.id,
          block_reason: blockReason,
          block_type: 'admin_action',
          is_active: true
        });

      if (error) throw error;

      // Create actual Outlook mail rule to block future emails from this sender
      try {
        const { data: ruleResult, error: ruleError } = await supabase.functions.invoke('create-outlook-mail-rule', {
          body: {
            senderEmail: emailData.sender,
            ruleName: `Block ${emailData.sender} - ${blockReason}`,
            blockType: 'sender',
            emailId: emailData.outlook_id // Pass the Outlook ID to delete the email
          }
        });

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
        console.warn('Failed to create Outlook rule:', ruleError);
        toast({
          title: 'Partial Success',
          description: 'Email blocked in app but failed to create Outlook rule. The email is only blocked within the app.',
          variant: 'default',
        });
      }

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'block_email',
          target_type: 'email',
          target_id: emailId,
          action_details: { block_reason: blockReason, sender: emailData.sender }
        });
      
      refetch();
    } catch (error) {
      console.error('Error blocking email:', error);
      toast({
        title: 'Error',
        description: 'Failed to block email',
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
                            variant="outline"
                            onClick={() => handleBlockEmail(email.id, 'Admin blocked - suspicious content')}
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
    </div>
  );
}