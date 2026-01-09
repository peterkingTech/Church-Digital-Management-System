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
import { Plus, BookOpen, Calendar, Users, FileText, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Directive {
  id: string;
  title: string;
  content: string;
  service_date: string;
  type: string;
  target_audience: string;
  created_at: string;
  created_by: string;
}

export default function PastorsDesk() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [serviceDate, setServiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState("report");
  const [targetAudience, setTargetAudience] = useState("all_staff");

  const { data: directives = [], isLoading } = useQuery({
    queryKey: ['directives', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('directives')
        .select('*')
        .eq('church_id', church.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Directive[];
    },
    enabled: !!church?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Missing required data");
      
      const { error } = await supabase
        .from('directives')
        .insert({
          church_id: church.id,
          title,
          content,
          service_date: serviceDate,
          type,
          target_audience: targetAudience,
          created_by: profile.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directives'] });
      toast({ title: "Directive sent", description: "Your directive has been sent successfully" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setServiceDate(format(new Date(), 'yyyy-MM-dd'));
    setType("report");
    setTargetAudience("all_staff");
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'report': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'announcement': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'instruction': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'prayer': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAudienceLabel = (a: string) => {
    switch (a) {
      case 'all_staff': return 'All Staff';
      case 'leaders': return 'Leaders Only';
      case 'workers': return 'Workers';
      case 'all_members': return 'All Members';
      default: return a;
    }
  };

  return (
    <Layout>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-pastors-desk-title">
            Pastor's Desk
          </h1>
          <p className="text-muted-foreground text-sm">Service summaries and directives</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-directive">
              <Plus className="w-4 h-4" />
              Add Directive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Service Directive</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="directive-title">Title *</Label>
                <Input
                  id="directive-title"
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-directive-title"
                />
              </div>

              <div>
                <Label htmlFor="service-date">Service Date</Label>
                <Input
                  id="service-date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  data-testid="input-service-date"
                />
              </div>

              <div>
                <Label htmlFor="directive-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-directive-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="instruction">Instruction</SelectItem>
                    <SelectItem value="prayer">Prayer Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-audience">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger data-testid="select-target-audience">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_staff">All Staff</SelectItem>
                    <SelectItem value="leaders">Leaders Only</SelectItem>
                    <SelectItem value="workers">Workers</SelectItem>
                    <SelectItem value="all_members">All Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="directive-content">Content *</Label>
                <Textarea
                  id="directive-content"
                  placeholder="Enter detailed content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-directive-content"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!title || !content || createMutation.isPending}
                className="gap-2"
                data-testid="button-send-directive"
              >
                <Send className="w-4 h-4" />
                {createMutation.isPending ? "Sending..." : "Send Directive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading directives...</p>
          </Card>
        ) : directives.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">No directives yet</h3>
            <p className="text-sm text-muted-foreground">Create your first service directive to get started</p>
          </Card>
        ) : (
          directives.map((directive) => (
            <Card key={directive.id} className="p-4" data-testid={`card-directive-${directive.id}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getTypeColor(directive.type)}>
                      {directive.type}
                    </Badge>
                    <Badge variant="outline">
                      {getAudienceLabel(directive.target_audience)}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-foreground">{directive.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{directive.content}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {directive.service_date ? format(new Date(directive.service_date), 'MMM d, yyyy') : 'No date'}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
}
