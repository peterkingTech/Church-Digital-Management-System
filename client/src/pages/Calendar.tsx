import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  event_type: string;
}

export default function CalendarPage() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("event");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('church_id', church.id)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!church?.id
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Missing required data");
      
      const { error } = await supabase
        .from('events')
        .insert({
          church_id: church.id,
          title,
          description: description || null,
          start_date: startDate,
          end_date: endDate || null,
          all_day: allDay,
          location: location || null,
          event_type: eventType,
          created_by: profile.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "Event created", description: "Your event has been added to the calendar" });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setEndDate("");
    setAllDay(false);
    setLocation("");
    setEventType("event");
  };

  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_date,
    end: event.end_date || undefined,
    allDay: event.all_day,
    backgroundColor: getEventColor(event.event_type),
    borderColor: getEventColor(event.event_type),
  }));

  function getEventColor(type: string) {
    switch (type) {
      case 'service': return '#1e3a5f';
      case 'meeting': return '#f59e0b';
      case 'event': return '#10b981';
      case 'appointment': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  return (
    <Layout>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-calendar-title">
            Calendar
          </h1>
          <p className="text-muted-foreground text-sm">Manage events, meetings, and appointments</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-event">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="event-title">Title *</Label>
                <Input
                  id="event-title"
                  placeholder="Enter event title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-event-title"
                />
              </div>

              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="all-day" 
                  checked={allDay} 
                  onCheckedChange={(c) => setAllDay(!!c)}
                  data-testid="checkbox-all-day"
                />
                <Label htmlFor="all-day" className="cursor-pointer">All day event</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type={allDay ? "date" : "datetime-local"}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type={allDay ? "date" : "datetime-local"}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  data-testid="input-location"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter event description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="textarea-description"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!title || !startDate || createMutation.isPending}
                data-testid="button-create-event"
              >
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="p-4">
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            height={600}
            eventClick={(info) => {
              const event = events.find(e => e.id === info.event.id);
              if (event) {
                toast({
                  title: event.title,
                  description: `${event.event_type} - ${event.location || 'No location'}`
                });
              }
            }}
          />
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1e3a5f]"></div>
          <span className="text-sm text-muted-foreground">Service</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
          <span className="text-sm text-muted-foreground">Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
          <span className="text-sm text-muted-foreground">Event</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
          <span className="text-sm text-muted-foreground">Appointment</span>
        </div>
      </div>
    </Layout>
  );
}
