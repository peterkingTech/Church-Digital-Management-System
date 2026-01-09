-- =============================================
-- REMINDER & NOTIFICATION SYSTEM SCHEMA
-- =============================================
-- Run this in your Supabase SQL Editor to create 
-- all reminder-related tables and policies
-- =============================================

-- =============================================
-- REMINDERS TABLE
-- =============================================
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_time timestamptz not null,
  reminder_type text not null default 'custom' check (reminder_type in ('appointment', 'task', 'event', 'custom', 'sub_reminder')),
  related_entity_type text check (related_entity_type in ('booking', 'task', 'event', 'follow_up', 'directive')),
  related_entity_id uuid,
  parent_reminder_id uuid references reminders(id) on delete cascade,
  acknowledged boolean default false,
  acknowledged_at timestamptz,
  acknowledged_action text check (acknowledged_action in ('confirmed', 'rescheduled', 'cancelled', 'snoozed')),
  snoozed_until timestamptz,
  snooze_count integer default 0,
  escalated boolean default false,
  escalated_at timestamptz,
  escalated_to uuid references users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'missed', 'cancelled')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- REMINDER SCHEDULES (Trigger times)
-- =============================================
create table if not exists reminder_schedules (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade not null,
  trigger_time timestamptz not null,
  trigger_offset text,
  triggered boolean default false,
  triggered_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATIONS (Delivery records)
-- =============================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  reminder_id uuid references reminders(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'info' check (type in ('reminder', 'escalation', 'system', 'alert', 'info')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  channel text not null default 'dashboard' check (channel in ('dashboard', 'email', 'sms', 'push')),
  read boolean default false,
  read_at timestamptz,
  dismissed boolean default false,
  dismissed_at timestamptz,
  requires_action boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- =============================================
-- ESCALATION RULES (Per role configuration)
-- =============================================
create table if not exists escalation_rules (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade not null,
  source_role text not null check (source_role in ('pastor', 'admin', 'worker', 'member', 'guest')),
  target_role text not null check (target_role in ('pastor', 'admin', 'worker', 'member', 'guest')),
  escalate_after_minutes integer default 60,
  reminder_type text check (reminder_type in ('appointment', 'task', 'event', 'custom', 'sub_reminder')),
  priority text check (priority in ('low', 'medium', 'high', 'critical')),
  active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- ESCALATION LOGS
-- =============================================
create table if not exists escalation_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade not null,
  escalated_from uuid references users(id) on delete set null not null,
  escalated_to uuid references users(id) on delete set null not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATION PREFERENCES
-- =============================================
create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null unique,
  church_id uuid references churches(id) on delete cascade not null,
  enable_dashboard boolean default true,
  enable_email boolean default true,
  enable_sms boolean default false,
  enable_push boolean default false,
  quiet_hours_start time,
  quiet_hours_end time,
  appointment_reminders boolean default true,
  task_reminders boolean default true,
  event_reminders boolean default true,
  opt_out_all boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- DASHBOARD ALERTS (Blinking indicators)
-- =============================================
create table if not exists dashboard_alerts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  alert_type text not null check (alert_type in ('overdue_task', 'urgent_reminder', 'escalated_issue', 'upcoming_important', 'missed_appointment')),
  related_entity_type text check (related_entity_type in ('reminder', 'task', 'booking', 'event')),
  related_entity_id uuid,
  severity text not null default 'soft' check (severity in ('soft', 'urgent', 'critical')),
  message text,
  active boolean default true,
  acknowledged_at timestamptz,
  dismissed_by uuid references users(id) on delete set null,
  dismissed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
alter table reminders enable row level security;
alter table reminder_schedules enable row level security;
alter table notifications enable row level security;
alter table escalation_rules enable row level security;
alter table escalation_logs enable row level security;
alter table notification_preferences enable row level security;
alter table dashboard_alerts enable row level security;

-- =============================================
-- RLS POLICIES FOR REMINDERS
-- =============================================

-- Users can view their own reminders and reminders they created
create policy "Users can view own reminders" on reminders
  for select using (
    user_id = auth.uid() 
    or created_by = auth.uid()
    or escalated_to = auth.uid()
    or exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = reminders.church_id
    )
  );

-- Users can create reminders (admin creates for others, users create own)
create policy "Users can create reminders" on reminders
  for insert with check (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = reminders.church_id
    )
    and (
      user_id = auth.uid()
      or exists (
        select 1 from users 
        where users.id = auth.uid() 
        and users.role in ('admin', 'pastor')
      )
    )
  );

-- Users can update their own reminders, admin/pastor can update any
create policy "Users can update reminders" on reminders
  for update using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = reminders.church_id
    )
  );

-- Admin/pastor can delete reminders
create policy "Admin can delete reminders" on reminders
  for delete using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = reminders.church_id
    )
  );

-- =============================================
-- RLS POLICIES FOR REMINDER SCHEDULES
-- =============================================

create policy "Users can view reminder schedules" on reminder_schedules
  for select using (
    exists (
      select 1 from reminders 
      where reminders.id = reminder_schedules.reminder_id
      and (reminders.user_id = auth.uid() or reminders.created_by = auth.uid())
    )
    or exists (
      select 1 from users, reminders
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and reminders.id = reminder_schedules.reminder_id
      and users.church_id = reminders.church_id
    )
  );

