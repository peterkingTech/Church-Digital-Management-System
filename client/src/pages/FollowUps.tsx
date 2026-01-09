import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, UserCheck, Clock, Phone, Home, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface FollowUp {
  id: string;
  guest_id: string;
  assigned_to: string;
  status: string;
  notes: string | null;
  visit_date: string | null;
  created_at: string;
  guest?: { full_name: string };
  assignee?: { full_name: string };
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

export default function FollowUps() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [guestId, setGuestId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['follow-ups', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          guest:guest_id(full_name),
          assignee:assigned_to(full_name)
        `)
        .eq('church_id', church.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FollowUp[];
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

  const guests = users.filter(u => u.role === 'guest');
  const workers = users.filter(u => ['pastor', 'admin', 'worker'].includes(u.role));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id) throw new Error("Missing church");
      
      const { error } = await supabase
        .from('follow_ups')
        .insert({
          church_id: church.id,
          guest_id: guestId,
          assigned_to: assignedTo || null,
          notes: notes || null,
          visit_date: visitDate || null,
          status: 'pending'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      toast({ title: "Follow-up created", description: "Follow-up record has been added" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('follow_ups')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      toast({ title: "Status updated" });
    }
  });

  const resetForm = () => {
    setGuestId("");
    setAssignedTo("");
    setNotes("");
    setVisitDate("");
  };

  const stats = {
    total: followUps.length,
    pending: followUps.filter(f => f.status === 'pending').length,
    contacted: followUps.filter(f => f.status === 'contacted').length,
    integrated: followUps.filter(f => f.status === 'integrated').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'contacted': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Contacted</Badge>;
      case 'visited': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Visited</Badge>;
      case 'integrated': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Integrated</Badge>;
      case 'closed': return <Badge variant="outline">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Layout>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-followups-title">
            Follow-up System
          </h1>
          <p className="text-muted-foreground text-sm">Track and manage guest follow-up activities</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-followup">
              <Plus className="w-4 h-4" />
              Add Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add Follow-up Record</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Guest *</Label>
                <Select value={guestId} onValueChange={setGuestId}>
                  <SelectTrigger data-testid="select-guest">
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger data-testid="select-assigned-to">
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Planned Visit Date</Label>
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  data-testid="input-visit-date"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about this follow-up..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="textarea-notes"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!guestId || createMutation.isPending}
                data-testid="button-create-followup"
              >
                {createMutation.isPending ? "Creating..." : "Create Follow-up"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Follow-ups</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Visits</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contacted</p>
              <p className="text-2xl font-bold text-foreground">{stats.contacted}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Integrated</p>
              <p className="text-2xl font-bold text-foreground">{stats.integrated}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Follow-up Records</h3>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : followUps.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No follow-up records yet</p>
            </div>
          ) : (
            followUps.map((fu) => (
              <div key={fu.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid={`row-followup-${fu.id}`}>
                <div>
                  <p className="font-medium text-foreground">{fu.guest?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    Assigned to: {fu.assignee?.full_name || 'Unassigned'}
                    {fu.visit_date && ` | Visit: ${format(new Date(fu.visit_date), 'MMM d, yyyy')}`}
                  </p>
                  {fu.notes && <p className="text-sm text-muted-foreground mt-1">{fu.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(fu.status)}
                  <Select 
                    value={fu.status} 
                    onValueChange={(v) => updateStatusMutation.mutate({ id: fu.id, status: v })}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="visited">Visited</SelectItem>
                      <SelectItem value="integrated">Integrated</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Layout>
  );
}
