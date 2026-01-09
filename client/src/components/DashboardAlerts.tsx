import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, X, Bell, CalendarX, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dismissDashboardAlert, acknowledgeDashboardAlert } from '@/lib/reminderService';

interface DashboardAlertData {
  id: string;
  alert_type: 'overdue_task' | 'urgent_reminder' | 'escalated_issue' | 'upcoming_important' | 'missed_appointment';
  severity: 'soft' | 'urgent' | 'critical';
  message: string | null;
  active: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

const ALERT_CONFIG = {
  overdue_task: {
    icon: Clock,
    label: 'Overdue Task',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
  urgent_reminder: {
    icon: Bell,
    label: 'Urgent Reminder',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
  },
  escalated_issue: {
    icon: AlertTriangle,
    label: 'Escalated Issue',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  upcoming_important: {
    icon: Clock,
    label: 'Important Upcoming',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  missed_appointment: {
    icon: CalendarX,
    label: 'Missed Appointment',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
};

const SEVERITY_ANIMATION = {
  soft: '',
  urgent: 'animate-pulse',
  critical: 'animate-pulse',
};

export function DashboardAlerts() {
  const { profile, church } = useAuth();

  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('dashboard_alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('active', true)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as DashboardAlertData[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await dismissDashboardAlert(alertId, profile?.id || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeDashboardAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map(alert => {
        const config = ALERT_CONFIG[alert.alert_type];
        const Icon = config.icon;
        const animation = SEVERITY_ANIMATION[alert.severity];

        return (
          <Card
            key={alert.id}
            className={cn(
              "border-l-4",
              alert.severity === 'critical' && "border-l-red-500",
              alert.severity === 'urgent' && "border-l-orange-500",
              alert.severity === 'soft' && "border-l-blue-500",
              animation
            )}
            data-testid={`dashboard-alert-${alert.id}`}
          >
            <CardContent className={cn("p-3 flex items-center gap-3", config.bgColor)}>
              <div className={cn("flex-shrink-0", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-sm", config.color)}>
                  {config.label}
                </p>
                {alert.message && (
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.message}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                  data-testid={`button-ack-alert-${alert.id}`}
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => dismissMutation.mutate(alert.id)}
                  data-testid={`button-dismiss-alert-${alert.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