create policy "Users can manage reminder schedules" on reminder_schedules
  for all using (
    exists (
      select 1 from reminders 
      where reminders.id = reminder_schedules.reminder_id
      and (reminders.user_id = auth.uid() or reminders.created_by = auth.uid())
    )
    or exists (
      select 1 from users, reminders
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and reminders.id = reminder_schedules.reminder_id
      and users.church_id = reminders.church_id
    )
  );

-- =============================================
-- RLS POLICIES FOR NOTIFICATIONS
-- =============================================

create policy "Users can view own notifications" on notifications
  for select using (user_id = auth.uid());

create policy "System can create notifications" on notifications
  for insert with check (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = notifications.church_id
    )
  );

create policy "Users can update own notifications" on notifications
  for update using (user_id = auth.uid());

-- =============================================
-- RLS POLICIES FOR ESCALATION RULES
-- =============================================

create policy "Users can view escalation rules" on escalation_rules
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = escalation_rules.church_id
    )
  );

create policy "Admin can manage escalation rules" on escalation_rules
  for all using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = escalation_rules.church_id
    )
  );

-- =============================================
-- RLS POLICIES FOR ESCALATION LOGS
-- =============================================

create policy "Users can view escalation logs" on escalation_logs
  for select using (
    escalated_from = auth.uid() 
    or escalated_to = auth.uid()
    or exists (
      select 1 from users, reminders
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and reminders.id = escalation_logs.reminder_id
      and users.church_id = reminders.church_id
    )
  );

create policy "System can create escalation logs" on escalation_logs
  for insert with check (
    exists (
      select 1 from reminders
      where reminders.id = escalation_logs.reminder_id
    )
  );

create policy "Users can update escalation status" on escalation_logs
  for update using (
    escalated_to = auth.uid()
    or exists (
      select 1 from users, reminders
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and reminders.id = escalation_logs.reminder_id
      and users.church_id = reminders.church_id
    )
  );

-- =============================================
-- RLS POLICIES FOR NOTIFICATION PREFERENCES
-- =============================================

create policy "Users can view own preferences" on notification_preferences
  for select using (user_id = auth.uid());

create policy "Users can manage own preferences" on notification_preferences
  for all using (user_id = auth.uid());

-- =============================================
-- RLS POLICIES FOR DASHBOARD ALERTS
-- =============================================

create policy "Users can view own alerts" on dashboard_alerts
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = dashboard_alerts.church_id
    )
  );

create policy "System can create alerts" on dashboard_alerts
  for insert with check (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = dashboard_alerts.church_id
    )
  );

create policy "Users can update own alerts" on dashboard_alerts
  for update using (
    user_id = auth.uid()
    or dismissed_by = auth.uid()
    or exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role in ('admin', 'pastor')
      and users.church_id = dashboard_alerts.church_id
    )
  );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
create index if not exists idx_reminders_user on reminders(user_id);
create index if not exists idx_reminders_church on reminders(church_id);
create index if not exists idx_reminders_due_time on reminders(due_time);
create index if not exists idx_reminders_status on reminders(status);
create index if not exists idx_reminders_related on reminders(related_entity_type, related_entity_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_read on notifications(user_id, read);
create index if not exists idx_dashboard_alerts_user on dashboard_alerts(user_id, active);

-- =============================================
-- DEFAULT ESCALATION RULES (Insert per church)
-- =============================================
-- Run this for each church to set up default escalation rules:
-- INSERT INTO escalation_rules (church_id, source_role, target_role, escalate_after_minutes, reminder_type) VALUES
--   ('your-church-id', 'pastor', 'admin', 60, 'appointment'),
--   ('your-church-id', 'worker', 'admin', 60, 'task'),
--   ('your-church-id', 'guest', 'admin', 120, 'appointment');

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
create or replace function update_reminder_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reminder_updated_at
  before update on reminders
  for each row
  execute function update_reminder_timestamp();

create trigger notification_prefs_updated_at
  before update on notification_preferences
  for each row
  execute function update_reminder_timestamp();

-- =============================================
-- TRIGGER: Mark reminder as missed if overdue
-- =============================================
create or replace function check_missed_reminders()
returns trigger as $$
begin
  if new.due_time < now() and new.acknowledged = false and new.status = 'active' then
    new.status = 'missed';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_reminder_missed
  before update on reminders
  for each row
  execute function check_missed_reminders();

-- =============================================
-- TRIGGER: Create dashboard alert on escalation
-- =============================================
create or replace function create_escalation_alert()
returns trigger as $$
declare
  v_church_id uuid;
begin
  select church_id into v_church_id from reminders where id = new.reminder_id;
  
  insert into dashboard_alerts (church_id, user_id, alert_type, related_entity_type, related_entity_id, severity, message)
  values (v_church_id, new.escalated_to, 'escalated_issue', 'reminder', new.reminder_id, 'urgent', 
    'A reminder has been escalated to you for attention');
  
  return new;
end;
$$ language plpgsql;

create trigger escalation_creates_alert
  after insert on escalation_logs
  for each row
  execute function create_escalation_alert();

-- =============================================
-- FUNCTION: Get role-based snooze limits
-- =============================================
create or replace function get_snooze_limit(user_role text)
returns integer as $$
begin
  case user_role
    when 'pastor' then return 5;
    when 'admin' then return 5;
    when 'worker' then return 3;
    when 'member' then return 2;
    when 'guest' then return 1;
    else return 2;
  end case;
end;
$$ language plpgsql;
