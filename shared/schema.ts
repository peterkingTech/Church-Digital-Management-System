
import { pgTable, text, serial, integer, boolean, timestamp, date, time, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Note: This schema mirrors the Supabase SQL schema for type generation.
// The actual database is Supabase (Postgres).

export const churches = pgTable("churches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  themeColor: text("theme_color").default('#f59e0b'),
  fontFamily: text("font_family").default('Inter'),
  inviteEnabled: boolean("invite_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Official department list
export const DEPARTMENTS = [
  'Church Management',
  'Production',
  'Sound',
  'Kingdom Ladies',
  'Königs Kinder',
  'Hospitality',
  'ECE',
  'Intercession',
  'Integration',
  'Housekeeping',
  'Administration',
] as const;

export type Department = typeof DEPARTMENTS[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // References auth.users
  churchId: uuid("church_id").references(() => churches.id),
  fullName: text("full_name").default('New User'),
  email: text("email"),
  role: text("role", { enum: ['pastor','admin','worker','member','guest'] }).default('guest'),
  department: text("department"),
  language: text("language").default('en'),
  birthdayDay: integer("birthday_day"),
  birthdayMonth: integer("birthday_month"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  serviceDate: date("service_date"),
  serviceName: text("service_name"),
  signIn: time("sign_in"),
  signOut: time("sign_out"),
  status: text("status", { enum: ['on_time', 'late', 'early_departure', 'absent_excused', 'absent_unexcused'] }).default('on_time'),
  lateReason: text("late_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  description: text("description"),
  assignedBy: uuid("assigned_by"),
  assignedTo: uuid("assigned_to"),
  status: text("status", { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id"),
  title: text("title"),
  content: text("content"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const historyLogs = pgTable("history_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id"),
  userId: uuid("user_id"),
  action: text("action"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pastor's Desk Directives
export const directives = pgTable("directives", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  title: text("title").notNull(),
  content: text("content"),
  serviceDate: date("service_date"),
  type: text("type", { enum: ['report', 'announcement', 'instruction', 'prayer'] }).default('report'),
  targetAudience: text("target_audience", { enum: ['all_staff', 'leaders', 'workers', 'all_members'] }).default('all_staff'),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar Events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false),
  location: text("location"),
  eventType: text("event_type", { enum: ['service', 'meeting', 'event', 'appointment'] }).default('event'),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow-up System
export const followUps = pgTable("follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  guestId: uuid("guest_id").references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: text("status", { enum: ['pending', 'contacted', 'visited', 'integrated', 'closed'] }).default('pending'),
  notes: text("notes"),
  visitDate: date("visit_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Department Reports
export const departmentReports = pgTable("department_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  department: text("department").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  summary: text("summary"),
  highlights: text("highlights"),
  challenges: text("challenges"),
  nextWeekPlan: text("next_week_plan"),
  status: text("status", { enum: ['draft', 'submitted', 'approved', 'needs_revision'] }).default('draft'),
  submittedBy: uuid("submitted_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings System - Availability Slots
export const availabilitySlots = pgTable("availability_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  churchId: uuid("church_id").references(() => churches.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings System - Bookings
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  requesterId: uuid("requester_id").references(() => users.id).notNull(),
  targetUserId: uuid("target_user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'] }).default('pending'),
  rejectionReason: text("rejection_reason"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking Audit Log
export const bookingAuditLogs = pgTable("booking_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  action: text("action", { enum: ['created', 'approved', 'rejected', 'cancelled', 'completed', 'updated'] }).notNull(),
  performedBy: uuid("performed_by").references(() => users.id).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// REMINDER & NOTIFICATION SYSTEM
// =============================================

// Priority levels for reminders
export const REMINDER_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ReminderPriority = typeof REMINDER_PRIORITIES[number];

// Reminders table - main reminder records
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(), // Owner of the reminder
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
  dueTime: timestamp("due_time").notNull(),
  reminderType: text("reminder_type", { enum: ['appointment', 'task', 'event', 'custom', 'sub_reminder'] }).default('custom'),
  relatedEntityType: text("related_entity_type", { enum: ['booking', 'task', 'event', 'follow_up', 'directive'] }),
  relatedEntityId: uuid("related_entity_id"),
  parentReminderId: uuid("parent_reminder_id"), // For nested/sub-reminders
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedAction: text("acknowledged_action", { enum: ['confirmed', 'rescheduled', 'cancelled', 'snoozed'] }),
  snoozedUntil: timestamp("snoozed_until"),
  snoozeCount: integer("snooze_count").default(0),
  escalated: boolean("escalated").default(false),
  escalatedAt: timestamp("escalated_at"),
  escalatedTo: uuid("escalated_to").references(() => users.id),
  status: text("status", { enum: ['active', 'completed', 'missed', 'cancelled'] }).default('active'),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reminder schedules - when reminders should trigger
export const reminderSchedules = pgTable("reminder_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id").references(() => reminders.id).notNull(),
  triggerTime: timestamp("trigger_time").notNull(),
  triggerOffset: text("trigger_offset"), // e.g., "24h", "1h", "15m"
  triggered: boolean("triggered").default(false),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification delivery records
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  reminderId: uuid("reminder_id").references(() => reminders.id),
  title: text("title").notNull(),
  message: text("message"),
  type: text("type", { enum: ['reminder', 'escalation', 'system', 'alert', 'info'] }).default('info'),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
  channel: text("channel", { enum: ['dashboard', 'email', 'sms', 'push'] }).default('dashboard'),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  dismissed: boolean("dismissed").default(false),
  dismissedAt: timestamp("dismissed_at"),
  requiresAction: boolean("requires_action").default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Escalation rules per role
export const escalationRules = pgTable("escalation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id).notNull(),
  sourceRole: text("source_role", { enum: ['pastor', 'admin', 'worker', 'member', 'guest'] }).notNull(),
  targetRole: text("target_role", { enum: ['pastor', 'admin', 'worker', 'member', 'guest'] }).notNull(),
  escalateAfterMinutes: integer("escalate_after_minutes").default(60),
  reminderType: text("reminder_type", { enum: ['appointment', 'task', 'event', 'custom', 'sub_reminder'] }),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'critical'] }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Escalation log
export const escalationLogs = pgTable("escalation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id").references(() => reminders.id).notNull(),
  escalatedFrom: uuid("escalated_from").references(() => users.id).notNull(),
  escalatedTo: uuid("escalated_to").references(() => users.id).notNull(),
  reason: text("reason"),
  status: text("status", { enum: ['pending', 'acknowledged', 'resolved'] }).default('pending'),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  churchId: uuid("church_id").references(() => churches.id).notNull(),
  enableDashboard: boolean("enable_dashboard").default(true),
  enableEmail: boolean("enable_email").default(true),
  enableSms: boolean("enable_sms").default(false),
  enablePush: boolean("enable_push").default(false),
  quietHoursStart: time("quiet_hours_start"),
  quietHoursEnd: time("quiet_hours_end"),
  appointmentReminders: boolean("appointment_reminders").default(true),
  taskReminders: boolean("task_reminders").default(true),
  eventReminders: boolean("event_reminders").default(true),
  optOutAll: boolean("opt_out_all").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard alert states (for blinking indicators)
export const dashboardAlerts = pgTable("dashboard_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  alertType: text("alert_type", { enum: ['overdue_task', 'urgent_reminder', 'escalated_issue', 'upcoming_important', 'missed_appointment'] }).notNull(),
  relatedEntityType: text("related_entity_type", { enum: ['reminder', 'task', 'booking', 'event'] }),
  relatedEntityId: uuid("related_entity_id"),
  severity: text("severity", { enum: ['soft', 'urgent', 'critical'] }).default('soft'),
  message: text("message"),
  active: boolean("active").default(true),
  acknowledgedAt: timestamp("acknowledged_at"),
  dismissedBy: uuid("dismissed_by").references(() => users.id),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Permissions
export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  churchId: uuid("church_id").references(() => churches.id),
  department: text("department"),
  leadershipRole: text("leadership_role"),
  canAssignTasks: boolean("can_assign_tasks").default(false),
  canViewReports: boolean("can_view_reports").default(false),
  canManageMembers: boolean("can_manage_members").default(false),
  canManageEvents: boolean("can_manage_events").default(false),
  canManageFinances: boolean("can_manage_finances").default(false),
  canManageDepartment: boolean("can_manage_department").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Communities
export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ['announcement', 'open', 'department'] }).notNull().default('open'),
  departmentId: text("department_id"),
  coverImageUrl: text("cover_image_url"),
  allowWorkerPosts: boolean("allow_worker_posts").default(true),
  allowWorkerComments: boolean("allow_worker_comments").default(true),
  requirePostApproval: boolean("require_post_approval").default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Posts
export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id").references(() => communities.id),
  authorId: uuid("author_id").references(() => users.id),
  content: text("content"),
  mediaUrls: text("media_urls").array(),
  mediaTypes: text("media_types").array(),
  isPinned: boolean("is_pinned").default(false),
  isApproved: boolean("is_approved").default(true),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community Comments
export const communityComments = pgTable("community_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => communityPosts.id),
  authorId: uuid("author_id").references(() => users.id),
  parentCommentId: uuid("parent_comment_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Reactions
export const communityReactions = pgTable("community_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => communityPosts.id),
  commentId: uuid("comment_id").references(() => communityComments.id),
  userId: uuid("user_id").references(() => users.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Polls
export const communityPolls = pgTable("community_polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => communityPosts.id),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  allowMultiple: boolean("allow_multiple").default(false),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Poll Votes
export const communityPollVotes = pgTable("community_poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").references(() => communityPolls.id),
  userId: uuid("user_id").references(() => users.id),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Members (for department communities)
export const communityMembers = pgTable("community_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id").references(() => communities.id),
  userId: uuid("user_id").references(() => users.id),
  role: text("role", { enum: ['member', 'moderator', 'admin'] }).default('member'),
  isMuted: boolean("is_muted").default(false),
  isBanned: boolean("is_banned").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Zoom Links (reusable)
export const zoomLinks = pgTable("zoom_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  meetingType: text("meeting_type", { enum: ['main_church', 'prayer', 'counseling', 'custom'] }).default('custom'),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meetings
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  title: text("title").notNull(),
  description: text("description"),
  meetingType: text("meeting_type", { enum: ['prayer', 'church_service', 'special_event', 'counseling', 'custom'] }).notNull().default('custom'),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  zoomLinkId: uuid("zoom_link_id").references(() => zoomLinks.id),
  customZoomUrl: text("custom_zoom_url"),
  visibility: text("visibility", { enum: ['public', 'members_only', 'staff_only', 'private'] }).default('public'),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas for validation
export const insertChurchSchema = createInsertSchema(churches);
export const insertUserSchema = createInsertSchema(users);
export const insertAttendanceSchema = createInsertSchema(attendance);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertAnnouncementSchema = createInsertSchema(announcements);
export const insertHistoryLogSchema = createInsertSchema(historyLogs);
export const insertDirectiveSchema = createInsertSchema(directives);
export const insertEventSchema = createInsertSchema(events);
export const insertFollowUpSchema = createInsertSchema(followUps);
export const insertDepartmentReportSchema = createInsertSchema(departmentReports);
export const insertUserPermissionSchema = createInsertSchema(userPermissions);
export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots);
export const insertBookingSchema = createInsertSchema(bookings);
export const insertBookingAuditLogSchema = createInsertSchema(bookingAuditLogs);
export const insertReminderSchema = createInsertSchema(reminders);
export const insertReminderScheduleSchema = createInsertSchema(reminderSchedules);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertEscalationRuleSchema = createInsertSchema(escalationRules);
export const insertEscalationLogSchema = createInsertSchema(escalationLogs);
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences);
export const insertDashboardAlertSchema = createInsertSchema(dashboardAlerts);
export const insertCommunitySchema = createInsertSchema(communities);
export const insertCommunityPostSchema = createInsertSchema(communityPosts);
export const insertCommunityCommentSchema = createInsertSchema(communityComments);
export const insertCommunityReactionSchema = createInsertSchema(communityReactions);
export const insertCommunityPollSchema = createInsertSchema(communityPolls);
export const insertCommunityPollVoteSchema = createInsertSchema(communityPollVotes);
export const insertCommunityMemberSchema = createInsertSchema(communityMembers);
export const insertZoomLinkSchema = createInsertSchema(zoomLinks);
export const insertMeetingSchema = createInsertSchema(meetings);

export type Church = typeof churches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type HistoryLog = typeof historyLogs.$inferSelect;
export type Directive = typeof directives.$inferSelect;
export type Event = typeof events.$inferSelect;
export type FollowUp = typeof followUps.$inferSelect;
export type DepartmentReport = typeof departmentReports.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingAuditLog = typeof bookingAuditLogs.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type EscalationRule = typeof escalationRules.$inferSelect;
export type EscalationLog = typeof escalationLogs.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type DashboardAlert = typeof dashboardAlerts.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type CommunityComment = typeof communityComments.$inferSelect;
export type CommunityReaction = typeof communityReactions.$inferSelect;
export type CommunityPoll = typeof communityPolls.$inferSelect;
export type CommunityPollVote = typeof communityPollVotes.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type ZoomLink = typeof zoomLinks.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
