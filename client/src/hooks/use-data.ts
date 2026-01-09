import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";
import type { 
  Task, Announcement, Attendance, User, 
  Church 
} from "@shared/schema";

// Transform snake_case Supabase response to camelCase
function transformTask(data: any): Task {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    assignedBy: data.assigned_by,
    assignedTo: data.assigned_to,
    status: data.status,
    createdAt: data.created_at,
  };
}

// --- TASKS ---
export function useTasks() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['tasks', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return (data || []).map(transformTask);
    }
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!profile?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          assigned_by: profile.id, // Snake case for DB
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });
}

// --- ATTENDANCE ---
export function useAttendance() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['attendance', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      // Join with users to get names
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          users:user_id (full_name, profile_image_url)
        `)
        .order('service_date', { ascending: false });
        
      if (error) throw error;
      return data as (Attendance & { users: { full_name: string, profile_image_url: string | null } })[];
    }
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attendance: Partial<Attendance>) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendance)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  });
}

// --- ANNOUNCEMENTS ---
export function useAnnouncements() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['announcements', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('church_id', profile!.churchId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as Announcement[];
    }
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (announcement: { title: string, content: string }) => {
      if (!profile?.churchId) throw new Error("No church ID");
      
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...announcement,
          church_id: profile.churchId,
          created_by: profile.id
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  });
}

// --- MEMBERS ---
export function useMembers() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['members', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('church_id', profile!.churchId);
        
      if (error) throw error;
      return data as User[];
    }
  });
}

// --- MEMBERS WITH DETAILS (for dashboard modal) ---
export type MemberWithDetails = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profileImageUrl: string | null;
  joinedAt: string | null;
  joinedVia: string | null;
  integrationComplete: boolean;
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  created_at: string | null;
  joined_via: string | null;
  integration_complete: boolean | null;
};

export function useMembersWithDetails() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['members', 'details', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async (): Promise<MemberWithDetails[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, profile_image_url, created_at, joined_via, integration_complete')
        .eq('church_id', profile!.churchId!)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const rows = (data || []) as unknown as UserRow[];
      return rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        profileImageUrl: row.profile_image_url,
        joinedAt: row.created_at,
        joinedVia: row.joined_via || 'Direct',
        integrationComplete: row.integration_complete || false
      }));
    }
  });
}

// --- PENDING TASKS WITH DETAILS ---
export type TaskWithUser = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  assignee: { full_name: string; profile_image_url: string | null } | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  users: { full_name: string; profile_image_url: string | null } | null;
};

export function usePendingTasks() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['tasks', 'pending', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async (): Promise<TaskWithUser[]> => {
      // Get church user IDs first
      const { data: churchUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('church_id', profile!.churchId!);
      
      if (usersError) throw usersError;
      
      const userIds = (churchUsers || []).map(u => u.id);
      
      if (userIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          created_at,
          users:assigned_to (full_name, profile_image_url)
        `)
        .eq('status', 'pending')
        .in('assigned_to', userIds)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const rows = (data || []) as unknown as TaskRow[];
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        dueDate: row.due_date,
        createdAt: row.created_at,
        assignee: row.users
      }));
    }
  });
}

// --- NEWCOMERS (New Visitors) ---
export type NewcomerWithDetails = {
  id: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
  joinedAt: string | null;
  joinedVia: string | null;
};

export function useNewcomers() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['newcomers', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async (): Promise<NewcomerWithDetails[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, profile_image_url, created_at, joined_via')
        .eq('church_id', profile!.churchId!)
        .eq('role', 'guest')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const rows = (data || []) as unknown as UserRow[];
      return rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        profileImageUrl: row.profile_image_url,
        joinedAt: row.created_at,
        joinedVia: row.joined_via || 'Direct'
      }));
    }
  });
}

// --- STATS (DASHBOARD) ---
export function useDashboardStats() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['stats', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      // In a real app these would be RPC calls or aggregated queries
      // Simulating stats for now by fetching counts
      const [members, tasks, attendance] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('church_id', profile!.churchId!),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact' })
      ]);

      return {
        memberCount: members.count || 0,
        pendingTasks: tasks.count || 0,
        attendanceCount: attendance.count || 0,
        giving: 12500 // Mock value as giving table wasn't in schema
      };
    }
  });
}

