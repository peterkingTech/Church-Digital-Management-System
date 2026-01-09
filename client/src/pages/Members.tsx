import { Layout } from "@/components/Layout";
import { useMembers, useTasks } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, User, Shield, ClipboardList, Calendar, Loader2, Plus, Check, UserPlus, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import type { User as DbUser } from "@shared/schema";
import { DEPARTMENTS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface UserPermission {
  id: string;
  user_id: string;
  church_id: string;
  department: string | null;
  leadership_role: string | null;
  can_assign_tasks: boolean;
  can_view_reports: boolean;
  can_manage_members: boolean;
  can_manage_events: boolean;
  can_manage_finances: boolean;
  can_manage_department: boolean;
}

const LEADERSHIP_ROLES = [
  "Department Head",
  "Assistant Head",
  "Coordinator",
  "Secretary",
  "Treasurer"
];

export default function Members() {
  const { profile, church } = useAuth();
  const { data: members, isLoading } = useMembers();
  const { data: tasks } = useTasks();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<DbUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  
  // Create user dialog state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");
  const [newUserDepartment, setNewUserDepartment] = useState("");

  // Permissions state
  const [permDepartment, setPermDepartment] = useState("");
  const [permLeadershipRole, setPermLeadershipRole] = useState("");
  const [permissionFlags, setPermissionFlags] = useState({
    canAssignTasks: false,
    canViewReports: false,
    canManageMembers: false,
    canManageEvents: false,
    canManageFinances: false,
    canManageDepartment: false,
  });

  // Fetch member's permissions when member is selected
  const { data: memberPermissions, isLoading: isLoadingPermissions, refetch: refetchPermissions } = useQuery({
    queryKey: ['member-permissions', selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember?.id || !church?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', selectedMember.id)
        .eq('church_id', church.id);
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!selectedMember?.id && !!church?.id && profile?.role === 'pastor'
  });

  // Reset permission form when member changes
  useEffect(() => {
    if (memberPermissions && memberPermissions.length > 0) {
      const perm = memberPermissions[0];
      setPermDepartment(perm.department || "none");
      setPermLeadershipRole(perm.leadership_role || "none");
      setPermissionFlags({
        canAssignTasks: perm.can_assign_tasks,
        canViewReports: perm.can_view_reports,
        canManageMembers: perm.can_manage_members,
        canManageEvents: perm.can_manage_events,
        canManageFinances: perm.can_manage_finances,
        canManageDepartment: perm.can_manage_department,
      });
    } else {
      setPermDepartment("none");
      setPermLeadershipRole("none");
      setPermissionFlags({
        canAssignTasks: false,
        canViewReports: false,
        canManageMembers: false,
        canManageEvents: false,
        canManageFinances: false,
        canManageDepartment: false,
      });
    }
  }, [memberPermissions]);

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember?.id || !church?.id) throw new Error("Missing required data");
      
      const permissionData = {
        user_id: selectedMember.id,
        church_id: church.id,
        department: permDepartment && permDepartment !== 'none' ? permDepartment : null,
        leadership_role: permLeadershipRole && permLeadershipRole !== 'none' ? permLeadershipRole : null,
        can_assign_tasks: permissionFlags.canAssignTasks,
        can_view_reports: permissionFlags.canViewReports,
        can_manage_members: permissionFlags.canManageMembers,
        can_manage_events: permissionFlags.canManageEvents,
        can_manage_finances: permissionFlags.canManageFinances,
        can_manage_department: permissionFlags.canManageDepartment,
      };

      if (memberPermissions && memberPermissions.length > 0) {
        // Update existing
        const { error } = await supabase
          .from('user_permissions')
          .update(permissionData)
          .eq('id', memberPermissions[0].id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-permissions', selectedMember?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: "Permissions saved", description: `Permissions for ${selectedMember?.fullName} have been updated` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const removePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!memberPermissions || memberPermissions.length === 0) throw new Error("No permissions to remove");
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', memberPermissions[0].id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-permissions', selectedMember?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: "Permissions removed", description: `Permissions for ${selectedMember?.fullName} have been removed` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const filteredMembers = members?.filter(m => 
    m.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    m.role?.toLowerCase().includes(search.toLowerCase())
  );

  const canManageMembers = profile?.role === 'pastor' || profile?.role === 'admin' || profile?.role === 'worker';
  const isPastor = profile?.role === 'pastor';

  const handleMemberClick = (member: DbUser) => {
    if (canManageMembers) {
      setSelectedMember(member);
      setNewRole(member.role || 'guest');
      setIsModalOpen(true);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return;
    
    setIsSavingRole(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedMember.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setSelectedMember({ ...selectedMember, role: newRole as DbUser['role'] });
      
      toast({
        title: "Role Updated",
        description: `${selectedMember.fullName}'s role has been changed to ${newRole}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedMember || !newTaskTitle.trim()) return;
    
    setIsCreatingTask(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle,
          description: newTaskDescription,
          assigned_to: selectedMember.id,
          assigned_by: profile?.id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTaskTitle("");
      setNewTaskDescription("");
      
      toast({
        title: "Task Assigned",
        description: `Task "${newTaskTitle}" has been assigned to ${selectedMember.fullName}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const memberTasks = selectedMember 
    ? tasks?.filter(t => t.assignedTo === selectedMember.id)
    : [];

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName || !profile?.churchId) return;
    
    setIsCreatingUser(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
          role: newUserRole,
          churchId: profile.churchId,
          department: newUserDepartment && newUserDepartment !== 'none' ? newUserDepartment : null
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      queryClient.invalidateQueries({ queryKey: ['members'] });
      
      // Reset form
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      setNewUserRole("member");
      setNewUserDepartment("");
      setIsCreateUserOpen(false);
      
      toast({
        title: "User Created",
        description: `${newUserFullName} has been added as a ${newUserRole}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'pastor': return 'default';
      case 'admin': return 'default';
      case 'worker': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Members Directory</h1>
          <p className="text-muted-foreground">
            {canManageMembers ? "Click on a member to view details and manage" : "Manage your church community"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(profile?.role === 'pastor' || profile?.role === 'admin') && (
            <Button 
              onClick={() => setIsCreateUserOpen(true)}
              data-testid="button-create-user"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Find a member..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64"
              data-testid="input-search-members"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers?.map((member) => (
          <div 
            key={member.id} 
            className={`bg-card p-6 rounded-2xl border border-border/50 shadow-sm transition-all flex items-center gap-4 ${
              canManageMembers ? 'cursor-pointer hover-elevate' : ''
            }`}
            onClick={() => handleMemberClick(member)}
            data-testid={`card-member-${member.id}`}
          >
             <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                <AvatarImage src={member.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {member.fullName?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
             </Avatar>
             <div>
               <h3 className="font-bold text-lg">{member.fullName}</h3>
               <div className="flex flex-wrap items-center gap-2 mt-1">
                 <Badge variant={getRoleBadgeVariant(member.role || '')} className="capitalize font-normal">
                   {member.role}
                 </Badge>
                 {member.createdAt && (
                   <span className="text-xs text-muted-foreground">
                     Joined {format(new Date(member.createdAt), 'yyyy')}
                   </span>
                 )}
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Member Profile Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedMember?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {selectedMember?.fullName?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedMember?.fullName}</span>
                <Badge variant="secondary" className="ml-2 capitalize">
                  {selectedMember?.role}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              Manage member profile, role, {isPastor ? "permissions, " : ""}and task assignments
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="w-full justify-start flex-wrap">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="role" className="gap-2">
                <Shield className="w-4 h-4" />
                Role
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              {isPastor && (
                <TabsTrigger value="permissions" className="gap-2">
                  <Key className="w-4 h-4" />
                  Permissions
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Member Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Full Name</Label>
                      <p className="font-medium">{selectedMember?.fullName || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p className="font-medium">{selectedMember?.email || 'Not available'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Language</Label>
                      <p className="font-medium capitalize">{selectedMember?.language || 'English'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Birthday</Label>
                      <p className="font-medium">
                        {selectedMember?.birthdayDay && selectedMember?.birthdayMonth
                          ? `${selectedMember.birthdayMonth}/${selectedMember.birthdayDay}`
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Joined</Label>
                      <p className="font-medium">
                        {selectedMember?.createdAt
                          ? format(new Date(selectedMember.createdAt), 'MMM d, yyyy')
                          : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Current Role</Label>
                      <Badge variant={getRoleBadgeVariant(selectedMember?.role || '')} className="capitalize mt-1">
                        {selectedMember?.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Change Member Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select New Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger data-testid="select-member-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {profile?.role === 'pastor' && (
                          <SelectItem value="admin">Admin</SelectItem>
                        )}
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Admin:</strong> Full access except pastoral duties</p>
                    <p><strong>Worker:</strong> Can manage attendance, tasks, and reports</p>
                    <p><strong>Member:</strong> Regular church member access</p>
                    <p><strong>Guest:</strong> Limited read-only access</p>
                  </div>
                  <Button 
                    onClick={handleRoleChange} 
                    disabled={isSavingRole || newRole === selectedMember?.role}
                    className="gap-2"
                    data-testid="button-save-role"
                  >
                    {isSavingRole ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Save Role</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assign New Task</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Task Title</Label>
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Enter task title"
                      data-testid="input-task-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Enter task description"
                      rows={3}
                      data-testid="input-task-description"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateTask} 
                    disabled={isCreatingTask || !newTaskTitle.trim()}
                    className="gap-2"
                    data-testid="button-assign-task"
                  >
                    {isCreatingTask ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Assign Task</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {memberTasks && memberTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Tasks ({memberTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {memberTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in_progress' ? 'secondary' : 'outline'
                          } className="capitalize">
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isPastor && (
              <TabsContent value="permissions" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Manage Permissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingPermissions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Select value={permDepartment} onValueChange={setPermDepartment}>
                            <SelectTrigger data-testid="select-perm-department">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No department</SelectItem>
                              {DEPARTMENTS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Leadership Role (Optional)</Label>
                          <Select value={permLeadershipRole} onValueChange={setPermLeadershipRole}>
                            <SelectTrigger data-testid="select-perm-leadership">
                              <SelectValue placeholder="No leadership role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No leadership role</SelectItem>
                              {LEADERSHIP_ROLES.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 pt-2">
                          <Label className="block">Permission Flags</Label>
                          
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-assign-tasks"
                              checked={permissionFlags.canAssignTasks}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canAssignTasks: !!c}))}
                              data-testid="checkbox-perm-assign-tasks"
                            />
                            <div>
                              <Label htmlFor="perm-assign-tasks" className="cursor-pointer font-medium">Can Assign Tasks</Label>
                              <p className="text-xs text-muted-foreground">Assign tasks to other users</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-view-reports"
                              checked={permissionFlags.canViewReports}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canViewReports: !!c}))}
                              data-testid="checkbox-perm-view-reports"
                            />
                            <div>
                              <Label htmlFor="perm-view-reports" className="cursor-pointer font-medium">Can View Reports</Label>
                              <p className="text-xs text-muted-foreground">Access church reports and analytics</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-manage-members"
                              checked={permissionFlags.canManageMembers}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canManageMembers: !!c}))}
                              data-testid="checkbox-perm-manage-members"
                            />
                            <div>
                              <Label htmlFor="perm-manage-members" className="cursor-pointer font-medium">Can Manage Members</Label>
                              <p className="text-xs text-muted-foreground">Add, edit, and manage church members</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-manage-events"
                              checked={permissionFlags.canManageEvents}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canManageEvents: !!c}))}
                              data-testid="checkbox-perm-manage-events"
                            />
                            <div>
                              <Label htmlFor="perm-manage-events" className="cursor-pointer font-medium">Can Manage Events</Label>
                              <p className="text-xs text-muted-foreground">Create and manage church events</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-manage-finances"
                              checked={permissionFlags.canManageFinances}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canManageFinances: !!c}))}
                              data-testid="checkbox-perm-manage-finances"
                            />
                            <div>
                              <Label htmlFor="perm-manage-finances" className="cursor-pointer font-medium">Can Manage Finances</Label>
                              <p className="text-xs text-muted-foreground">Access financial records</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Checkbox 
                              id="perm-manage-department"
                              checked={permissionFlags.canManageDepartment}
                              onCheckedChange={(c) => setPermissionFlags(p => ({...p, canManageDepartment: !!c}))}
                              data-testid="checkbox-perm-manage-department"
                            />
                            <div>
                              <Label htmlFor="perm-manage-department" className="cursor-pointer font-medium">Can Manage Department</Label>
                              <p className="text-xs text-muted-foreground">Full management of assigned department</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                          <Button 
                            onClick={() => savePermissionsMutation.mutate()}
                            disabled={savePermissionsMutation.isPending}
                            className="gap-2"
                            data-testid="button-save-permissions"
                          >
                            {savePermissionsMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                              <><Check className="w-4 h-4" /> Save Permissions</>
                            )}
                          </Button>
                          
                          {memberPermissions && memberPermissions.length > 0 && (
                            <Button 
                              variant="outline"
                              onClick={() => removePermissionsMutation.mutate()}
                              disabled={removePermissionsMutation.isPending}
                              data-testid="button-remove-permissions"
                            >
                              {removePermissionsMutation.isPending ? "Removing..." : "Remove All Permissions"}
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new member directly with a specific role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newUserFullName}
                onChange={(e) => setNewUserFullName(e.target.value)}
                placeholder="Enter full name"
                data-testid="input-new-user-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-new-user-email"
              />
            </div>

            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Enter temporary password (min 6 chars)"
                data-testid="input-new-user-password"
              />
              <p className="text-xs text-muted-foreground">
                User will need to change this on first login
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {profile?.role === 'pastor' && (
                    <SelectItem value="pastor">Pastor</SelectItem>
                  )}
                  {profile?.role === 'pastor' && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                <SelectTrigger data-testid="select-new-user-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
                data-testid="button-cancel-create-user"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={isCreatingUser || !newUserEmail || !newUserPassword || !newUserFullName}
                data-testid="button-submit-create-user"
              >
                {isCreatingUser ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Create User</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
