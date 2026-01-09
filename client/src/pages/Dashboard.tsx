import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { DashboardAlerts } from "@/components/DashboardAlerts";
import { 
  useDashboardStats, 
  useAttendanceByDate, 
  AttendanceWithUser,
  useMembersWithDetails,
  MemberWithDetails,
  usePendingTasks,
  TaskWithUser,
  useNewcomers,
  NewcomerWithDetails,
  useAttendanceByPeriod,
  useAvailableAttendancePeriods,
  AttendanceRecord,
  ServiceSummary
} from "@/hooks/use-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  ListTodo, 
  Bell,
  FileQuestion,
  Heart,
  UserPlus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  LogOut,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BadgeCheck,
  ShieldCheck,
  Share2,
  Megaphone,
  ClipboardList,
  FileBarChart,
  Settings,
  BookOpen,
  UserCheck,
  Shield,
  Eye,
  Lock,
  User as UserIcon
} from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Link } from "wouter";
import { format, addDays, subDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtitle, onClick, href }: StatCardProps) {
  const content = (
    <div 
      className={`bg-white dark:bg-card rounded-xl p-4 border border-border/50 shadow-sm flex items-start gap-4 transition-all ${onClick || href ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : ''}`}
      onClick={onClick}
      data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

interface ActivityItemProps {
  name: string;
  action: string;
  time: string;
}

function ActivityItem({ name, action, time }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center">
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{action}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

interface EventItemProps {
  title: string;
  date: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function EventItem({ title, date, icon: Icon, iconBg, iconColor }: EventItemProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}

function QuickAction({ icon: Icon, label, href, color }: QuickActionProps) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-card border border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-medium text-foreground text-center">{label}</span>
      </div>
    </Link>
  );
}

interface MemberListItemProps {
  member: AttendanceWithUser;
}

function MemberListItem({ member }: MemberListItemProps) {
  const initials = member.users?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';
    
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <Avatar className="w-8 h-8">
        <AvatarImage src={member.users?.profile_image_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.users?.full_name || 'Unknown Member'}
        </p>
        {member.signIn && (
          <p className="text-xs text-muted-foreground">
            Signed in: {member.signIn}
            {member.signOut && ` - Out: ${member.signOut}`}
          </p>
        )}
      </div>
    </div>
  );
}

interface AttendanceCategoryProps {
  label: string;
  count: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isSelected: boolean;
  onClick: () => void;
  members: AttendanceWithUser[];
}

function AttendanceCategory({ label, count, icon: Icon, iconBg, iconColor, isSelected, onClick, members }: AttendanceCategoryProps) {
  return (
    <div className="space-y-2">
      <div 
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
          isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'
        }`}
        onClick={onClick}
        data-testid={`button-attendance-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <Badge variant="secondary" className="text-sm">{count}</Badge>
      </div>
      
      {isSelected && members.length > 0 && (
        <ScrollArea className="h-40 rounded-lg border border-border/50 bg-background p-2">
          {members.map(member => (
            <MemberListItem key={member.id} member={member} />
          ))}
        </ScrollArea>
      )}
      
      {isSelected && members.length === 0 && (
        <div className="h-20 rounded-lg border border-border/50 bg-background flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No members in this category</p>
        </div>
      )}
    </div>
  );
}

interface StatDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string | number;
  details: { label: string; value: string | number }[];
}

