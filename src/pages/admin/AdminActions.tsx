import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Ban, Search, Undo, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminActions() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkBlockReason, setBulkBlockReason] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: blockedEmails, isLoading, refetch } = useQuery({
    queryKey: ['admin-blocks', actionFilter],
    queryFn: async () => {
      console.log('AdminActions: Fetching blocks with filter:', actionFilter);
      // Get email blocks first
      let query = supabase
        .from('email_blocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (actionFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (actionFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data: blocks, error } = await query;
      if (error) {
        console.error('AdminActions: Error fetching blocks:', error);
        throw error;
      }
      
      console.log('AdminActions: Fetched blocks:', blocks?.length || 0, blocks);

      // Get related email data and profiles separately
      const emailIds = [...new Set(blocks?.map(block => block.email_id) || [])];
      const userIds = [...new Set(blocks?.map(block => block.blocked_by_user_id) || [])];

      const [emails, profiles] = await Promise.all([
        supabase.from('emails').select('id, subject, sender, threat_level').in('id', emailIds),
        supabase.from('profiles').select('user_id, username').in('user_id', userIds)
      ]);

      // Map related data to blocks
      const blocksWithData = blocks?.map(block => ({
        ...block,
        emails: emails.data?.find(e => e.id === block.email_id),
        profiles: profiles.data?.find(p => p.user_id === block.blocked_by_user_id)
      })) || [];

      console.log('AdminActions: Final blocks with data:', blocksWithData?.length || 0);
      return blocksWithData;
    }
  });

  const { data: auditLog } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      // Get audit log data
      const { data: auditData, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for admin users
      const userIds = [...new Set(auditData?.map(log => log.admin_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Map profiles to audit log
      const auditWithProfiles = auditData?.map(log => ({
        ...log,
        profiles: profiles?.find(p => p.user_id === log.admin_user_id)
      })) || [];

      return auditWithProfiles;
    }
  });

  const handleUnblockEmail = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('email_blocks')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', blockId);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'unblock_email',
          target_type: 'email_block',
          target_id: blockId,
          action_details: { action: 'unblocked' }
        });

      toast({
        title: 'Email Unblocked',
        description: 'Email has been successfully unblocked',
      });
      
      refetch();
    } catch (error) {
      console.error('Error unblocking email:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock email',
        variant: 'destructive',
      });
    }
  };

  const handleBulkBlock = async () => {
    if (selectedEmails.length === 0 || !bulkBlockReason) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select emails and provide a reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blocks = selectedEmails.map(emailId => ({
        email_id: emailId,
        blocked_by_user_id: '', // Will be set by RLS
        block_reason: bulkBlockReason,
        block_type: 'bulk_action',
        is_active: true
      }));

      const { error } = await supabase
        .from('email_blocks')
        .insert(blocks);

      if (error) throw error;

      toast({
        title: 'Bulk Block Successful',
        description: `${selectedEmails.length} emails have been blocked`,
      });
      
      setSelectedEmails([]);
      setBulkBlockReason('');
      refetch();
    } catch (error) {
      console.error('Error with bulk block:', error);
      toast({
        title: 'Error',
        description: 'Failed to block emails',
        variant: 'destructive',
      });
    }
  };

  const getBlockStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="destructive">Active</Badge>
    ) : (
      <Badge variant="outline">Inactive</Badge>
    );
  };

  const filteredBlocks = blockedEmails?.filter(block => 
    block.emails?.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.emails?.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.block_reason.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Actions</h1>
        <p className="text-muted-foreground">
          Manage email blocking and other security actions
        </p>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>Perform actions on multiple emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Block Reason</label>
              <Textarea
                value={bulkBlockReason}
                onChange={(e) => setBulkBlockReason(e.target.value)}
                placeholder="Reason for blocking these emails..."
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleBulkBlock}
              disabled={selectedEmails.length === 0 || !bulkBlockReason}
              className="w-full"
            >
              <Ban className="h-4 w-4 mr-2" />
              Block Selected Emails ({selectedEmails.length})
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Current blocking statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active Blocks:</span>
                <span className="font-medium">
                  {blockedEmails?.filter(b => b.is_active).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Blocks:</span>
                <span className="font-medium">{blockedEmails?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Recent Actions:</span>
                <span className="font-medium">{auditLog?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search blocked emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blocks</SelectItem>
                <SelectItem value="active">Active Blocks</SelectItem>
                <SelectItem value="inactive">Inactive Blocks</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground self-center">
              {filteredBlocks.length} blocks found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Emails List */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked Emails</CardTitle>
          <CardDescription>
            Manage blocked emails and security actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading blocked emails...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Subject</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Block Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Blocked Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-red-500" />
                          <span className="truncate" title={block.emails?.subject}>
                            {block.emails?.subject}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={block.emails?.sender}>
                        {block.emails?.sender}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={block.block_reason}>
                        {block.block_reason}
                      </TableCell>
                      <TableCell>
                        {getBlockStatusBadge(block.is_active)}
                      </TableCell>
                      <TableCell>
                        {new Date(block.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {block.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblockEmail(block.id)}
                          >
                            <Undo className="h-3 w-3 mr-1" />
                            Unblock
                          </Button>
                        )}
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