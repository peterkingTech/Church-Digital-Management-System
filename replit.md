# Church Digital Management System

## Overview

A production-ready multi-church SaaS application for managing church operations including attendance tracking, task management, announcements, member directories, reporting, pastor's desk directives, calendar events, guest follow-ups, department reports, and user permissions. The system supports multiple churches with role-based access control (pastor, admin, worker, member, guest) and WhatsApp-style invite links for onboarding new members.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for client-side navigation
- **State Management**: React Query (@tanstack/react-query) for server state, React Context for auth state
- **Styling**: TailwindCSS with shadcn/ui component library (New York style)
- **Internationalization**: i18next with react-i18next supporting EN, ES, PT, FR, DE
- **Charts**: Recharts for data visualization on dashboard and reports
- **Calendar**: FullCalendar for attendance and scheduling features
- **QR Codes**: qrcode.react for generating invite links
- **Theme**: Blue sidebar (#1e3a5f) with amber (#f59e0b) accent colors

### Backend Architecture
- **Server**: Express.js with TypeScript (minimal usage - most logic is client-side)
- **API Pattern**: Frontend connects directly to Supabase via client SDK
- **Server Routes**: Minimal - primarily serves static files and provides a health check endpoint
- **Build**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Primary Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM with drizzle-kit for schema management
- **Authentication**: Supabase Auth (email/password)
- **File Storage**: Supabase Storage for profile images
- **Row Level Security**: Implemented via Supabase RLS policies

### Database Schema (Key Tables)
- `churches`: Multi-tenant church entities with name, address, email, phone, logo_url, theme_color, font_family, and invite settings
- `users`: Church members with roles, email, profile image, linked to Supabase auth.users
- `attendance`: Service attendance records with sign-in/out times
- `tasks`: Assignable tasks with status tracking
- `announcements`: Church-wide announcements
- `directives`: Pastor's desk service summaries and directives
- `events`: Calendar events, meetings, and appointments
- `follow_ups`: Guest follow-up tracking with status management
- `department_reports`: Weekly department reports with approval workflow
- `user_permissions`: Granular permissions per user per department
- `bookings`: Role-based appointment booking system with approval workflow
- `availability_slots`: User availability for booking appointments
- `booking_audit_logs`: Audit trail for booking changes
- `blocked_time_slots`: Church service hours and blocked times
- `reminders`: Role-based reminder records with priority, due time, acknowledgement state
- `reminder_schedules`: When reminders should trigger (T-24h, T-1h, etc.)
- `notifications`: Notification delivery records for dashboard/email/sms
- `escalation_rules`: Role-based escalation configuration
- `escalation_logs`: Escalation event history
- `notification_preferences`: User notification channel settings
- `dashboard_alerts`: Blinking visual alerts for dashboard
- `communities`: Community forums (announcement, open, department types)
- `community_posts`: Posts within communities with media support
- `community_comments`: Comments on posts with threading support
- `community_reactions`: Reactions (like, love) on posts and comments
- `community_polls`: Polls attached to posts
- `community_poll_votes`: User votes on polls
- `community_members`: Membership for department-restricted communities
- `zoom_links`: Reusable Zoom meeting links
- `meetings`: Virtual meetings with visibility controls and Zoom integration

### Authentication Flow
- Users authenticate via Supabase Auth
- Profile data stored in `users` table, linked by UUID to auth.users
- Auto-profile creation on first login (creates user and default church)
- Protected routes redirect unauthenticated users to login
- Invite links allow new users to join specific churches via `/join/:churchId`

### Role-Based Access
- **Pastor/Admin**: Full access including settings, reports, member management, pastor's desk, follow-ups, permissions
- **Worker**: Task management, attendance marking, department reports
- **Member**: View announcements, personal attendance, calendar
- **Guest**: Limited read-only access (announcements, calendar, profile)

## Features

### Core Features
- Dashboard with 9 clickable stat cards showing detailed modals
- Attendance tracking with date/time records
- Task management with assignment and status tracking
- Announcements system
- Member directory and management
- Reports with interactive charts

### New Features (January 2025)
- **Enhanced Profile**: Photo upload (drag-drop, file, URL), personal info editing
- **Pastor's Desk**: Service directives creation with type and audience targeting
- **Calendar**: FullCalendar integration for events, meetings, appointments
- **Follow-up System**: Guest tracking with status workflow (pending, contacted, visited, integrated)
- **Department Reports**: Weekly reports with submission and approval workflow
- **User Permissions**: Granular permission assignment per department with leadership roles
- **Role-Based Bookings**: Appointment booking system with role hierarchy (guest→admin/worker, member→pastor/admin/worker, etc.), auto-approval for certain roles, and admin/pastor approval interface
- **Reminder & Notification System**: Role-based reminder system with:
  - Appointment/task/event reminders with priority levels (low/medium/high/critical)
  - Role-specific reminder timing (Pastor: 24h/1h/15m, Worker: 12h/1h, Guest: 24h/2h)
  - Nested sub-reminders for tasks (reminder inside reminder)
  - Escalation rules (missed reminders escalate to admin/pastor)
  - Dashboard visual alerts with blinking indicators (soft/urgent/critical)
  - Snooze functionality with role-based limits (Pastor/Admin: 5, Worker: 3, Member: 2, Guest: 1)
  - Acknowledgement actions (confirm/reschedule/cancel/snooze)
  - Notification bell in header with unread count
  - Reminders page for managing all reminders
- **Clickable Dashboard**: Stat cards show detailed modals or link to relevant pages
- **Enhanced Church Settings**: Church info (name, email, phone, address), logo upload (file or URL), primary color picker, font family selector
- **Email Invite System**: Invite users with email, pre-assigned role (guest/member/worker/admin), and optional department
- **Pastor Signup**: Church name, address, and phone required when creating new church account
- **QR Code Invites**: Renamed from "Barcode" to "QR Code" for clarity
- **Church Community**: WhatsApp-style community module with:
  - Three community types: announcement (admin/pastor only), open (all can post), department (members only)
  - Posts with text content and optional media
  - Comments with threading support
  - Reactions (like, love) on posts and comments
  - Polls created by admin/pastor with voting percentages
  - Role-based posting permissions (guests view-only)
  - **Enhanced Identity**: Author role badges (Pastor/Admin/Worker with Crown/Shield/Briefcase icons)
  - **Full-Screen Post View**: Click post cards to open immersive dialog with full content and interactions
  - **Unread Indicators**: "New" badge on unread posts with localStorage-based tracking
  - **Engagement Insights**: Admin/Pastor dashboard showing stats (posts, comments, reactions, poll votes) and top contributors
  - **Moderation**: Lock/unlock comments on posts, report post functionality, post author shown as "Former Member" if deleted
  - Post card previews with text truncation and click-to-expand
- **Meetings System**: Virtual meeting management with:
  - Meeting types: prayer, church_service, special_event, counseling, custom
  - Zoom link integration with saved reusable links
  - Visibility levels: public, members_only, staff_only, private
  - Role-based access (counseling hidden from guests, staff_only for workers+)
  - Live meeting indicator for ongoing meetings
  - Meeting creation and management for admin/pastor

### Navigation
- Sidebar navigation with role-based visibility
- Admin-only pages: Pastor's Desk, Follow-ups, Permissions
- All users: Dashboard, Attendance, Tasks, Announcements, Members, Calendar, Bookings, Reminders, Community, Meetings, Dept. Reports, Reports, Profile, Settings

## External Dependencies

### Supabase Services
- **Supabase Auth**: User authentication and session management
- **Supabase Database**: PostgreSQL database with RLS
- **Supabase Storage**: File uploads for profile images (bucket: profile-images)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (for Drizzle migrations)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous API key

### Key NPM Packages
- `@supabase/supabase-js`: Supabase client for auth and data
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Data fetching and caching
- `@fullcalendar/*`: Calendar components (core, daygrid, timegrid, interaction, react)
- `recharts`: Charts and graphs
- `i18next`: Internationalization
- `qrcode.react`: QR code generation
- `zod`: Schema validation
- `date-fns`: Date manipulation

## Database Setup

Run the SQL in `supabase_schema.sql` to create all tables with proper RLS policies. New tables added:
- `directives` - Pastor's desk service directives
- `events` - Calendar events
- `follow_ups` - Guest follow-up tracking
- `department_reports` - Department weekly reports
- `user_permissions` - User permission assignments

For the booking system, run `bookings_schema.sql`.
For the reminder/notification system, run `reminders_schema.sql`.
For the community and meetings system, run `community_meetings_schema.sql`.

Also create a Supabase Storage bucket named `profile-images` for profile picture uploads.

### Role Update Migration (January 2025)

If upgrading from a previous version, run this SQL to update the role constraint from 'newcomer' to 'guest':

```sql
-- Step 1: Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Update existing 'newcomer' roles to 'guest' FIRST
UPDATE users SET role = 'guest' WHERE role = 'newcomer';

-- Step 3: Add new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('pastor', 'admin', 'worker', 'member', 'guest'));
```

### Church Settings Update Policy (January 2025)

To allow pastors and admins to update church settings, run this SQL:

```sql
CREATE POLICY "Churches updatable by pastors and admins" ON churches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.church_id = churches.id 
      AND users.role IN ('pastor', 'admin')
    )
  );
```

### Permissions RLS Update (January 2025)

To restrict permissions management to pastors within their own church only, run this SQL to update the RLS policies:

```sql
-- Drop old permissive policies
DROP POLICY IF EXISTS "Permissions viewable by authenticated" ON user_permissions;
DROP POLICY IF EXISTS "Permissions insertable by authenticated" ON user_permissions;
DROP POLICY IF EXISTS "Permissions deletable by authenticated" ON user_permissions;
DROP POLICY IF EXISTS "Permissions updatable by authenticated" ON user_permissions;

-- Create church-scoped view policy
CREATE POLICY "Permissions viewable by same church" ON user_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.church_id = user_permissions.church_id
    )
  );

-- Create pastor-only mutation policies (scoped to same church)
CREATE POLICY "Permissions insertable by pastors in same church" ON user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'pastor'
      AND users.church_id = user_permissions.church_id
    )
  );

CREATE POLICY "Permissions deletable by pastors in same church" ON user_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'pastor'
      AND users.church_id = user_permissions.church_id
    )
  );

CREATE POLICY "Permissions updatable by pastors in same church" ON user_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'pastor'
      AND users.church_id = user_permissions.church_id
    )
  );
```

### Theme/Dark Mode

The application supports light, dark, and system theme modes. Theme preference is stored in localStorage and can be configured in Settings > Appearance.
