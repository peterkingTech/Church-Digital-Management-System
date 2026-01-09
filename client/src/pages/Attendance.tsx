import { Layout } from "@/components/Layout";
import { useAttendance, useMarkAttendance, useMembers } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, UserPlus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

const attendanceSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  serviceDate: z.string().min(1, "Date is required"),
  signIn: z.string().optional()
});
type AttendanceForm = z.infer<typeof attendanceSchema>;

export default function Attendance() {
  const { data: attendanceList, isLoading } = useAttendance();
  const { data: members } = useMembers();
  const markAttendance = useMarkAttendance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      serviceDate: format(new Date(), 'yyyy-MM-dd'),
      signIn: format(new Date(), 'HH:mm')
    }
  });

  const onSubmit = (data: AttendanceForm) => {
    markAttendance.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const filteredAttendance = attendanceList?.filter(record => 
    record.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Attendance</h1>
          <p className="text-muted-foreground">Track member participation and service stats</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-primary rounded-xl px-6">
              <UserPlus className="w-4 h-4" /> Check In
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Manual Check-In</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Member</label>
                <Select onValueChange={(val) => form.setValue("userId", val)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Search member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.userId && <p className="text-destructive text-sm">Select a member</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" {...form.register("serviceDate")} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <Input type="time" {...form.register("signIn")} className="rounded-xl" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={markAttendance.isPending} className="rounded-xl">
                  {markAttendance.isPending ? "Checking In..." : "Check In"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <input 
               placeholder="Search records..." 
               className="w-full pl-9 pr-4 py-2 bg-secondary/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
             <CalendarIcon className="w-4 h-4" />
             {format(new Date(), 'MMM d, yyyy')}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/30 text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                 <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading records...</td></tr>
              ) : filteredAttendance?.length === 0 ? (
                 <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No attendance records found</td></tr>
              ) : (
                filteredAttendance?.map((record) => (
                  <tr key={record.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                           {record.users?.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{record.users?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {record.serviceDate ? format(new Date(record.serviceDate), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                      {record.signIn ? record.signIn.substring(0, 5) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Present
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
