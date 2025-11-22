import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, AlertTriangle, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, emailsResult, alertsResult, blocksResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('emails').select('id', { count: 'exact' }),
        supabase.from('email_alerts').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('email_blocks').select('id', { count: 'exact' }).eq('is_active', true)
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalEmails: emailsResult.count || 0,
        pendingAlerts: alertsResult.count || 0,
        activeBlocks: blocksResult.count || 0
      };
    }
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      description: 'Registered users in the system',
      icon: Users,
      color: 'text-blue-600',
      path: '/admin/users'
    },
    {
      title: 'Total Emails',
      value: stats?.totalEmails || 0,
      description: 'Emails processed platform-wide',
      icon: Mail,
      color: 'text-green-600',
      path: '/admin/emails'
    },
    {
      title: 'Pending Alerts',
      value: stats?.pendingAlerts || 0,
      description: 'User-reported suspicious emails',
      icon: AlertTriangle,
      color: 'text-orange-600',
      path: '/admin/alerts'
    },
    {
      title: 'Active Blocks',
      value: stats?.activeBlocks || 0,
      description: 'Currently blocked emails',
      icon: Shield,
      color: 'text-red-600',
      path: '/admin/emails'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SOC Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage email security across the platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card 
            key={stat.title}
            className="cursor-pointer hover:bg-muted/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/10 group animate-fade-in"
            onClick={() => navigate(stat.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors duration-200">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color} group-hover:scale-110 transition-transform duration-200`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-200">
                {isLoading ? '...' : stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-200">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}