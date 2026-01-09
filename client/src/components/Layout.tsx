import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/NotificationBell";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  ListTodo, 
  Megaphone, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  FileBarChart,
  User,
  Church,
  BookOpen,
  CalendarDays,
  CalendarClock,
  UserCheck,
  ClipboardList,
  Shield,
  UserPlus,
  MessagesSquare,
  Video
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import i18n from "@/lib/i18n";

interface LayoutProps {
  children: ReactNode;
}

const languages = [
  { code: 'en', label: 'English', flag: 'US' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'pt', label: 'Português', flag: 'PT' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

export function Layout({ children }: LayoutProps) {
  const { signOut, profile, church } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const isPastorOrAdmin = profile?.role === 'pastor' || profile?.role === 'admin';

  const role = profile?.role || 'guest';
  const isWorkerOrAbove = ['pastor', 'admin', 'worker'].includes(role);
  const isMemberOrAbove = ['pastor', 'admin', 'worker', 'member'].includes(role);

  const navItems = [
    { icon: LayoutDashboard, label: t("dashboard"), href: "/", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: CalendarCheck, label: t("attendance"), href: "/attendance", roles: ['pastor', 'admin', 'worker'] },
    { icon: ListTodo, label: t("tasks"), href: "/tasks", roles: ['pastor', 'admin', 'worker'] },
    { icon: Megaphone, label: t("announcements"), href: "/announcements", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: Users, label: t("members"), href: "/members", roles: ['pastor', 'admin'] },
    { icon: UserPlus, label: "Invite", href: "/invite", roles: ['pastor', 'admin'] },
    { icon: BookOpen, label: "Pastor's Desk", href: "/pastors-desk", roles: ['pastor', 'admin'] },
    { icon: CalendarDays, label: t("calendar") || "Calendar", href: "/calendar", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: CalendarClock, label: "Bookings", href: "/bookings", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: Bell, label: "Reminders", href: "/reminders", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: MessagesSquare, label: "Community", href: "/community", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: Video, label: "Meetings", href: "/meetings", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: UserCheck, label: "Follow-ups", href: "/follow-ups", roles: ['pastor', 'admin'] },
    { icon: ClipboardList, label: "Dept. Reports", href: "/department-reports", roles: ['pastor', 'admin', 'worker'] },
    { icon: FileBarChart, label: t("reports"), href: "/reports", roles: ['pastor', 'admin'] },
    { icon: User, label: t("myProfile") || "My Profile", href: "/profile", roles: ['pastor', 'admin', 'worker', 'member', 'guest'] },
    { icon: Shield, label: "Permissions", href: "/permissions", roles: ['pastor'] },
    { icon: Settings, label: t("settings"), href: "/settings", roles: ['pastor', 'admin'] },
  ].filter(item => item.roles.includes(role));

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#1e3a5f] text-white">
      <div className="px-4 py-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
          {church?.logoUrl ? (
            <img 
              src={church.logoUrl} 
              alt="Church logo" 
              className="w-full h-full object-cover"
            />
          ) : (
            <Church className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white truncate" data-testid="text-church-name">
            {church?.name || "Add Church Name Here"}
          </h1>
          <p className="text-xs text-white/60 truncate" data-testid="text-church-address">
            {church?.address || "Add Church Address Here"}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? "bg-primary text-white font-medium" 
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
              data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex">
      <aside className="hidden md:block w-56 h-screen sticky top-0 flex-shrink-0">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white dark:bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-56 bg-[#1e3a5f]">
                <VisuallyHidden.Root>
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Main navigation for the application</SheetDescription>
                </VisuallyHidden.Root>
                <NavContent />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-language">
                  <span className="text-xs font-medium">{currentLang.flag}</span>
                  <span className="hidden sm:inline">{currentLang.label}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    data-testid={`lang-${lang.code}`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationBell />

            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <Avatar className="w-9 h-9">
                <AvatarImage src={profile?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {profile?.fullName?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium" data-testid="text-user-name">{profile?.fullName || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">{profile?.role || "Member"}</p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground"
              onClick={() => signOut()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
