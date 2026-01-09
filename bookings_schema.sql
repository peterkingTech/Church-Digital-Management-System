-- BOOKINGS SYSTEM SQL SCHEMA FOR SUPABASE
-- Run this SQL in your Supabase SQL Editor

-- =============================================
-- AVAILABILITY SLOTS TABLE
-- =============================================
create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  church_id uuid references churches(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  constraint valid_time_range check (start_time < end_time)
);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  requester_id uuid references users(id) on delete cascade not null,
  target_user_id uuid references users(id) on delete cascade not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  rejection_reason text,
  approved_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_booking_time check (start_time < end_time),
  constraint no_self_booking check (requester_id != target_user_id)
);

-- =============================================
-- BOOKING AUDIT LOGS TABLE
-- =============================================
create table if not exists booking_audit_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade not null,
  action text not null check (action in ('created', 'approved', 'rejected', 'cancelled', 'completed', 'updated')),
  performed_by uuid references users(id) on delete set null,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- BLOCKED TIME SLOTS (Church Service Hours)
-- =============================================
create table if not exists blocked_time_slots (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  reason text default 'Church Service',
  is_recurring boolean default true,
  specific_date date, -- For non-recurring blocks
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
create index if not exists idx_bookings_requester on bookings(requester_id);
create index if not exists idx_bookings_target on bookings(target_user_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_time on bookings(start_time, end_time);
create index if not exists idx_bookings_church on bookings(church_id);
create index if not exists idx_availability_user on availability_slots(user_id);
create index if not exists idx_audit_booking on booking_audit_logs(booking_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
alter table availability_slots enable row level security;
alter table bookings enable row level security;
alter table booking_audit_logs enable row level security;
alter table blocked_time_slots enable row level security;

-- =============================================
-- RLS POLICIES: AVAILABILITY SLOTS
-- =============================================

-- Anyone authenticated can view availability slots (needed for booking)
create policy "Availability viewable by church members" on availability_slots
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = availability_slots.church_id
    )
  );

-- Users can manage their own availability
create policy "Users can manage own availability" on availability_slots
  for all using (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: BOOKINGS
-- =============================================

-- Users can view bookings they are involved in (requester or target)
-- Admins and pastors can view all bookings in their church
create policy "Bookings viewable by involved parties or admins" on bookings
  for select using (
    requester_id = auth.uid() 
    or target_user_id = auth.uid()
    or exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = bookings.church_id
      and users.role in ('admin', 'pastor')
    )
  );

-- Users can create bookings based on role permissions
-- Role hierarchy: guest→admin/worker, member→pastor/admin/worker, worker→pastor/admin, admin→pastor/admin, pastor→anyone
create policy "Bookings insertable based on role" on bookings
  for insert with check (
    requester_id = auth.uid()
    and exists (
      select 1 from users requester
      where requester.id = auth.uid()
      and requester.church_id = bookings.church_id
    )
    and exists (
      select 1 from users target
      where target.id = bookings.target_user_id
      and target.church_id = bookings.church_id
    )
    and (
      -- Pastor can book anyone (including other pastors, admins, workers, members, guests)
      exists (
        select 1 from users requester
        where requester.id = auth.uid()
        and requester.role = 'pastor'
      )
      -- Admin can book pastor or other admins
      or exists (
        select 1 from users requester, users target
        where requester.id = auth.uid()
        and target.id = bookings.target_user_id
        and requester.role = 'admin'
        and target.role in ('pastor', 'admin')
      )
      -- Worker can book pastor or admin
      or exists (
        select 1 from users requester, users target
        where requester.id = auth.uid()
        and target.id = bookings.target_user_id
        and requester.role = 'worker'
        and target.role in ('pastor', 'admin')
      )
      -- Member can book pastor, admin, or worker
      or exists (
        select 1 from users requester, users target
        where requester.id = auth.uid()
        and target.id = bookings.target_user_id
        and requester.role = 'member'
        and target.role in ('pastor', 'admin', 'worker')
      )
      -- Guest can book admin or worker
      or exists (
        select 1 from users requester, users target
        where requester.id = auth.uid()
        and target.id = bookings.target_user_id
        and requester.role = 'guest'
        and target.role in ('admin', 'worker')
      )
    )
  );

-- Users can update their own bookings (cancel)
create policy "Requesters can update own bookings" on bookings
  for update using (requester_id = auth.uid());

-- Admins and pastors can update any booking in their church (approve/reject)
create policy "Admins and pastors can manage bookings" on bookings
  for update using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = bookings.church_id
      and users.role in ('admin', 'pastor')
    )
  );

