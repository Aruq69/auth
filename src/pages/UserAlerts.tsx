import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EmailAlert {
  id: string;
  alert_type: string;
  alert_message: string;
  status: string;
  created_at: string;
  admin_notes?: string;
  admin_action?: string;
}

const UserAlerts = () => {
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['user-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailAlert[];
    },
  });

  const getAlertIcon = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'suspicious': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'malware': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'phishing': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'investigating': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'default';
      case 'pending': return 'secondary';
      case 'investigating': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeBadgeVariant = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'malware': return 'destructive';
      case 'phishing': return 'destructive';
      case 'suspicious': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load alerts. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Alerts</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your email security alerts and notifications.
        </p>
      </div>

      {alerts && alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Security Alerts</h3>
            <p className="text-muted-foreground text-center">
              Great! You don't have any security alerts at the moment. 
              MailGuard is actively monitoring your emails for threats.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts?.map((alert) => (
            <Card key={alert.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <CardTitle className="text-lg">
                        Security Alert - {alert.alert_type.charAt(0).toUpperCase() + alert.alert_type.slice(1)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{format(new Date(alert.created_at), 'PPp')}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getAlertTypeBadgeVariant(alert.alert_type)}>
                      {alert.alert_type}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(alert.status)} className="flex items-center gap-1">
                      {getStatusIcon(alert.status)}
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {alert.alert_message && (
                  <div>
                    <h4 className="font-medium mb-2">Alert Details</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {alert.alert_message}
                    </p>
                  </div>
                )}

                {alert.admin_action && (
                  <div>
                    <h4 className="font-medium mb-2">Actions Taken</h4>
                    <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                      {alert.admin_action}
                    </p>
                  </div>
                )}

                {alert.admin_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md border border-blue-200">
                      {alert.admin_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserAlerts;