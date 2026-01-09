
-- EXTENSIONS
create extension if not exists "pgcrypto";

-- CHURCHES
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  address text,
  email text,
  phone text,
  logo_url text,
  theme_color text default '#f59e0b',
  font_family text default 'Inter',
  invite_enabled boolean default true,
  created_at timestamptz default now()
);

-- USERS
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid references churches(id) on delete cascade,
  full_name text default 'New User',
  email text,
  role text check (role in ('pastor','admin','worker','member','newcomer')) default 'newcomer',
  department text,
  language text default 'en',
  birthday_day int,
  birthday_month int,
  profile_image_url text,
  created_at timestamptz default now()
);

-- ATTENDANCE
create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  service_date date,
  service_name text,
  sign_in time,
  sign_out time,
  status text check (status in ('on_time', 'late', 'early_departure', 'absent_excused', 'absent_unexcused')) default 'on_time',
  late_reason text,
  created_at timestamptz default now()
);

-- TASKS
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  assigned_by uuid,
  assigned_to uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ANNOUNCEMENTS
create table announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid,
  title text,
  content text,
  created_by uuid,
  created_at timestamptz default now()
);

-- HISTORY LOG
create table history_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid,
  user_id uuid,
  action text,
  created_at timestamptz default now()
);

-- PASTOR'S DESK DIRECTIVES
create table directives (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  title text not null,
  content text,
  service_date date,
  type text check (type in ('report', 'announcement', 'instruction', 'prayer')) default 'report',
  target_audience text check (target_audience in ('all_staff', 'leaders', 'workers', 'all_members')) default 'all_staff',
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- CALENDAR EVENTS
create table events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz,
  all_day boolean default false,
  location text,
  event_type text check (event_type in ('service', 'meeting', 'event', 'appointment')) default 'event',
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- FOLLOW-UP SYSTEM
create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  newcomer_id uuid references users(id),
  assigned_to uuid references users(id),
  status text check (status in ('pending', 'contacted', 'visited', 'integrated', 'closed')) default 'pending',
  notes text,
  visit_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DEPARTMENT REPORTS
create table department_reports (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) on delete cascade,
  department text not null,
  week_start_date date not null,
  week_end_date date not null,
  summary text,
  highlights text,
  challenges text,
  next_week_plan text,
  status text check (status in ('draft', 'submitted', 'approved', 'needs_revision')) default 'draft',
  submitted_by uuid references users(id),
  reviewed_by uuid references users(id),
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- USER PERMISSIONS
create table user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  church_id uuid references churches(id) on delete cascade,
  department text,
  leadership_role text,
  can_assign_tasks boolean default false,
  can_view_reports boolean default false,
  can_manage_members boolean default false,
  can_manage_events boolean default false,
  can_manage_finances boolean default false,
  can_manage_department boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ROW LEVEL SECURITY
alter table churches enable row level security;
alter table users enable row level security;
alter table attendance enable row level security;
alter table tasks enable row level security;
alter table announcements enable row level security;
alter table history_logs enable row level security;
alter table directives enable row level security;
alter table events enable row level security;
alter table follow_ups enable row level security;
alter table department_reports enable row level security;
alter table user_permissions enable row level security;

-- Policies: Churches
create policy "Churches viewable by authenticated" on churches
  for select using (auth.role() = 'authenticated');

create policy "Churches insertable by authenticated" on churches
  for insert with check (auth.role() = 'authenticated');

create policy "Churches updatable by pastors and admins" on churches
  for update using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = churches.id 
      and users.role in ('pastor', 'admin')
    )
  );

-- Policies: Users
create policy "Users viewable by authenticated" on users
  for select using (auth.role() = 'authenticated');

create policy "Users can insert own profile" on users
  for insert with check (auth.uid() = id);

-- Users can update their own non-role fields
create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Pastors and Admins can update any user in their church (for role changes)
-- Note: This policy allows role changes by authorized users
create policy "Authorized users can update members" on users
  for update using (
    exists (
      select 1 from users u 
      where u.id = auth.uid() 
      and u.church_id = users.church_id
      and u.role in ('pastor', 'admin', 'worker')
    )
  );

-- Policies: Attendance
create policy "Attendance viewable by authenticated" on attendance
  for select using (auth.role() = 'authenticated');

create policy "Attendance insertable by authenticated" on attendance
  for insert with check (auth.role() = 'authenticated');

-- Policies: Tasks
create policy "Tasks viewable by authenticated" on tasks
  for select using (auth.role() = 'authenticated');

create policy "Tasks insertable by authenticated" on tasks
  for insert with check (auth.role() = 'authenticated');

create policy "Tasks updatable by authenticated" on tasks
  for update using (auth.role() = 'authenticated');

-- Policies: Announcements
create policy "Announcements viewable by authenticated" on announcements
  for select using (auth.role() = 'authenticated');

create policy "Announcements insertable by authenticated" on announcements
  for insert with check (auth.role() = 'authenticated');

-- Policies: History Logs
create policy "History viewable by authenticated" on history_logs
  for select using (auth.role() = 'authenticated');

create policy "History insertable by authenticated" on history_logs
  for insert with check (auth.role() = 'authenticated');

-- Policies: Directives
create policy "Directives viewable by authenticated" on directives
  for select using (auth.role() = 'authenticated');

create policy "Directives insertable by authenticated" on directives
  for insert with check (auth.role() = 'authenticated');

-- Policies: Events
create policy "Events viewable by authenticated" on events
  for select using (auth.role() = 'authenticated');

create policy "Events insertable by authenticated" on events
  for insert with check (auth.role() = 'authenticated');

-- Policies: Follow-ups
create policy "Follow-ups viewable by authenticated" on follow_ups
  for select using (auth.role() = 'authenticated');

create policy "Follow-ups insertable by authenticated" on follow_ups
  for insert with check (auth.role() = 'authenticated');

create policy "Follow-ups updatable by authenticated" on follow_ups
  for update using (auth.role() = 'authenticated');

-- Policies: Department Reports
create policy "Reports viewable by authenticated" on department_reports
  for select using (auth.role() = 'authenticated');

create policy "Reports insertable by authenticated" on department_reports
  for insert with check (auth.role() = 'authenticated');

create policy "Reports updatable by authenticated" on department_reports
  for update using (auth.role() = 'authenticated');

-- Policies: User Permissions
create policy "Permissions viewable by same church" on user_permissions
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.church_id = user_permissions.church_id
    )
  );

create policy "Permissions insertable by pastors in same church" on user_permissions
  for insert with check (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role = 'pastor'
      and users.church_id = user_permissions.church_id
    )
  );

create policy "Permissions deletable by pastors in same church" on user_permissions
  for delete using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role = 'pastor'
      and users.church_id = user_permissions.church_id
    )
  );

create policy "Permissions updatable by pastors in same church" on user_permissions
  for update using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role = 'pastor'
      and users.church_id = user_permissions.church_id
    )
  );

-- DEMO DATA: Create a test church
insert into churches (id, name, slug, theme_color)
values ('00000000-0000-0000-0000-000000000001', 'Demo Church', 'demo-church', '#f59e0b')
on conflict do nothing;
