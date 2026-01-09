import { Layout } from "@/components/Layout";
import { useAnnouncements, useCreateAnnouncement } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

type AnnouncementForm = { title: string, content: string };

export default function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<AnnouncementForm>();

  const onSubmit = (data: AnnouncementForm) => {
    createAnnouncement.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      }
    });
  };

  return (
    <Layout>
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Announcements</h1>
          <p className="text-muted-foreground">Broadcast updates to your congregation</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-primary rounded-xl px-6">
              <Plus className="w-4 h-4" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Headline</label>
                <Input {...register("title", { required: true })} placeholder="Sunday Service Update" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea {...register("content", { required: true })} placeholder="Write your message here..." className="rounded-xl min-h-[120px]" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createAnnouncement.isPending} className="rounded-xl">
                  {createAnnouncement.isPending ? "Posting..." : "Post Announcement"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div>Loading announcements...</div>
        ) : announcements?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No announcements</h3>
            <p className="text-muted-foreground">Keep your church informed by creating the first one.</p>
          </div>
        ) : (
          announcements?.map((item) => (
            <div key={item.id} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : ''}
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