-- Users can delete their own pending bookings
create policy "Requesters can delete own pending bookings" on bookings
  for delete using (
    requester_id = auth.uid() 
    and status = 'pending'
  );

-- =============================================
-- RLS POLICIES: AUDIT LOGS
-- =============================================

-- Audit logs viewable by admins and pastors
create policy "Audit logs viewable by admins and pastors" on booking_audit_logs
  for select using (
    exists (
      select 1 from users, bookings 
      where users.id = auth.uid() 
      and bookings.id = booking_audit_logs.booking_id
      and users.church_id = bookings.church_id
      and users.role in ('admin', 'pastor')
    )
  );

-- System can insert audit logs (via authenticated user actions)
create policy "Audit logs insertable by authenticated" on booking_audit_logs
  for insert with check (auth.role() = 'authenticated');

-- =============================================
-- RLS POLICIES: BLOCKED TIME SLOTS
-- =============================================

-- Anyone in church can view blocked slots
create policy "Blocked slots viewable by church members" on blocked_time_slots
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = blocked_time_slots.church_id
    )
  );

-- Only admins and pastors can manage blocked slots
create policy "Blocked slots manageable by admins and pastors" on blocked_time_slots
  for all using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = blocked_time_slots.church_id
      and users.role in ('admin', 'pastor')
    )
  );

-- =============================================
-- FUNCTION: CHECK FOR OVERLAPPING BOOKINGS
-- =============================================
create or replace function check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from bookings
    where target_user_id = NEW.target_user_id
    and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and status in ('pending', 'approved')
    and (
      (NEW.start_time, NEW.end_time) overlaps (start_time, end_time)
    )
  ) then
    raise exception 'This time slot is already booked or pending';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger prevent_booking_overlap
  before insert or update on bookings
  for each row execute function check_booking_overlap();

-- =============================================
-- FUNCTION: AUTO-APPROVE BOOKINGS FOR CERTAIN ROLES
-- =============================================
create or replace function auto_approve_booking()
returns trigger as $$
declare
  requester_role text;
begin
  select role into requester_role from users where id = NEW.requester_id;
  
  -- Auto-approve for member, admin, and pastor
  if requester_role in ('member', 'admin', 'pastor') then
    NEW.status := 'approved';
    NEW.approved_by := NEW.requester_id;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

create trigger auto_approve_on_insert
  before insert on bookings
  for each row execute function auto_approve_booking();

-- =============================================
-- FUNCTION: CREATE AUDIT LOG ON STATUS CHANGE
-- =============================================
create or replace function log_booking_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into booking_audit_logs (booking_id, action, performed_by, new_status)
    values (NEW.id, 'created', NEW.requester_id, NEW.status);
  elsif TG_OP = 'UPDATE' and OLD.status != NEW.status then
    insert into booking_audit_logs (booking_id, action, performed_by, previous_status, new_status)
    values (
      NEW.id,
      case 
        when NEW.status = 'approved' then 'approved'
        when NEW.status = 'rejected' then 'rejected'
        when NEW.status = 'cancelled' then 'cancelled'
        when NEW.status = 'completed' then 'completed'
        else 'updated'
      end,
      auth.uid(),
      OLD.status,
      NEW.status
    );
  end if;
  
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create trigger booking_audit_trigger
  after insert or update on bookings
  for each row execute function log_booking_change();

-- =============================================
-- INSERT DEFAULT CHURCH SERVICE BLOCKED SLOTS
-- (Example: Sunday 9-12, adjust as needed)
-- =============================================
-- Uncomment and modify for your church:
-- insert into blocked_time_slots (church_id, day_of_week, start_time, end_time, reason)
-- values 
--   ('YOUR_CHURCH_ID', 0, '09:00', '12:00', 'Sunday Morning Service'),
--   ('YOUR_CHURCH_ID', 0, '17:00', '19:00', 'Sunday Evening Service');
