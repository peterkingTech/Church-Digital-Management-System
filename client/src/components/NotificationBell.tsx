import { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { markNotificationRead, dismissNotification } from '@/lib/reminderService';

interface NotificationData {
  id: string;
  title: string;
  message: string | null;
  type: 'reminder' | 'escalation' | 'system' | 'alert' | 'info';
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  dismissed: boolean;
  requires_action: boolean;
  action_url: string | null;
  created_at: string;
}

interface DashboardAlertData {
  id: string;
  alert_type: string;
  severity: 'soft' | 'urgent' | 'critical';
  message: string | null;
  active: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { profile, church } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NotificationData[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('dashboard_alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as DashboardAlertData[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent');
  const hasUrgent = criticalAlerts.length > 0;

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'escalation': return <AlertTriangle className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            hasUrgent && "animate-pulse"
          )}
          data-testid="button-notification-bell"
        >
          <Bell className={cn("w-5 h-5", hasUrgent && "text-amber-500")} />
          {(unreadCount > 0 || hasUrgent) && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium rounded-full px-1",
                hasUrgent
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-primary text-primary-foreground"
              )}
              data-testid="badge-notification-count"
            >
              {unreadCount + criticalAlerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        {criticalAlerts.length > 0 && (
          <div className="border-b bg-red-50 dark:bg-red-950/20 p-2">
            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
              Urgent Alerts
            </div>
            {criticalAlerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md",
                  alert.severity === 'critical' && "animate-pulse bg-red-100 dark:bg-red-900/30"
                )}
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {alert.message && (
                    <p className="text-xs text-red-600 dark:text-red-400 truncate">
                      {alert.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 hover-elevate cursor-pointer",
                    !notification.read && "bg-accent/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className={cn("flex-shrink-0 mt-0.5", getPriorityColor(notification.priority))}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      !notification.read && "font-medium"
                    )}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(notification.id);
                        }}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissMutation.mutate(notification.id);
                      }}
                      data-testid={`button-dismiss-${notification.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => {
              navigate('/reminders');
              setIsOpen(false);
            }}
            data-testid="button-view-all-notifications"
          >
            <span>View all reminders</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
