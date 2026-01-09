import { Layout } from "@/components/Layout";
import { useTasks, useCreateTask, useUpdateTask } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, Circle, Clock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import clsx from "clsx";

const createTaskFormSchema = insertTaskSchema.pick({ title: true, description: true, status: true });
type CreateTaskForm = z.infer<typeof createTaskFormSchema>;

export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: { status: 'pending' }
  });

  const onSubmit = (data: CreateTaskForm) => {
    createTask.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ id, status: newStatus as any });
  };

  if (isLoading) return <Layout><div className="p-12 text-center">Loading tasks...</div></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Tasks</h1>
          <p className="text-muted-foreground">Manage responsibilities and assignments</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-primary rounded-xl px-6">
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Title</label>
                <Input {...form.register("title")} placeholder="e.g. Prepare Sunday Slides" className="rounded-xl" />
                {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input {...form.register("description")} placeholder="Details about the task..." className="rounded-xl" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createTask.isPending} className="rounded-xl">
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tasks?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No tasks yet</h3>
            <p className="text-muted-foreground">Create your first task to get started.</p>
          </div>
        ) : (
          tasks?.map((task) => (
            <div 
              key={task.id} 
              className={clsx(
                "group flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-primary/20",
                task.status === 'completed' && "opacity-60 bg-secondary/20"
              )}
            >
              <button 
                onClick={() => toggleStatus(task.id, task.status || 'pending')}
                className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  task.status === 'completed' 
                    ? "bg-primary border-primary text-white" 
                    : "border-muted-foreground text-transparent hover:border-primary"
                )}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              
              <div className="flex-1">
                <h3 className={clsx(
                  "font-semibold text-lg transition-all",
                  task.status === 'completed' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.createdAt ? format(new Date(task.createdAt), "MMM d") : ""}</span>
                </div>
                <div className={clsx(
                  "px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider",
                  task.status === 'completed' ? "bg-green-100 text-green-700" :
                  task.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                )}>
                  {task.status?.replace('_', ' ')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
