import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Check, 
  X, 
  Clock, 
  User,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addHours } from "date-fns";

interface BookingUser {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
}

interface Booking {
  id: string;
  church_id: string;
  requester_id: string;
  target_user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  rejection_reason: string | null;
  approved_by: string | null;
  created_at: string;
  requester?: BookingUser;
  target_user?: BookingUser;
}

const ROLE_BOOKING_TARGETS: Record<string, string[]> = {
  guest: ['admin', 'worker'],
  member: ['pastor', 'admin', 'worker'],
  worker: ['pastor', 'admin'],
  admin: ['pastor', 'admin'],
  pastor: ['pastor', 'admin', 'worker', 'member', 'guest'],
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  completed: '#6b7280',
  cancelled: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BookingsPage() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [startTime, setStartTime] = useState(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"));

  const userRole = profile?.role || 'guest';
  const isAdminOrPastor = userRole === 'admin' || userRole === 'pastor';
  const allowedTargetRoles = ROLE_BOOKING_TARGETS[userRole] || [];

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          requester:requester_id(id, full_name, role, email),
          target_user:target_user_id(id, full_name, role, email)
        `)
        .eq('church_id', church.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!church?.id
  });

  const { data: bookableUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['bookable-users', church?.id, allowedTargetRoles],
    queryFn: async () => {
      if (!church?.id || allowedTargetRoles.length === 0) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, email')
        .eq('church_id', church.id)
        .in('role', allowedTargetRoles)
        .neq('id', profile?.id);
      if (error) throw error;
      return data as BookingUser[];
    },
    enabled: !!church?.id && allowedTargetRoles.length > 0
  });

  const pendingBookings = useMemo(() => 
    bookings.filter(b => b.status === 'pending' && (b.target_user_id === profile?.id || isAdminOrPastor)),
    [bookings, profile?.id, isAdminOrPastor]
  );

  const myBookings = useMemo(() => 
    bookings.filter(b => b.requester_id === profile?.id || b.target_user_id === profile?.id),
    [bookings, profile?.id]
  );

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id || !targetUserId) throw new Error("Missing required data");
      
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        throw new Error("End time must be after start time");
      }
      
      if (start < new Date()) {
        throw new Error("Cannot book appointments in the past");
      }
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          church_id: church.id,
          requester_id: profile.id,
          target_user_id: targetUserId,
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ 
        title: "Booking created", 
        description: userRole === 'guest' || userRole === 'worker' 
          ? "Your booking request has been submitted for approval" 
          : "Your booking has been confirmed"
      });
      setIsBookingOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      let errorMessage = error.message;
      if (error.message?.includes('overlaps') || error.message?.includes('already booked')) {
        errorMessage = "This time slot is already booked or has a pending request. Please choose a different time.";
      } else if (error.message?.includes('blocked')) {
        errorMessage = "This time slot is blocked (e.g., during church service hours). Please choose a different time.";
      }
      toast({ title: "Booking Failed", description: errorMessage, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, reason }: { bookingId: string; status: string; reason?: string }) => {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'approved') {
        updateData.approved_by = profile?.id;
      }
      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }
      
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ 
        title: `Booking ${variables.status}`, 
        description: `The booking has been ${variables.status}` 
      });
      setIsDetailOpen(false);
      setSelectedBooking(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetUserId("");
    setStartTime(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"));
  };

  const calendarEvents = bookings
    .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
    .map(booking => ({
      id: booking.id,
      title: `${booking.title} (${booking.requester?.full_name || 'Unknown'} → ${booking.target_user?.full_name || 'Unknown'})`,
      start: booking.start_time,
      end: booking.end_time,
      backgroundColor: STATUS_COLORS[booking.status],
      borderColor: STATUS_COLORS[booking.status],
      extendedProps: { booking }
    }));

  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps.booking as Booking;
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const handleDateClick = (info: any) => {
    setStartTime(format(new Date(info.dateStr), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(addHours(new Date(info.dateStr), 1), "yyyy-MM-dd'T'HH:mm"));
    setIsBookingOpen(true);
  };

  const canManageBooking = (booking: Booking) => {
    return isAdminOrPastor || booking.target_user_id === profile?.id;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Bookings</h1>
            <p className="text-muted-foreground">Schedule appointments with church staff</p>
          </div>
          <Button onClick={() => setIsBookingOpen(true)} data-testid="button-new-booking">
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
            <TabsTrigger value="my-bookings" data-testid="tab-my-bookings">My Bookings</TabsTrigger>
            {isAdminOrPastor && (
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending Approval
                {pendingBookings.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingBookings.length}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {isLoadingBookings ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    slotMinTime="07:00:00"
                    slotMaxTime="21:00:00"
                    allDaySlot={false}
                    height="auto"
                    aspectRatio={1.8}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-bookings" className="mt-4">
            <div className="space-y-4">
              {myBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No bookings yet</p>
                  </CardContent>
                </Card>
              ) : (
                myBookings.map(booking => (
                  <Card 
                    key={booking.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                    data-testid={`card-booking-${booking.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{booking.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.requester_id === profile?.id ? (
                              <>With: {booking.target_user?.full_name}</>
                            ) : (
                              <>From: {booking.requester?.full_name}</>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {format(new Date(booking.start_time), "PPP p")} - {format(new Date(booking.end_time), "p")}
                          </div>
                        </div>
                        <Badge 
                          style={{ backgroundColor: STATUS_COLORS[booking.status], color: 'white' }}
                        >
                          {STATUS_LABELS[booking.status]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {isAdminOrPastor && (
            <TabsContent value="pending" className="mt-4">
              <div className="space-y-4">
                {pendingBookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                      <Check className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>No pending approvals</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingBookings.map(booking => (
                    <Card key={booking.id} data-testid={`card-pending-${booking.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{booking.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              <User className="w-4 h-4 inline mr-1" />
                              {booking.requester?.full_name} ({booking.requester?.role}) wants to book {booking.target_user?.full_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {format(new Date(booking.start_time), "PPP p")} - {format(new Date(booking.end_time), "p")}
                            </div>
                            {booking.description && (
                              <p className="text-sm mt-2">{booking.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'approved' })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${booking.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-${booking.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Book with</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger data-testid="select-target-user">
                    <SelectValue placeholder="Select person to meet" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bookableUsers.length === 0 && !isLoadingUsers && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    No available people to book based on your role
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting purpose"
                  data-testid="input-booking-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
                  data-testid="input-booking-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start Time</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    data-testid="input-booking-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End Time</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-booking-end"
                  />
                </div>
              </div>

              {(userRole === 'guest' || userRole === 'worker') && (
                <div className="p-3 bg-amber-500/10 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-2 text-amber-500" />
                  Your booking will require approval from an admin or pastor.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)} data-testid="button-cancel-booking">
                Cancel
              </Button>
              <Button 
                onClick={() => createBookingMutation.mutate()}
                disabled={!title || !targetUserId || createBookingMutation.isPending}
                data-testid="button-submit-booking"
              >
                {createBookingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{selectedBooking.title}</h3>
                  <Badge style={{ backgroundColor: STATUS_COLORS[selectedBooking.status], color: 'white' }}>
                    {STATUS_LABELS[selectedBooking.status]}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested by:</span>
                    <span>{selectedBooking.requester?.full_name} ({selectedBooking.requester?.role})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meeting with:</span>
                    <span>{selectedBooking.target_user?.full_name} ({selectedBooking.target_user?.role})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span>{format(new Date(selectedBooking.start_time), "PPP p")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End:</span>
                    <span>{format(new Date(selectedBooking.end_time), "PPP p")}</span>
                  </div>
                </div>

                {selectedBooking.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedBooking.description}</p>
                  </div>
                )}

                {selectedBooking.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Label className="text-destructive">Rejection Reason</Label>
                    <p className="mt-1 text-sm">{selectedBooking.rejection_reason}</p>
                  </div>
                )}

                {selectedBooking.status === 'pending' && canManageBooking(selectedBooking) && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="rejection-reason">Rejection Reason (optional)</Label>
                      <Textarea
                        id="rejection-reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        data-testid="input-rejection-reason"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ bookingId: selectedBooking.id, status: 'approved' })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-approve-detail"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ 
                          bookingId: selectedBooking.id, 
                          status: 'rejected',
                          reason: rejectionReason
                        })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-reject-detail"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedBooking.status === 'approved' && selectedBooking.requester_id === profile?.id && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => updateStatusMutation.mutate({ bookingId: selectedBooking.id, status: 'cancelled' })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-cancel-approved"
                  >
                    Cancel Booking
                  </Button>
                )}

                {selectedBooking.status === 'approved' && canManageBooking(selectedBooking) && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => updateStatusMutation.mutate({ bookingId: selectedBooking.id, status: 'completed' })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    Mark as Completed
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
