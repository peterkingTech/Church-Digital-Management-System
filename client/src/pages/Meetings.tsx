import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, isToday, addHours } from "date-fns";
import { Plus, Video, Calendar, Clock, Users, Settings, ExternalLink, Trash2, Edit, Link2 } from "lucide-react";
import type { Meeting, ZoomLink, User } from "@shared/schema";

type MeetingWithDetails = Meeting & {
  zoomLink?: ZoomLink;
  creator?: User;
};

const MEETING_TYPES = [
  { value: 'prayer', label: 'Prayer Meeting', icon: '🙏', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  { value: 'church_service', label: 'Church Service', icon: '⛪', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'special_event', label: 'Special Event', icon: '🎉', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'counseling', label: 'Counseling', icon: '💬', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { value: 'custom', label: 'Custom Meeting', icon: '📅', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' }
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public (Everyone)' },
  { value: 'members_only', label: 'Members Only' },
  { value: 'staff_only', label: 'Staff Only' },
  { value: 'private', label: 'Private' }
];

export default function MeetingsPage() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const userRole = profile?.role || 'guest';
  const isAdminOrPastor = userRole === 'pastor' || userRole === 'admin';
  const isGuest = userRole === 'guest';

  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [isManageLinksOpen, setIsManageLinksOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<string>("prayer");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedZoomLinkId, setSelectedZoomLinkId] = useState<string>("custom");
  const [customZoomUrl, setCustomZoomUrl] = useState("");
  const [visibility, setVisibility] = useState("public");
  
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkType, setNewLinkType] = useState("custom");

  const { data: meetings = [], isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meetings', church?.id, userRole],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          zoomLink:zoom_links!zoom_link_id(*),
          creator:users!created_by(id, full_name)
        `)
        .eq('church_id', church.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      
      const allMeetings = data as MeetingWithDetails[];
      return allMeetings.filter(meeting => {
        if (isGuest) {
          if (meeting.meetingType === 'counseling') return false;
          return meeting.visibility === 'public';
        }
        if (userRole === 'member') {
          if (meeting.visibility === 'staff_only' || meeting.visibility === 'private') return false;
          return true;
        }
        if (userRole === 'worker') {
          if (meeting.visibility === 'private' && meeting.createdBy !== profile?.id) return false;
          return true;
        }
        return true;
      });
    },
    enabled: !!church?.id
  });

  const { data: zoomLinks = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ['zoom-links', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('zoom_links')
        .select('*')
        .eq('church_id', church.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as ZoomLink[];
    },
    enabled: !!church?.id
  });

  const now = new Date();
  
  const ongoingMeetings = useMemo(() => 
    meetings.filter(m => {
      const start = new Date(m.startTime);
      const end = m.endTime ? new Date(m.endTime) : addHours(start, 2);
      return isBefore(start, now) && isAfter(end, now);
    }),
    [meetings, now]
  );

  const upcomingMeetings = useMemo(() => 
    meetings.filter(m => isAfter(new Date(m.startTime), now)),
    [meetings, now]
  );

  const pastMeetings = useMemo(() => 
    meetings.filter(m => {
      const end = m.endTime ? new Date(m.endTime) : addHours(new Date(m.startTime), 2);
      return isBefore(end, now);
    }),
    [meetings, now]
  );

  const prayerMeetings = useMemo(() => 
    meetings.filter(m => m.meetingType === 'prayer' && isAfter(new Date(m.startTime), now)),
    [meetings, now]
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMeetingType("prayer");
    setStartTime("");
    setEndTime("");
    setSelectedZoomLinkId("custom");
    setCustomZoomUrl("");
    setVisibility("public");
    setEditingMeeting(null);
  };

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Not authenticated");
      
      const meetingData: any = {
        church_id: church.id,
        title,
        description: description || null,
        meeting_type: meetingType,
        start_time: startTime,
        end_time: endTime || null,
        visibility,
        created_by: profile.id
      };

      if (selectedZoomLinkId && selectedZoomLinkId !== "custom") {
        meetingData.zoom_link_id = selectedZoomLinkId;
      } else if (customZoomUrl) {
        meetingData.custom_zoom_url = customZoomUrl;
      }

      if (editingMeeting) {
        const { error } = await supabase
          .from('meetings')
          .update(meetingData)
          .eq('id', editingMeeting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meetings')
          .insert(meetingData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({ title: editingMeeting ? "Meeting updated" : "Meeting created" });
      setIsCreateMeetingOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to save meeting", description: error.message, variant: "destructive" });
    }
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({ title: "Meeting deleted" });
    }
  });

  const createZoomLinkMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('zoom_links')
        .insert({
          church_id: church.id,
          name: newLinkName,
          url: newLinkUrl,
          meeting_type: newLinkType,
          created_by: profile.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-links'] });
      toast({ title: "Zoom link saved" });
      setNewLinkName("");
      setNewLinkUrl("");
      setNewLinkType("custom");
    },
    onError: (error: any) => {
      toast({ title: "Failed to save link", description: error.message, variant: "destructive" });
    }
  });

  const deleteZoomLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('zoom_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-links'] });
      toast({ title: "Zoom link deleted" });
    }
  });

  const getMeetingTypeInfo = (type: string) => MEETING_TYPES.find(t => t.value === type) || MEETING_TYPES[4];

  const getZoomUrl = (meeting: MeetingWithDetails) => {
    if (isGuest && (meeting.visibility !== 'public' || meeting.meetingType === 'counseling')) {
      return null;
    }
    if (userRole === 'member' && (meeting.visibility === 'staff_only' || meeting.visibility === 'private')) {
      return null;
    }
    return meeting.customZoomUrl || meeting.zoomLink?.url;
  };

  const MeetingCard = ({ meeting }: { meeting: MeetingWithDetails }) => {
    const typeInfo = getMeetingTypeInfo(meeting.meetingType);
    const zoomUrl = getZoomUrl(meeting);
    const startDate = new Date(meeting.startTime);
    const isOngoing = ongoingMeetings.some(m => m.id === meeting.id);

    return (
      <Card className={isOngoing ? 'border-primary' : ''} data-testid={`card-meeting-${meeting.id}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={typeInfo.color}>
                {typeInfo.label}
              </Badge>
              {isOngoing && (
                <Badge variant="default" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{meeting.title}</CardTitle>
            {meeting.description && (
              <CardDescription>{meeting.description}</CardDescription>
            )}
          </div>
          {isAdminOrPastor && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingMeeting(meeting);
                  setTitle(meeting.title);
                  setDescription(meeting.description || "");
                  setMeetingType(meeting.meetingType);
                  setStartTime(String(meeting.startTime).slice(0, 16));
                  setEndTime(meeting.endTime ? String(meeting.endTime).slice(0, 16) : "");
                  setSelectedZoomLinkId(meeting.zoomLinkId || "custom");
                  setCustomZoomUrl(meeting.customZoomUrl || "");
                  setVisibility(meeting.visibility || "public");
                  setIsCreateMeetingOpen(true);
                }}
                data-testid={`button-edit-meeting-${meeting.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMeetingMutation.mutate(meeting.id)}
                data-testid={`button-delete-meeting-${meeting.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(startDate, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(startDate, 'h:mm a')}
              {meeting.endTime && ` - ${format(new Date(meeting.endTime), 'h:mm a')}`}
            </div>
            {meeting.visibility !== 'public' && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {VISIBILITY_OPTIONS.find(v => v.value === meeting.visibility)?.label}
              </div>
            )}
          </div>
        </CardContent>
        {zoomUrl && (
          <CardFooter className="pt-0">
            <Button
              onClick={() => window.open(zoomUrl, '_blank')}
              className="w-full"
              data-testid={`button-join-meeting-${meeting.id}`}
            >
              <Video className="w-4 h-4 mr-2" />
              Join Meeting
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  if (isLoadingMeetings) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-muted-foreground">Loading meetings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Meetings</h1>
            <p className="text-muted-foreground">Join prayer meetings, services, and events</p>
          </div>
          {isAdminOrPastor && (
            <div className="flex gap-2">
              <Dialog open={isManageLinksOpen} onOpenChange={setIsManageLinksOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-manage-links">
                    <Link2 className="w-4 h-4 mr-2" />
                    Manage Links
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Zoom Links</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Add New Link</Label>
                      <Input
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        placeholder="Link name (e.g., Main Church Zoom)"
                        data-testid="input-link-name"
                      />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="Zoom URL"
                        data-testid="input-link-url"
                      />
                      <Select value={newLinkType} onValueChange={setNewLinkType}>
                        <SelectTrigger data-testid="select-link-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main_church">Main Church</SelectItem>
                          <SelectItem value="prayer">Prayer</SelectItem>
                          <SelectItem value="counseling">Counseling</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={() => createZoomLinkMutation.mutate()} 
                        disabled={!newLinkName || !newLinkUrl || createZoomLinkMutation.isPending}
                        data-testid="button-save-link"
                      >
                        Save Link
                      </Button>
                    </div>
                    
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">Saved Links</Label>
                      {zoomLinks.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No saved links yet</p>
                      ) : (
                        <div className="space-y-2">
                          {zoomLinks.map(link => (
                            <div key={link.id} className="flex items-center justify-between p-2 border rounded-md">
                              <div>
                                <p className="font-medium">{link.name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{link.url}</p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteZoomLinkMutation.mutate(link.id)}
                                data-testid={`button-delete-link-${link.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreateMeetingOpen} onOpenChange={(open) => {
                setIsCreateMeetingOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-meeting">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingMeeting ? 'Edit Meeting' : 'Create Meeting'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Meeting title"
                        data-testid="input-meeting-title"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description"
                        data-testid="input-meeting-description"
                      />
                    </div>
                    <div>
                      <Label>Meeting Type</Label>
                      <Select value={meetingType} onValueChange={setMeetingType}>
                        <SelectTrigger data-testid="select-meeting-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          data-testid="input-start-time"
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          data-testid="input-end-time"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Zoom Link</Label>
                      <Select value={selectedZoomLinkId} onValueChange={setSelectedZoomLinkId}>
                        <SelectTrigger data-testid="select-zoom-link">
                          <SelectValue placeholder="Select saved link or enter custom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom URL</SelectItem>
                          {zoomLinks.map(link => (
                            <SelectItem key={link.id} value={link.id}>
                              {link.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!selectedZoomLinkId && (
                        <Input
                          className="mt-2"
                          value={customZoomUrl}
                          onChange={(e) => setCustomZoomUrl(e.target.value)}
                          placeholder="Enter custom Zoom URL"
                          data-testid="input-custom-zoom"
                        />
                      )}
                    </div>
                    <div>
                      <Label>Visibility</Label>
                      <Select value={visibility} onValueChange={setVisibility}>
                        <SelectTrigger data-testid="select-visibility">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createMeetingMutation.mutate()}
                      disabled={!title || !startTime || createMeetingMutation.isPending}
                      data-testid="button-submit-meeting"
                    >
                      {editingMeeting ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {ongoingMeetings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Happening Now
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {ongoingMeetings.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList data-testid="tabs-meetings">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="prayer" data-testid="tab-prayer">
              Prayer ({prayerMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past ({pastMeetings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming meetings scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingMeetings.map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prayer">
            {prayerMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No upcoming prayer meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {prayerMeetings.map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No past meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pastMeetings.slice(0, 10).map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
