import { Calendar, Users, Settings, Home, LogOut, Scissors, Globe, UserCheck, Briefcase, Mail, ChevronUp, User, Crown, AlertCircle } from "lucide-react";
import logoMark from "@/assets/logo-mark.webp";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganization } from "@/hooks/use-organization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: Calendar,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: Briefcase,
  },
  {
    title: "Services",
    url: "/services",
    icon: Scissors,
  },
  {
    title: "Booking",
    url: "/booking-page",
    icon: Globe,
  },
  {
    title: "Stylists",
    url: "/stylists",
    icon: UserCheck,
  },
  {
    title: "Teams",
    url: "/teams",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const settingsItems = []; // Emptying this as Settings is moved to mainItems, or we can keep it if we want a separate section but the user asked for specific list order.
// Actually, the user said "add teh pages dashboard agenda services booking page stylists teams settings and nder stylists products"
// It implies a single list or specific grouping. I will put them all in mainItems for now to match the list order requested.


export function AppSidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const sidebar = useSidebar();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { organization } = useOrganization();

  const { data: subscription } = useQuery({
    queryKey: ["sidebar-subscription", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { subscribed: boolean; subscription_tier: string | null; subscription_end: string | null } | null;
    },
  });

  const subDaysLeft = subscription?.subscription_end
    ? Math.ceil((new Date(subscription.subscription_end).getTime() - Date.now()) / 86_400_000)
    : null;
  const showExpiringSoon = subDaysLeft !== null && subDaysLeft >= 0 && subDaysLeft <= 7;
  const isPro = !!subscription?.subscribed;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
    : "SC";

  const userName = user?.user_metadata?.full_name || "";
  const orgDisplayName = organization?.name || organization?.slug || organization?.id || "";
  const orgInitial = orgDisplayName.slice(0, 1).toUpperCase();

  const renderMenu = (items: typeof mainItems) => (
    <SidebarGroup className="mt-4">
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.url || location.pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={`
                    group relative w-full justify-start px-3 py-2 rounded-md transition-all duration-200 
                    ${isActive
                      ? 'bg-sidebar-ring/80 text-white'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <Link to={item.url} className="flex items-center gap-3 w-full">
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    {sidebar.state !== "collapsed" && (
                      <span className="text-sm font-medium truncate">
                        {item.title}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      className="bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out"
      collapsible="icon"
    >
      <SidebarHeader className="p-2 border-b border-sidebar-border">
        {isMobile && (
          ((user?.user_metadata as any)?.role === "client"
            ? <SidebarTrigger className="lg:hidden mb-2" />
            : <div className="mb-2"><NotificationBell /></div>
          )
        )}
        {sidebar.state !== "collapsed" && (
          <div className="px-2 py-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border transition-all duration-200 flex items-center gap-2 min-h-[42px]">
            <img src={logoMark} alt="Logo" className="h-8 w-8 rounded-lg object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-8 px-1 rounded-md bg-transparent text-sm font-semibold text-foreground flex items-center truncate">
                {orgDisplayName || "Workspace"}
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-2">
        {renderMenu(mainItems)}
      </SidebarContent>

      <SidebarFooter className="px-3 py-3 border-t border-sidebar-border">
        {/* Subscription expiry banner */}
        {sidebar.state !== "collapsed" && showExpiringSoon && (
          <Link
            to="/pricing"
            className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/15"
          >
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-300 leading-tight">
                {isPro ? "Pro" : "Trial"} expires in {subDaysLeft === 0 ? "today" : `${subDaysLeft}d`}
              </p>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 mt-0.5">
                Tap to {isPro ? "manage plan" : "upgrade"}
              </p>
            </div>
          </Link>
        )}
        {sidebar.state !== "collapsed" && isPro && !showExpiringSoon && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/20 px-3 py-1.5">
            <Crown className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">Pro plan active</span>
          </div>
        )}

        {/* Remember Me Indicator */}
        {sidebar.state !== "collapsed" && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-black/60 shrink-0">
              <img src="/ios-checkmark.svg" alt="" className="h-3 w-3 invert" />
            </span>
            <span>Remember: {localStorage.getItem('rememberMe') === 'true' ? 'On' : 'Off'}</span>
          </div>
        )}
        {sidebar.state === "collapsed" && localStorage.getItem('rememberMe') === 'true' && (
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-black/60">
              <img src="/ios-checkmark.svg" alt="" className="h-3 w-3 invert" />
            </span>
          </div>
        )}
        {sidebar.state !== "collapsed" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/40 border border-sidebar-border cursor-pointer hover:bg-sidebar-accent/60 transition-colors">
                <Avatar className="h-7 w-7 border border-sidebar-border">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-sidebar-ring/80 text-white font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  {userName && <p className="font-medium text-sm text-foreground truncate">{userName}</p>}
                  {user?.email && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-[--radix-popper-anchor-width]">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-[#e11d48] focus:text-[#e11d48]">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="space-y-3">
            <Avatar className="h-8 w-8 mx-auto border border-blue-100">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full flex justify-center p-2 rounded-md text-[#e11d48] hover:text-[#be123c] hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