// --- ATTENDANCE BY DATE ---
export type AttendanceWithUser = {
  id: string;
  userId: string;
  serviceDate: string;
  serviceName: string | null;
  signIn: string | null;
  signOut: string | null;
  status: 'on_time' | 'late' | 'early_departure' | 'absent_excused' | 'absent_unexcused';
  lateReason: string | null;
  users: { full_name: string; profile_image_url: string | null } | null;
};

export type AttendanceStats = {
  on_time: AttendanceWithUser[];
  late: AttendanceWithUser[];
  early_departure: AttendanceWithUser[];
  absent_excused: AttendanceWithUser[];
  absent_unexcused: AttendanceWithUser[];
  total: number;
  serviceName: string | null;
};

// Raw type from Supabase (snake_case)
type AttendanceRow = {
  id: string;
  user_id: string;
  service_date: string;
  service_name: string | null;
  sign_in: string | null;
  sign_out: string | null;
  status: string | null;
  late_reason: string | null;
  users: { full_name: string; profile_image_url: string | null } | null;
};

export function useAttendanceByDate(date: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['attendance', 'by-date', date, profile?.churchId],
    enabled: !!profile?.churchId && !!date,
    queryFn: async (): Promise<AttendanceStats> => {
      // First get user IDs from same church
      const { data: churchUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('church_id', profile!.churchId!);
      
      if (usersError) throw usersError;
      
      const userIds = (churchUsers || []).map(u => u.id);
      
      if (userIds.length === 0) {
        return {
          on_time: [],
          late: [],
          early_departure: [],
          absent_excused: [],
          absent_unexcused: [],
          total: 0,
          serviceName: null
        };
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          service_date,
          service_name,
          sign_in,
          sign_out,
          status,
          late_reason,
          users:user_id (full_name, profile_image_url)
        `)
        .eq('service_date', date)
        .in('user_id', userIds)
        .order('sign_in', { ascending: true });
        
      if (error) throw error;
      
      const rawRecords = (data || []) as unknown as AttendanceRow[];
      
      // Map snake_case to camelCase
      const records: AttendanceWithUser[] = rawRecords.map(row => ({
        id: row.id,
        userId: row.user_id,
        serviceDate: row.service_date,
        serviceName: row.service_name,
        signIn: row.sign_in,
        signOut: row.sign_out,
        status: (row.status as AttendanceWithUser['status']) || 'on_time',
        lateReason: row.late_reason,
        users: row.users
      }));
      
      // Group by status
      const grouped: AttendanceStats = {
        on_time: [],
        late: [],
        early_departure: [],
        absent_excused: [],
        absent_unexcused: [],
        total: records.length,
        serviceName: records[0]?.serviceName || null
      };
      
      records.forEach(record => {
        const status = record.status || 'on_time';
        if (grouped[status]) {
          grouped[status].push(record);
        }
      });
      
      return grouped;
    }
  });
}

// --- ATTENDANCE BY PERIOD (for consolidated modal) ---
export type AttendanceRecord = {
  id: string;
  memberName: string;
  memberImage: string | null;
  serviceDate: string;
  serviceName: string;
  signIn: string | null;
  signOut: string | null;
  status: string;
};

export type ServiceSummary = {
  serviceName: string;
  count: number;
  records: AttendanceRecord[];
};

export type AttendancePeriodData = {
  records: AttendanceRecord[];
  byService: ServiceSummary[];
  total: number;
};

// Get available months and years for attendance dropdown filters
export interface AvailablePeriods {
  months: { year: number; month: number; label: string }[];
  years: number[];
}

export function useAvailableAttendancePeriods() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['attendance', 'available-periods', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async (): Promise<AvailablePeriods> => {
      // Get church user IDs first
      const { data: churchUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('church_id', profile!.churchId!);
      
      if (usersError) throw usersError;
      
      const userIds = (churchUsers || []).map(u => u.id);
      
      if (userIds.length === 0) {
        return { months: [], years: [] };
      }
      
      // Get all distinct service dates
      const { data, error } = await supabase
        .from('attendance')
        .select('service_date')
        .in('user_id', userIds)
        .order('service_date', { ascending: false });
        
      if (error) throw error;
      
      const monthSet = new Set<string>();
      const yearSet = new Set<number>();
      
      (data || []).forEach(row => {
        const date = new Date(row.service_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        yearSet.add(year);
        monthSet.add(`${year}-${month}`);
      });
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      
      const months = Array.from(monthSet).map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          label: `${monthNames[month]} ${year}`
        };
      }).sort((a, b) => b.year - a.year || b.month - a.month);
      
      const years = Array.from(yearSet).sort((a, b) => b - a);
      
      return { months, years };
    }
  });
}

export function useAttendanceByPeriod(
  period: 'week' | 'month' | 'year', 
  enabled: boolean = true,
  selectedMonth?: { year: number; month: number },
  selectedYear?: number
) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['attendance', 'period', period, selectedMonth?.year, selectedMonth?.month, selectedYear, profile?.churchId],
    enabled: !!profile?.churchId && enabled,
    queryFn: async (): Promise<AttendancePeriodData> => {
      // Calculate date range based on period
      const now = new Date();
      let startDate: string;
      let endDate: string;
      
      if (period === 'month' && selectedMonth) {
        // Specific month selected - get first and last day of that month
        // Use string formatting to avoid timezone issues
        const year = selectedMonth.year;
        const month = selectedMonth.month + 1; // JavaScript months are 0-indexed
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      } else if (period === 'year' && selectedYear) {
        // Specific year selected - get first and last day of that year
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      } else {
        // Default behavior
        endDate = now.toISOString().split('T')[0];
        
        switch (period) {
          case 'week':
            // Last 7 days including today (6 days ago to today)
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 6);
            startDate = weekAgo.toISOString().split('T')[0];
            break;
          case 'month':
            // Last 30 days
            const monthAgo = new Date(now);
            monthAgo.setDate(monthAgo.getDate() - 29);
            startDate = monthAgo.toISOString().split('T')[0];
            break;
          case 'year':
            // Last 365 days
            const yearAgo = new Date(now);
            yearAgo.setDate(yearAgo.getDate() - 364);
            startDate = yearAgo.toISOString().split('T')[0];
            break;
          default:
            startDate = endDate;
        }
      }
      
      // Get church user IDs first
      const { data: churchUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('church_id', profile!.churchId!);
      
      if (usersError) throw usersError;
      
      const userIds = (churchUsers || []).map(u => u.id);
      
      if (userIds.length === 0) {
        return { records: [], byService: [], total: 0 };
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          service_date,
          service_name,
          sign_in,
          sign_out,
          status,
          users:user_id (full_name, profile_image_url)
        `)
        .in('user_id', userIds)
        .gte('service_date', startDate)
        .lte('service_date', endDate)
        .order('service_date', { ascending: false })
        .order('sign_in', { ascending: true });
        
      if (error) throw error;
      
      type RawRow = {
        id: string;
        service_date: string;
        service_name: string | null;
        sign_in: string | null;
        sign_out: string | null;
        status: string | null;
        users: { full_name: string; profile_image_url: string | null } | null;
      };
      
      const rawRecords = (data || []) as unknown as RawRow[];
      
      const records: AttendanceRecord[] = rawRecords.map(row => ({
        id: row.id,
        memberName: row.users?.full_name || 'Unknown',
        memberImage: row.users?.profile_image_url || null,
        serviceDate: row.service_date,
        serviceName: row.service_name || 'General Service',
        signIn: row.sign_in,
        signOut: row.sign_out,
        status: row.status || 'on_time'
      }));
      
      // Group by service name
      const serviceMap = new Map<string, AttendanceRecord[]>();
      records.forEach(record => {
        const existing = serviceMap.get(record.serviceName) || [];
        existing.push(record);
        serviceMap.set(record.serviceName, existing);
      });
      
      const byService: ServiceSummary[] = Array.from(serviceMap.entries()).map(([serviceName, recs]) => ({
        serviceName,
        count: recs.length,
        records: recs
      }));
      
      return {
        records,
        byService,
        total: records.length
      };
    }
  });
}
