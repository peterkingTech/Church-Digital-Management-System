import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, addMinutes, addHours, addDays, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Bell, Plus, Clock, Check, X, AlertTriangle, Calendar, ChevronDown,
  AlarmClockOff, History, Filter, Search, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  createReminder,
  acknowledgeReminder,
  ROLE_REMINDER_CONFIG,
} from '@/lib/reminderService';

interface ReminderData {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_time: string;
  reminder_type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  parent_reminder_id: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_action: string | null;
  snoozed_until: string | null;
  snooze_count: number;
  escalated: boolean;
  escalated_to: string | null;
  status: 'active' | 'completed' | 'missed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  user?: { full_name: string; role: string };
  escalated_user?: { full_name: string };
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  missed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function Reminders() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newDueTime, setNewDueTime] = useState(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [newReminderType, setNewReminderType] = useState<'appointment' | 'task' | 'event' | 'custom'>('custom');

  const userRole = (profile?.role || 'guest') as keyof typeof ROLE_REMINDER_CONFIG;
  const isAdminOrPastor = profile?.role === 'admin' || profile?.role === 'pastor';
  const snoozeLimit = ROLE_REMINDER_CONFIG[userRole]?.snoozeLimit || 2;

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', church?.id, profile?.id],
    queryFn: async () => {
      if (!church?.id || !profile?.id) return [];
      
      let query = supabase
        .from('reminders')
        .select(`
          *,
          user:user_id(full_name, role),
          escalated_user:escalated_to(full_name)
        `)
        .eq('church_id', church.id)
        .order('due_time', { ascending: true });

      if (!isAdminOrPastor) {
        query = query.or(`user_id.eq.${profile.id},created_by.eq.${profile.id},escalated_to.eq.${profile.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReminderData[];
    },
    enabled: !!church?.id && !!profile?.id,
  });

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      if (activeTab === 'active' && r.status !== 'active') return false;
      if (activeTab === 'completed' && r.status !== 'completed') return false;
      if (activeTab === 'missed' && r.status !== 'missed') return false;
      if (activeTab === 'escalated' && !r.escalated) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [reminders, activeTab, priorityFilter, searchQuery]);

  const activeCount = reminders.filter(r => r.status === 'active').length;
  const missedCount = reminders.filter(r => r.status === 'missed').length;
  const escalatedCount = reminders.filter(r => r.escalated && r.status === 'active').length;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error('Missing data');
      return createReminder({
        churchId: church.id,
        userId: profile.id,
        title: newTitle,
        description: newDescription || undefined,
        priority: newPriority,
        dueTime: new Date(newDueTime),
        reminderType: newReminderType,
        createdBy: profile.id,
        userRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Reminder created', description: 'Your reminder has been set' });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ id, action, snoozeDuration }: { 
      id: string; 
      action: 'confirmed' | 'rescheduled' | 'cancelled' | 'snoozed';
      snoozeDuration?: number;
    }) => {
      return acknowledgeReminder(id, action, snoozeDuration);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      const messages = {
        confirmed: 'Reminder marked as complete',
        rescheduled: 'Reminder rescheduled',
        cancelled: 'Reminder cancelled',
        snoozed: 'Reminder snoozed',
      };
      toast({ title: messages[variables.action] });
      setSelectedReminder(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueTime(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    setNewReminderType('custom');
  };

  const getDueDateLabel = (dueTime: string) => {
    const date = new Date(dueTime);
    if (isPast(date)) return 'Overdue';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const renderReminderCard = (reminder: ReminderData) => {
    const isOverdue = isPast(new Date(reminder.due_time)) && reminder.status === 'active';
    const canSnooze = reminder.snooze_count < snoozeLimit;

    return (
      <Card
        key={reminder.id}
        className={cn(
          "cursor-pointer hover-elevate",
          isOverdue && "border-red-300 dark:border-red-800",
          reminder.priority === 'critical' && reminder.status === 'active' && "animate-pulse"
        )}
        onClick={() => setSelectedReminder(reminder)}
        data-testid={`reminder-card-${reminder.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{reminder.title}</h4>
                <Badge className={PRIORITY_COLORS[reminder.priority]} variant="secondary">
                  {reminder.priority}
                </Badge>
                {reminder.escalated && (
                  <Badge variant="destructive">Escalated</Badge>
                )}
              </div>
              {reminder.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {reminder.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className={cn(isOverdue && "text-red-500 font-medium")}>
                    {getDueDateLabel(reminder.due_time)} at {format(new Date(reminder.due_time), 'h:mm a')}
                  </span>
                </div>
                {reminder.reminder_type !== 'custom' && (
                  <Badge variant="outline" className="text-xs">
                    {reminder.reminder_type}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {reminder.status === 'active' && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      acknowledgeMutation.mutate({ id: reminder.id, action: 'confirmed' });
                    }}
                    data-testid={`button-confirm-${reminder.id}`}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  {canSnooze && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-snooze-${reminder.id}`}
                        >
                          <AlarmClockOff className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => acknowledgeMutation.mutate({
                            id: reminder.id,
                            action: 'snoozed',
                            snoozeDuration: 15 * 60 * 1000,
                          })}
                        >
                          15 minutes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => acknowledgeMutation.mutate({
                            id: reminder.id,
                            action: 'snoozed',
                            snoozeDuration: 60 * 60 * 1000,
                          })}
                        >
                          1 hour
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => acknowledgeMutation.mutate({
                            id: reminder.id,
                            action: 'snoozed',
                            snoozeDuration: 24 * 60 * 60 * 1000,
                          })}
                        >
                          1 day
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Reminders
          </h1>
          <p className="text-muted-foreground">
            Manage your appointments, tasks, and notifications
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-reminder">
          <Plus className="w-4 h-4 mr-2" />
          New Reminder
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active Reminders</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(missedCount > 0 && "border-red-300 dark:border-red-800")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{missedCount}</p>
              <p className="text-sm text-muted-foreground">Missed</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(escalatedCount > 0 && "border-orange-300 dark:border-orange-800")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{escalatedCount}</p>
              <p className="text-sm text-muted-foreground">Escalated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-reminders"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-priority-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">{activeCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
          <TabsTrigger value="missed" data-testid="tab-missed">
            Missed
            {missedCount > 0 && (
              <Badge variant="destructive" className="ml-2">{missedCount}</Badge>
            )}
          </TabsTrigger>
          {isAdminOrPastor && (
            <TabsTrigger value="escalated" data-testid="tab-escalated">
              Escalated
              {escalatedCount > 0 && (
                <Badge variant="destructive" className="ml-2">{escalatedCount}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReminders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reminders found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredReminders.map(renderReminderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Reminder title"
                data-testid="input-reminder-title"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Add details..."
                data-testid="input-reminder-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                  <SelectTrigger data-testid="select-reminder-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newReminderType} onValueChange={(v: any) => setNewReminderType(v)}>
                  <SelectTrigger data-testid="select-reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date & Time</Label>
              <Input
                type="datetime-local"
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                data-testid="input-reminder-due-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle || createMutation.isPending}
              data-testid="button-submit-reminder"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReminder} onOpenChange={() => setSelectedReminder(null)}>
        <DialogContent>
          {selectedReminder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedReminder.title}</DialogTitle>
                  <Badge className={PRIORITY_COLORS[selectedReminder.priority]}>
                    {selectedReminder.priority}
                  </Badge>
                  <Badge className={STATUS_COLORS[selectedReminder.status]}>
                    {selectedReminder.status}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {selectedReminder.description && (
                  <p className="text-muted-foreground">{selectedReminder.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Due:</span>
                    <p className="font-medium">
                      {format(new Date(selectedReminder.due_time), 'PPp')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium capitalize">{selectedReminder.reminder_type}</p>
                  </div>
                  {selectedReminder.snooze_count > 0 && (
                    <div>
                      <span className="text-muted-foreground">Snoozed:</span>
                      <p className="font-medium">
                        {selectedReminder.snooze_count} / {snoozeLimit} times
                      </p>
                    </div>
                  )}
                  {selectedReminder.escalated && selectedReminder.escalated_user && (
                    <div>
                      <span className="text-muted-foreground">Escalated to:</span>
                      <p className="font-medium">{selectedReminder.escalated_user.full_name}</p>
                    </div>
                  )}
                </div>
              </div>
              {selectedReminder.status === 'active' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate({
                      id: selectedReminder.id,
                      action: 'cancelled',
                    })}
                    data-testid="button-cancel-reminder"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  {selectedReminder.snooze_count < snoozeLimit && (
                    <Button
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate({
                        id: selectedReminder.id,
                        action: 'snoozed',
                        snoozeDuration: 60 * 60 * 1000,
                      })}
                      data-testid="button-snooze-reminder"
                    >
                      <AlarmClockOff className="w-4 h-4 mr-2" />
                      Snooze 1hr
                    </Button>
                  )}
                  <Button
                    onClick={() => acknowledgeMutation.mutate({
                      id: selectedReminder.id,
                      action: 'confirmed',
                    })}
                    data-testid="button-complete-reminder"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
