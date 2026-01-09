import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";

import Auth from "@/pages/auth/Auth";
import Dashboard from "@/pages/Dashboard";
import Attendance from "@/pages/Attendance";
import Tasks from "@/pages/Tasks";
import Announcements from "@/pages/Announcements";
import Members from "@/pages/Members";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import PastorsDesk from "@/pages/PastorsDesk";
import CalendarPage from "@/pages/Calendar";
import FollowUps from "@/pages/FollowUps";
import DepartmentReports from "@/pages/DepartmentReports";
import Permissions from "@/pages/Permissions";
import Invite from "@/pages/Invite";
import Bookings from "@/pages/Bookings";
import Reminders from "@/pages/Reminders";
import Community from "@/pages/Community";
import Meetings from "@/pages/Meetings";
import NotFound from "@/pages/not-found";

console.log({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Auth} />
      <Route path="/join/:churchId" component={Auth} />
      
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/attendance">
        <ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <Tasks />
        </ProtectedRoute>
      </Route>

      <Route path="/announcements">
        <ProtectedRoute>
          <Announcements />
        </ProtectedRoute>
      </Route>

      <Route path="/members">
        <ProtectedRoute>
          <Members />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/pastors-desk">
        <ProtectedRoute>
          <PastorsDesk />
        </ProtectedRoute>
      </Route>

      <Route path="/calendar">
        <ProtectedRoute>
          <CalendarPage />
        </ProtectedRoute>
      </Route>

      <Route path="/follow-ups">
        <ProtectedRoute>
          <FollowUps />
        </ProtectedRoute>
      </Route>

      <Route path="/department-reports">
        <ProtectedRoute>
          <DepartmentReports />
        </ProtectedRoute>
      </Route>

      <Route path="/permissions">
        <ProtectedRoute>
          <Permissions />
        </ProtectedRoute>
      </Route>

      <Route path="/invite">
        <ProtectedRoute>
          <Invite />
        </ProtectedRoute>
      </Route>

      <Route path="/bookings">
        <ProtectedRoute>
          <Bookings />
        </ProtectedRoute>
      </Route>

      <Route path="/reminders">
        <ProtectedRoute>
          <Reminders />
        </ProtectedRoute>
      </Route>

      <Route path="/community">
        <ProtectedRoute>
          <Community />
        </ProtectedRoute>
      </Route>

      <Route path="/meetings">
        <ProtectedRoute>
          <Meetings />
        </ProtectedRoute>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    console.log('ENV Check:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;