import { supabase } from './supabase';

export type ReminderPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReminderType = 'appointment' | 'task' | 'event' | 'custom' | 'sub_reminder';
export type ReminderStatus = 'active' | 'completed' | 'missed' | 'cancelled';
export type AlertSeverity = 'soft' | 'urgent' | 'critical';

export const ROLE_REMINDER_CONFIG = {
  pastor: {
    reminderOffsets: ['24h', '1h', '15m'],
    escalateTo: 'admin',
    snoozeLimit: 5,
  },
  admin: {
    reminderOffsets: ['24h', '1h', '15m'],
    escalateTo: null,
    snoozeLimit: 5,
  },
  worker: {
    reminderOffsets: ['12h', '1h'],
    escalateTo: 'admin',
    snoozeLimit: 3,
  },
  member: {
    reminderOffsets: ['24h', '2h'],
    escalateTo: null,
    snoozeLimit: 2,
  },
  guest: {
    reminderOffsets: ['24h', '2h'],
    escalateTo: null,
    snoozeLimit: 1,
  },
} as const;

export function parseOffset(offset: string): number {
  const match = offset.match(/^(\d+)(h|m|d)$/);
  if (!match) return 0;
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export function calculateTriggerTimes(dueTime: Date, role: keyof typeof ROLE_REMINDER_CONFIG): Date[] {
  const config = ROLE_REMINDER_CONFIG[role];
  return config.reminderOffsets.map(offset => {
    const ms = parseOffset(offset);
    return new Date(dueTime.getTime() - ms);
  }).filter(time => time > new Date());
}

export async function createReminder(params: {
  churchId: string;
  userId: string;
  title: string;
  description?: string;
  priority: ReminderPriority;
  dueTime: Date;
  reminderType: ReminderType;
  relatedEntityType?: 'booking' | 'task' | 'event' | 'follow_up' | 'directive';
  relatedEntityId?: string;
  parentReminderId?: string;
  createdBy: string;
  userRole: keyof typeof ROLE_REMINDER_CONFIG;
}) {
  const { data: reminder, error: reminderError } = await supabase
    .from('reminders')
    .insert({
      church_id: params.churchId,
      user_id: params.userId,
      title: params.title,
      description: params.description,
      priority: params.priority,
      due_time: params.dueTime.toISOString(),
      reminder_type: params.reminderType,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      parent_reminder_id: params.parentReminderId,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (reminderError) throw reminderError;

  const triggerTimes = calculateTriggerTimes(params.dueTime, params.userRole);
  const schedules = triggerTimes.map((triggerTime, index) => ({
    reminder_id: reminder.id,
    trigger_time: triggerTime.toISOString(),
    trigger_offset: ROLE_REMINDER_CONFIG[params.userRole].reminderOffsets[index],
  }));

  if (schedules.length > 0) {
    const { error: scheduleError } = await supabase
      .from('reminder_schedules')
      .insert(schedules);
    if (scheduleError) throw scheduleError;
  }

  return reminder;
}

export async function acknowledgeReminder(
  reminderId: string,
  action: 'confirmed' | 'rescheduled' | 'cancelled' | 'snoozed',
  snoozeDuration?: number
) {
  if (action === 'snoozed' && snoozeDuration) {
    const { data: current, error: fetchError } = await supabase
      .from('reminders')
      .select('snooze_count')
      .eq('id', reminderId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('reminders')
      .update({
        acknowledged: false,
        acknowledged_action: action,
        snoozed_until: new Date(Date.now() + snoozeDuration).toISOString(),
        snooze_count: (current?.snooze_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const updates: any = {
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_action: action,
    updated_at: new Date().toISOString(),
  };

  if (action === 'confirmed' || action === 'cancelled') {
    updates.status = action === 'confirmed' ? 'completed' : 'cancelled';
  }

  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function escalateReminder(
  reminderId: string,
  escalatedFrom: string,
  escalatedTo: string,
  reason?: string
) {
  const { error: reminderError } = await supabase
    .from('reminders')
    .update({
      escalated: true,
      escalated_at: new Date().toISOString(),
      escalated_to: escalatedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (reminderError) throw reminderError;

  const { data: log, error: logError } = await supabase
    .from('escalation_logs')
    .insert({
      reminder_id: reminderId,
      escalated_from: escalatedFrom,
      escalated_to: escalatedTo,
      reason,
    })
    .select()
    .single();

  if (logError) throw logError;
  return log;
}

export async function createNotification(params: {
  churchId: string;
  userId: string;
  reminderId?: string;
  title: string;
  message?: string;
  type: 'reminder' | 'escalation' | 'system' | 'alert' | 'info';
  priority: ReminderPriority;
  requiresAction?: boolean;
  actionUrl?: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      church_id: params.churchId,
      user_id: params.userId,
      reminder_id: params.reminderId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority,
      requires_action: params.requiresAction || false,
      action_url: params.actionUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function dismissNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function createDashboardAlert(params: {
  churchId: string;
  userId: string;
  alertType: 'overdue_task' | 'urgent_reminder' | 'escalated_issue' | 'upcoming_important' | 'missed_appointment';
  relatedEntityType?: 'reminder' | 'task' | 'booking' | 'event';
  relatedEntityId?: string;
  severity: AlertSeverity;
  message?: string;
}) {
  const { data, error } = await supabase
    .from('dashboard_alerts')
    .insert({
      church_id: params.churchId,
      user_id: params.userId,
      alert_type: params.alertType,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      severity: params.severity,
      message: params.message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function dismissDashboardAlert(alertId: string, userId: string) {
  const { error } = await supabase
    .from('dashboard_alerts')
    .update({
      active: false,
      dismissed_by: userId,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) throw error;
}

export async function acknowledgeDashboardAlert(alertId: string) {
  const { error } = await supabase
    .from('dashboard_alerts')
    .update({
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) throw error;
}