function StatDetailModal({ open, onClose, title, icon: Icon, iconBg, iconColor, value, details }: StatDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
          </div>
          <div className="space-y-3">
            {details.map((detail, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{detail.label}</span>
                <span className="font-medium text-foreground">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
}

function TodayAttendanceContent({ active }: { active: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: stats, isLoading } = useAttendanceByDate(today);
  
  const categories = [
    { key: 'on_time', label: 'On Time', icon: CheckCircle2, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
    { key: 'late', label: 'Late Arrivals', icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
    { key: 'early_departure', label: 'Early Departures', icon: LogOut, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    { key: 'absent_excused', label: 'Absent (with excuse)', icon: FileQuestion, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
    { key: 'absent_unexcused', label: 'Absent (no excuse)', icon: UserX, iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
  ];
  
  if (!active) return null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
        <p className="text-sm text-muted-foreground">
          {stats?.serviceName || 'Today\'s'} Attendance
        </p>
      </div>
      
      <div className="space-y-3">
        {categories.map(cat => {
          const categoryData = stats?.[cat.key as 'on_time' | 'late' | 'early_departure' | 'absent_excused' | 'absent_unexcused'] || [];
          return (
            <AttendanceCategory
              key={cat.key}
              label={cat.label}
              count={categoryData.length}
              icon={cat.icon}
              iconBg={cat.iconBg}
              iconColor={cat.iconColor}
              isSelected={selectedCategory === cat.key}
              onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
              members={categoryData}
            />
          );
        })}
      </div>
    </div>
  );
}

const attendanceCategories = [
  { key: 'on_time', label: 'On Time', icon: CheckCircle2, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600' },
  { key: 'late', label: 'Late', icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
  { key: 'early_departure', label: 'Early Out', icon: LogOut, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
  { key: 'absent_excused', label: 'Excused', icon: FileQuestion, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
  { key: 'absent_unexcused', label: 'Absent', icon: UserX, iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
];

function HistoryAttendanceContent({ active }: { active: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");
  const { data: stats, isLoading } = useAttendanceByPeriod(selectedPeriod);
  
  if (!active) return null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as "week" | "month" | "year")}>
        <SelectTrigger data-testid="select-period">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="text-center py-2">
        <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
        <p className="text-sm text-muted-foreground">Total Attendees</p>
      </div>
      
      <div className="space-y-3">
        {attendanceCategories.map(cat => {
          const categoryData = (stats?.records || []).filter((r: any) => r.status === cat.key);
          return (
            <AttendanceCategory
              key={cat.key}
              label={cat.label}
              count={categoryData.length}
              icon={cat.icon}
              iconBg={cat.iconBg}
              iconColor={cat.iconColor}
              isSelected={selectedCategory === cat.key}
              onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
              members={categoryData as unknown as AttendanceWithUser[]}
            />
          );
        })}
      </div>
    </div>
  );
}

function AttendanceModal({ open, onClose }: AttendanceModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("today");
  
  const formattedDate = format(selectedDate, 'EEEE, MMMM d, yyyy');
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            Attendance Details
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="mt-0">
            <TodayAttendanceContent active={activeTab === "today"} />
          </TabsContent>
          
          <TabsContent value="history" className="mt-0">
            <HistoryAttendanceContent active={activeTab === "history"} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MembersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: members, isLoading } = useMembersWithDetails();
  
  const roleGroups = [
    { role: 'pastor', label: 'Pastors', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
    { role: 'admin', label: 'Admins', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
    { role: 'worker', label: 'Workers', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
    { role: 'member', label: 'Members', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
    { role: 'guest', label: 'Guests', color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600' },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            Total Members
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">{members?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Registered Members</p>
            </div>
            
            <div className="space-y-3">
              {roleGroups.map(group => {
                const roleMembers = members?.filter((m: MemberWithDetails) => m.role === group.role) || [];
                return (
                  <div key={group.role} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={group.color}>{group.label}</Badge>
                    </div>
                    <span className="font-medium text-foreground">{roleMembers.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TasksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: tasks, isLoading } = usePendingTasks();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-pink-600" />
            </div>
            Pending Tasks
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">{tasks?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Tasks Pending</p>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {tasks?.map((task: TaskWithUser) => (
                  <div key={task.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="font-medium text-sm text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned to: {(task as any).assignee?.full_name || 'Unassigned'}
                    </p>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-4">No pending tasks</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewVisitorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: newcomers, isLoading } = useNewcomers();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-amber-600" />
            </div>
            New Visitors
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">{newcomers?.length || 0}</p>
              <p className="text-sm text-muted-foreground">New Visitors This Week</p>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {newcomers?.map((visitor: NewcomerWithDetails) => (
                  <div key={visitor.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={visitor.profileImageUrl || undefined} />
                      <AvatarFallback>{visitor.fullName?.substring(0, 2).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-foreground">{visitor.fullName}</p>
                      <p className="text-xs text-muted-foreground">Joined recently</p>
                    </div>
                  </div>
                ))}
                {(!newcomers || newcomers.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-4">No new visitors this week</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PastorDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const fullName = profile?.fullName || "Pastor";

  const currentDate = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const quickActions = [
    { icon: Users, label: "Members", href: "/members", color: "bg-blue-500" },
    { icon: UserPlus, label: "Invite", href: "/invite", color: "bg-green-500" },
    { icon: BookOpen, label: "Pastor's Desk", href: "/pastors-desk", color: "bg-purple-500" },
    { icon: Shield, label: "Permissions", href: "/permissions", color: "bg-amber-500" },
    { icon: FileBarChart, label: "Reports", href: "/reports", color: "bg-pink-500" },
    { icon: Settings, label: "Settings", href: "/settings", color: "bg-gray-500" },
  ];

  const recentActivity = [
    { name: "New member joined", action: "via invite link", time: "2 hours ago" },
    { name: "Service report", action: "submitted by Admin", time: "3 hours ago" },
    { name: "Attendance marked", action: "15 members present", time: "4 hours ago" },
  ];

  return (
    <>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome Back, Pastor {fullName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Full system access - Manage your church operations</p>
        </div>
        <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 self-start">
          <ShieldCheck className="w-4 h-4 mr-1" />
          Pastor
        </Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600"
          label="Attendance"
          value={isLoading ? "..." : stats?.attendanceCount || 0}
          subtitle="People present today"
          onClick={() => setActiveModal('attendance')}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600"
          label="Total Members"
          value={isLoading ? "..." : stats?.memberCount || 0}
          subtitle="Registered"
          onClick={() => setActiveModal('members')}
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600"
          label="Pending Tasks"
          value={isLoading ? "..." : stats?.pendingTasks || 0}
          subtitle="Tasks assigned"
          onClick={() => setActiveModal('tasks')}
        />
        <StatCard
          icon={UserPlus}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600"
          label="New Visitors"
          value={isLoading ? "..." : 3}
          subtitle="This week"
          onClick={() => setActiveModal('visitors')}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.map((item, index) => (
              <ActivityItem key={index} {...item} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">System Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Active Departments</span>
              <span className="font-medium">11</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Pending Approvals</span>
              <span className="font-medium">3</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Follow-ups Due</span>
              <span className="font-medium">5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AttendanceModal open={activeModal === 'attendance'} onClose={() => setActiveModal(null)} />
      <MembersModal open={activeModal === 'members'} onClose={() => setActiveModal(null)} />
      <TasksModal open={activeModal === 'tasks'} onClose={() => setActiveModal(null)} />
      <NewVisitorsModal open={activeModal === 'visitors'} onClose={() => setActiveModal(null)} />
    </>
  );
}

function AdminDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const fullName = profile?.fullName || "Admin";

  const quickActions = [
    { icon: Users, label: "Members", href: "/members", color: "bg-blue-500" },
    { icon: Megaphone, label: "Announcements", href: "/announcements", color: "bg-red-500" },
    { icon: ClipboardList, label: "Dept Reports", href: "/department-reports", color: "bg-green-500" },
    { icon: FileBarChart, label: "Reports", href: "/reports", color: "bg-pink-500" },
  ];

  return (
    <>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome, {fullName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage users, departments, and church operations</p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 self-start">
          <BadgeCheck className="w-4 h-4 mr-1" />
          Admin
        </Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600"
          label="Attendance"
          value={isLoading ? "..." : stats?.attendanceCount || 0}
          subtitle="People present today"
          onClick={() => setActiveModal('attendance')}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600"
          label="Total Members"
          value={isLoading ? "..." : stats?.memberCount || 0}
          subtitle="Registered"
          onClick={() => setActiveModal('members')}
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600"
          label="Pending Tasks"
          value={isLoading ? "..." : stats?.pendingTasks || 0}
          subtitle="Tasks assigned"
          onClick={() => setActiveModal('tasks')}
        />
        <StatCard
          icon={Bell}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600"
          label="Announcements"
          value={isLoading ? "..." : 2}
          subtitle="Active notices"
          href="/announcements"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Administrative Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Department Reports Pending</span>
            <span className="font-medium">4</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Guests Awaiting Upgrade</span>
            <span className="font-medium">2</span>
          </div>
        </CardContent>
      </Card>

      <AttendanceModal open={activeModal === 'attendance'} onClose={() => setActiveModal(null)} />
      <MembersModal open={activeModal === 'members'} onClose={() => setActiveModal(null)} />
      <TasksModal open={activeModal === 'tasks'} onClose={() => setActiveModal(null)} />
    </>
  );
}

function WorkerDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const fullName = profile?.fullName || "Worker";

  const upcomingEvents = [
    { title: "Sunday Service", date: "This Sunday at 10:00 AM", icon: CalendarIcon, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600" },
    { title: "Team Meeting", date: "Wednesday at 6:00 PM", icon: Users, iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600" },
  ];

  return (
    <>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome, {fullName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">View your tasks and submit reports</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-600 self-start">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Worker
        </Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={ListTodo}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
          iconColor="text-pink-600"
          label="My Tasks"
          value={isLoading ? "..." : stats?.pendingTasks || 0}
          subtitle="Assigned to you"
          href="/tasks"
        />
        <StatCard
          icon={ClipboardList}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600"
          label="Dept Reports"
          value="Submit"
          subtitle="Weekly report"
          href="/department-reports"
        />
        <StatCard
          icon={CalendarIcon}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
          label="Calendar"
          value="View"
          subtitle="Upcoming events"
          href="/calendar"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.map((event, index) => (
              <EventItem key={index} {...event} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/attendance">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">Mark Attendance</span>
              </div>
            </Link>
            <Link href="/announcements">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <Megaphone className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">View Announcements</span>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MemberDashboard() {
  const { profile } = useAuth();
  const fullName = profile?.fullName || "Member";

  const upcomingEvents = [
    { title: "Sunday Morning Service", date: "This Sunday at 10:00 AM", icon: CalendarIcon, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600" },
    { title: "Bible Study", date: "Wednesday at 7:00 PM", icon: BookOpen, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600" },
  ];

  return (
    <>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome, {fullName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Stay connected with your church community</p>
        </div>
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 self-start">
          <Users className="w-4 h-4 mr-1" />
          Member
        </Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Megaphone}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600"
          label="Announcements"
          value="View"
          subtitle="Latest notices"
          href="/announcements"
        />
        <StatCard
          icon={CalendarIcon}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
          label="Calendar"
          value="View"
          subtitle="Upcoming events"
          href="/calendar"
        />
        <StatCard
          icon={UserIcon}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600"
          label="My Profile"
          value="Edit"
          subtitle="Update your info"
          href="/profile"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.map((event, index) => (
              <EventItem key={index} {...event} />
            ))}
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="w-full mt-4">View Full Calendar</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Church Community</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Stay connected with announcements and upcoming programs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function GuestDashboard() {
  const { profile } = useAuth();
  const fullName = profile?.fullName || "Guest";

  return (
    <>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome, {fullName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">We're glad to have you with us!</p>
        </div>
        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-900/30 text-gray-600 self-start">
          <Eye className="w-4 h-4 mr-1" />
          Guest
        </Badge>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Limited Access
          </CardTitle>
          <CardDescription>
            As a guest, you have read-only access to view church information. Contact a pastor or admin to upgrade your account for full access.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Megaphone}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600"
          label="Announcements"
          value="View"
          subtitle="Latest notices"
          href="/announcements"
        />
        <StatCard
          icon={CalendarIcon}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
          label="Calendar"
          value="View"
          subtitle="Upcoming events"
          href="/calendar"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What You Can Do</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm">View announcements</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm">View calendar events</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm">Update your profile</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <Lock className="w-5 h-5 text-red-600" />
            <span className="text-sm text-muted-foreground">Mark attendance (requires upgrade)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <Lock className="w-5 h-5 text-red-600" />
            <span className="text-sm text-muted-foreground">Submit reports (requires upgrade)</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const role = profile?.role || "guest";

  const renderDashboard = () => {
    switch (role) {
      case 'pastor':
        return <PastorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'worker':
        return <WorkerDashboard />;
      case 'member':
        return <MemberDashboard />;
      case 'guest':
      default:
        return <GuestDashboard />;
    }
  };

  return (
    <Layout>
      <DashboardAlerts />
      {renderDashboard()}
    </Layout>
  );
}
