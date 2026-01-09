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
import { Plus, ClipboardList, FileText, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface DepartmentReport {
  id: string;
  department: string;
  week_start_date: string;
  week_end_date: string;
  summary: string | null;
  highlights: string | null;
  challenges: string | null;
  next_week_plan: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  submitter?: { full_name: string };
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

export default function DepartmentReports() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const isPastorOrAdmin = profile?.role === 'pastor' || profile?.role === 'admin';
  
  const today = new Date();
  const [department, setDepartment] = useState("");
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(today), 'yyyy-MM-dd'));
  const [weekEndDate, setWeekEndDate] = useState(format(endOfWeek(today), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextWeekPlan, setNextWeekPlan] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['department-reports', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('department_reports')
        .select(`
          *,
          submitter:submitted_by(full_name)
        `)
        .eq('church_id', church.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DepartmentReport[];
    },
    enabled: !!church?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Missing required data");
      
      const { error } = await supabase
        .from('department_reports')
        .insert({
          church_id: church.id,
          department,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          summary,
          highlights: highlights || null,
          challenges: challenges || null,
          next_week_plan: nextWeekPlan || null,
          status: 'submitted',
          submitted_by: profile.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-reports'] });
      toast({ title: "Report submitted", description: "Your department report has been submitted" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      const { error } = await supabase
        .from('department_reports')
        .update({ 
          status, 
          review_notes: reviewNotes || null,
          reviewed_by: profile?.id,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-reports'] });
      toast({ title: "Status updated" });
    }
  });

  const resetForm = () => {
    setDepartment("");
    setWeekStartDate(format(startOfWeek(today), 'yyyy-MM-dd'));
    setWeekEndDate(format(endOfWeek(today), 'yyyy-MM-dd'));
    setSummary("");
    setHighlights("");
    setChallenges("");
    setNextWeekPlan("");
  };

  const stats = {
    total: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    approved: reports.filter(r => r.status === 'approved').length,
    needsRevision: reports.filter(r => r.status === 'needs_revision').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'submitted': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Submitted</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'needs_revision': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Needs Revision</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Layout>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dept-reports-title">
            Department Reports
          </h1>
          <p className="text-muted-foreground text-sm">Review and manage department weekly reports</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-submit-report">
              <Plus className="w-4 h-4" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Department Report</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Week Start</Label>
                  <Input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    data-testid="input-week-start"
                  />
                </div>
                <div>
                  <Label>Week End</Label>
                  <Input
                    type="date"
                    value={weekEndDate}
                    onChange={(e) => setWeekEndDate(e.target.value)}
                    data-testid="input-week-end"
                  />
                </div>
              </div>

              <div>
                <Label>Summary *</Label>
                <Textarea
                  placeholder="Brief summary of the week's activities..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  data-testid="textarea-summary"
                />
              </div>

              <div>
                <Label>Highlights</Label>
                <Textarea
                  placeholder="Key achievements and positive outcomes..."
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  data-testid="textarea-highlights"
                />
              </div>

              <div>
                <Label>Challenges</Label>
                <Textarea
                  placeholder="Difficulties encountered..."
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  data-testid="textarea-challenges"
                />
              </div>

              <div>
                <Label>Next Week Plan</Label>
                <Textarea
                  placeholder="Plans and goals for next week..."
                  value={nextWeekPlan}
                  onChange={(e) => setNextWeekPlan(e.target.value)}
                  data-testid="textarea-next-week"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!department || !summary || createMutation.isPending}
                className="gap-2"
                data-testid="button-submit"
              >
                <Send className="w-4 h-4" />
                {createMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-2xl font-bold text-foreground">{stats.submitted}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Needs Revision</p>
              <p className="text-2xl font-bold text-foreground">{stats.needsRevision}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground">All Department Reports</h3>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports submitted yet</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="p-4" data-testid={`row-report-${report.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{report.department}</h4>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Week: {format(new Date(report.week_start_date), 'MMM d')} - {format(new Date(report.week_end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By: {report.submitter?.full_name || 'Unknown'}
                    </p>
                    {report.summary && (
                      <p className="text-sm text-foreground mt-2 line-clamp-2">{report.summary}</p>
                    )}
                    {report.review_notes && (
                      <p className="text-sm text-amber-600 mt-2">Review: {report.review_notes}</p>
                    )}
                  </div>
                  {isPastorOrAdmin && report.status === 'submitted' && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'needs_revision', reviewNotes: 'Please review and update' })}
                      >
                        Request Revision
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'approved' })}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Layout>
  );
}
