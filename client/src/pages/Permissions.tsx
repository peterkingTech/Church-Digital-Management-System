import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Shield, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface UserPermission {
  id: string;
  user_id: string;
  department: string | null;
  leadership_role: string | null;
  can_assign_tasks: boolean;
  can_view_reports: boolean;
  can_manage_members: boolean;
  can_manage_events: boolean;
  can_manage_finances: boolean;
  can_manage_department: boolean;
  user?: { full_name: string; role: string };
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

const DEPARTMENTS = [
  "Choir/Music",
  "Ushering",
  "Technical/Media",
  "Children's Ministry",
  "Youth Ministry",
  "Women's Ministry",
  "Men's Ministry",
  "Evangelism",
  "Prayer",
  "Welfare",
  "Protocol",
  "Hospitality"
];

const LEADERSHIP_ROLES = [
  "Department Head",
  "Assistant Head",
  "Coordinator",
  "Secretary",
  "Treasurer"
];

export default function Permissions() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<UserPermission | null>(null);
  
  const [selectedUser, setSelectedUser] = useState("");
  const [department, setDepartment] = useState("");
  const [leadershipRole, setLeadershipRole] = useState("");
  const [permissions, setPermissions] = useState({
    canAssignTasks: false,
    canViewReports: false,
    canManageMembers: false,
    canManageEvents: false,
    canManageFinances: false,
    canManageDepartment: false,
  });

  const { data: userPermissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          user:user_id(full_name, role)
        `)
        .eq('church_id', church.id);
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!church?.id
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('church_id', church.id);
      if (error) throw error;
      return data as User[];
    },
    enabled: !!church?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !selectedUser) throw new Error("Missing required data");
      
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: selectedUser,
          church_id: church.id,
          department: department || null,
          leadership_role: leadershipRole && leadershipRole !== 'none' ? leadershipRole : null,
          can_assign_tasks: permissions.canAssignTasks,
          can_view_reports: permissions.canViewReports,
          can_manage_members: permissions.canManageMembers,
          can_manage_events: permissions.canManageEvents,
          can_manage_finances: permissions.canManageFinances,
          can_manage_department: permissions.canManageDepartment,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: "Permissions assigned", description: "User permissions have been created" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingPermission?.id) throw new Error("No permission selected");
      
      const { error } = await supabase
        .from('user_permissions')
        .update({
          department: department || null,
          leadership_role: leadershipRole && leadershipRole !== 'none' ? leadershipRole : null,
          can_assign_tasks: permissions.canAssignTasks,
          can_view_reports: permissions.canViewReports,
          can_manage_members: permissions.canManageMembers,
          can_manage_events: permissions.canManageEvents,
          can_manage_finances: permissions.canManageFinances,
          can_manage_department: permissions.canManageDepartment,
        })
        .eq('id', editingPermission.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: "Permissions updated", description: "User permissions have been saved" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: "Permissions removed" });
    }
  });

  const resetForm = () => {
    setSelectedUser("");
    setDepartment("");
    setLeadershipRole("");
    setPermissions({
      canAssignTasks: false,
      canViewReports: false,
      canManageMembers: false,
      canManageEvents: false,
      canManageFinances: false,
      canManageDepartment: false,
    });
    setEditingPermission(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditDialog = (perm: UserPermission) => {
    setEditingPermission(perm);
    setSelectedUser(perm.user_id);
    setDepartment(perm.department || "");
    setLeadershipRole(perm.leadership_role || "none");
    setPermissions({
      canAssignTasks: perm.can_assign_tasks,
      canViewReports: perm.can_view_reports,
      canManageMembers: perm.can_manage_members,
      canManageEvents: perm.can_manage_events,
      canManageFinances: perm.can_manage_finances,
      canManageDepartment: perm.can_manage_department,
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (editingPermission) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const getPermissionsList = (perm: UserPermission) => {
    const list = [];
    if (perm.can_assign_tasks) list.push("Assign Tasks");
    if (perm.can_view_reports) list.push("View Reports");
    if (perm.can_manage_members) list.push("Manage Members");
    if (perm.can_manage_events) list.push("Manage Events");
    if (perm.can_manage_finances) list.push("Manage Finances");
    if (perm.can_manage_department) list.push("Manage Department");
    return list;
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-permissions-title">
            User Permissions
          </h1>
          <p className="text-muted-foreground text-sm">Manage user roles and permissions for church operations</p>
        </div>
        
        <Button className="gap-2" onClick={openCreateDialog} data-testid="button-assign-permissions">
          <Plus className="w-4 h-4" />
          Assign Permissions
        </Button>
      </header>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPermission ? "Edit User Permissions" : "Assign User Permissions"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Select User *</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={!!editingPermission}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Choose user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Leadership Role (Optional)</Label>
              <Select value={leadershipRole} onValueChange={setLeadershipRole}>
                <SelectTrigger data-testid="select-leadership-role">
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

            <div>
              <Label className="mb-3 block">Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-assign-tasks"
                    checked={permissions.canAssignTasks}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canAssignTasks: !!c}))}
                    data-testid="checkbox-assign-tasks"
                  />
                  <div>
                    <Label htmlFor="can-assign-tasks" className="cursor-pointer font-medium">Can Assign Tasks</Label>
                    <p className="text-xs text-muted-foreground">Ability to assign tasks to other users</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-view-reports"
                    checked={permissions.canViewReports}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canViewReports: !!c}))}
                    data-testid="checkbox-view-reports"
                  />
                  <div>
                    <Label htmlFor="can-view-reports" className="cursor-pointer font-medium">Can View Reports</Label>
                    <p className="text-xs text-muted-foreground">Access to church reports and analytics</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-manage-members"
                    checked={permissions.canManageMembers}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canManageMembers: !!c}))}
                    data-testid="checkbox-manage-members"
                  />
                  <div>
                    <Label htmlFor="can-manage-members" className="cursor-pointer font-medium">Can Manage Members</Label>
                    <p className="text-xs text-muted-foreground">Add, edit, and manage church members</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-manage-events"
                    checked={permissions.canManageEvents}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canManageEvents: !!c}))}
                    data-testid="checkbox-manage-events"
                  />
                  <div>
                    <Label htmlFor="can-manage-events" className="cursor-pointer font-medium">Can Manage Events</Label>
                    <p className="text-xs text-muted-foreground">Create and manage church events</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-manage-finances"
                    checked={permissions.canManageFinances}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canManageFinances: !!c}))}
                    data-testid="checkbox-manage-finances"
                  />
                  <div>
                    <Label htmlFor="can-manage-finances" className="cursor-pointer font-medium">Can Manage Finances</Label>
                    <p className="text-xs text-muted-foreground">Access to financial records and management</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox 
                    id="can-manage-department"
                    checked={permissions.canManageDepartment}
                    onCheckedChange={(c) => setPermissions(p => ({...p, canManageDepartment: !!c}))}
                    data-testid="checkbox-manage-department"
                  />
                  <div>
                    <Label htmlFor="can-manage-department" className="cursor-pointer font-medium">Can Manage Department</Label>
                    <p className="text-xs text-muted-foreground">Full management of assigned department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedUser || !department || isSubmitting}
              data-testid="button-save-permissions"
            >
              {isSubmitting ? "Saving..." : (editingPermission ? "Save Changes" : "Assign Permissions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Current User Permissions</h3>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : userPermissions.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No permissions assigned yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Assign Permissions" to give users specific access rights</p>
            </div>
          ) : (
            userPermissions.map((perm) => (
              <div key={perm.id} className="p-4" data-testid={`row-permission-${perm.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-foreground">{perm.user?.full_name || 'Unknown'}</h4>
                      <Badge variant="secondary" className="capitalize">{perm.user?.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {perm.department}
                      {perm.leadership_role && ` - ${perm.leadership_role}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getPermissionsList(perm).length > 0 ? (
                        getPermissionsList(perm).map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {p}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No specific permissions assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditDialog(perm)}
                      data-testid={`button-edit-permission-${perm.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteMutation.mutate(perm.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-permission-${perm.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Layout>
  );
}
