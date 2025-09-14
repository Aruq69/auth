import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  confidence: number | null;
  keywords: string[] | null;
}

const Index = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
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
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const threatStats = emails.reduce((acc, email) => {
    const level = email.threat_level?.toLowerCase() || 'unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Cyber Mail Check</h1>
              <p className="text-muted-foreground">Email Security & Threat Analysis</p>
            </div>
          </div>
          <Button onClick={fetchEmails} disabled={loading}>
            <Mail className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emails.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Threats</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{threatStats.high || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium Threats</CardTitle>
              <Clock className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{threatStats.medium || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safe Emails</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{threatStats.low || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails by subject or sender..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Analysis</CardTitle>
            <CardDescription>
              Security assessment and threat classification results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading emails...</div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">No emails found</div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getThreatIcon(email.threat_level)}
                        <span className="font-medium">{email.subject}</span>
                        {email.threat_level && (
                          <Badge variant={getThreatBadgeVariant(email.threat_level)}>
                            {email.threat_level.toUpperCase()}
                          </Badge>
                        )}
                        {email.classification && (
                          <Badge variant="outline">{email.classification}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        From: {email.sender} • {new Date(email.received_date).toLocaleDateString()}
                      </div>
                      {email.keywords && email.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {email.keywords.slice(0, 3).map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-block bg-muted px-2 py-1 text-xs rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                          {email.keywords.length > 3 && (
                            <span className="inline-block bg-muted px-2 py-1 text-xs rounded">
                              +{email.keywords.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {email.confidence && (
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Math.round(email.confidence * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">confidence</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
