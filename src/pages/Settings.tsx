/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Link2,
  Loader2,
  Save,
  Settings2,
  Sparkles,
  Store,
  User,
  UserCircle2,
  Scissors,
  Moon,
  Sun,
  Search,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileDock } from "@/components/MobileDock";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PushToggle } from "@/components/PushToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MessageTemplates } from "@/components/MessageTemplates";
import { BarbershopMap } from "@/components/BarbershopMap";
import { PublicVisibilityCard } from "@/components/PublicVisibilityCard";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { BrandImageUpload } from "@/components/BrandImageUpload";
import { usePremium } from "@/hooks/use-premium";
import { MobileSettings } from "@/components/settings/MobileSettings";
import { ReviewRequestsCard } from "@/components/settings/ReviewRequestsCard";
import { useRoleSwitch } from "@/hooks/use-role-switch";
import { getBrowserTimezone, listTimezones, formatTzLabel } from "@/lib/tz";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const serviceDurationOptions = [10, 15, 20, 25, 30, 45, 60, 90];

const weekDays = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
];

type AgendaSettingsRecord = {
  user_id: string;
  service_duration: number;
  start_hour: string;
  end_hour: string;
  working_days: number[];
};

type ProfileRecord = {
  full_name: string;
  phone: string;
};

type BrandProfileRecord = {
  name: string;
  contact_phone: string;
  city: string;
  location: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  description: string;
  years_experience?: number;
  accepts_waitlist?: boolean;
  notify_cancellation_alerts: boolean;
  loyalty_discount_enabled: boolean;
  loyalty_discount_percent: number;
  timezone: string;
  booking_locale: "en" | "el";
  avatar_url?: string;
  banner_url?: string;
};

// Extract lat/lng from a Google Maps share URL (supports @lat,lng and q=lat,lng patterns)
const extractLatLngFromGoogleUrl = (url: string): { lat: number; lng: number } | null => {
  if (!url) return null;
  // Pattern 1: /@lat,lng,zoom
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  // Pattern 2: q=lat,lng or destination=lat,lng or ll=lat,lng
  const q = url.match(/[?&](?:q|destination|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  // Pattern 3: !3dlat!4dlng (places format)
  const place = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };
  return null;
};

const buildGoogleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const defaultAgendaSettings: AgendaSettingsRecord = {
  user_id: "",
  service_duration: 30,
  start_hour: "08:00",
  end_hour: "18:00",
  working_days: [1, 2, 3, 4, 5, 6],
};

const defaultProfile: ProfileRecord = {
  full_name: "",
  phone: "",
};

const defaultBrandProfile: BrandProfileRecord = {
  name: "",
  contact_phone: "",
  city: "",
  location: "",
  latitude: undefined,
  longitude: undefined,
  google_maps_url: "",
  description: "",
  years_experience: undefined,
  accepts_waitlist: false,
  notify_cancellation_alerts: true,
  loyalty_discount_enabled: true,
  loyalty_discount_percent: 20,
  timezone: getBrowserTimezone(),
  booking_locale: "en",
  avatar_url: "",
  banner_url: "",
};

const normalizeTime = (value?: string | null, fallback = "08:00") => {
  if (!value) return fallback;
  return value.substring(0, 5);
};

const sortWorkingDays = (days: number[]) =>
  [...days].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [agendaForm, setAgendaForm] = useState<AgendaSettingsRecord>(defaultAgendaSettings);
  const [profileForm, setProfileForm] = useState<ProfileRecord>(defaultProfile);
  const [brandForm, setBrandForm] = useState<BrandProfileRecord>(defaultBrandProfile);
  const [notificationPrefs, setNotificationPrefs] = useState({
    newBookings: true,
    reminders: true,
    cancellations: true,
    dailyDigest: false,
  });

  const { toast } = useToast();
  const { user } = useAuth();

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    const confirmation = window.prompt("To permanently delete your account, type 'delete my account' below.");
    if (confirmation === null) return;
    if (confirmation.trim().toLowerCase() !== "delete my account") {
      toast({ title: "Deletion cancelled", description: "The confirmation phrase did not match.", variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any).rpc("soft_delete_account", { _user_id: user.id });
    if (error || !data?.success) {
      toast({ title: "Could not delete account", description: error?.message || data?.error || "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Account deleted" });
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const { isPremium } = usePremium();
  const bannerMaxMB = isPremium ? 8 : 2;
  const avatarMaxMB = isPremium ? 5 : 2;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { role, setRole, switching: switchingRole } = useRoleSwitch();

  const { data, isLoading } = useQuery({
    queryKey: ["settings-page-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const [agendaResult, profileResult] = await Promise.all([
        (supabase as any)
          .from("agenda_settings")
          .select("user_id, service_duration, start_hour, end_hour, working_days")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("profiles")
          .select("full_name, phone, dark_mode, business_name, address, latitude, longitude, google_maps_url, avatar_url, banner_url, description, years_experience, accepts_waitlist, notify_cancellation_alerts, loyalty_discount_enabled, loyalty_discount_percent, onboarding_completed, timezone, booking_locale")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (agendaResult.error && agendaResult.error.code !== "PGRST116") {
        throw agendaResult.error;
      }

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      return {
        agenda: agendaResult.data,
        profile: profileResult.data,
      };
    },
  });

  // Auto-save agenda settings when hours/days/duration change
  const autoSaveAgenda = useMutation({
    mutationFn: async (agenda: AgendaSettingsRecord) => {
      if (!user) throw new Error("User not found");
      if (agenda.start_hour >= agenda.end_hour) throw new Error("Opening hour must be earlier than closing hour");
      if (agenda.working_days.length === 0) throw new Error("Select at least one working day");

      const { error } = await (supabase as any)
        .from("agenda_settings")
        .upsert(
          {
            user_id: user.id,
            service_duration: agenda.service_duration,
            start_hour: agenda.start_hour,
            end_hour: agenda.end_hour,
            working_days: agenda.working_days,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-page-data", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["agenda_settings", user?.id], exact: false });
      queryClient.invalidateQueries({ queryKey: ["public-agenda-settings"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["appointments"], exact: false });
      toast({ title: "Schedule saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't save schedule",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user || isLoading) return;
    if (agendaForm.start_hour >= agendaForm.end_hour) return;
    if (agendaForm.working_days.length === 0) return;

    const timeout = setTimeout(() => {
      const baseline = data?.agenda;
      const changed =
        agendaForm.service_duration !== (baseline?.service_duration ?? 30) ||
        agendaForm.start_hour !== normalizeTime(baseline?.start_hour, "08:00") ||
        agendaForm.end_hour !== normalizeTime(baseline?.end_hour, "18:00") ||
        JSON.stringify(agendaForm.working_days) !==
          JSON.stringify(sortWorkingDays(baseline?.working_days ?? [1, 2, 3, 4, 5, 6]));

      if (changed) {
        autoSaveAgenda.mutate(agendaForm);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [agendaForm, user, data, isLoading]);

  useEffect(() => {
    if (!user || !data) return;

    setAgendaForm({
      user_id: user.id,
      service_duration: data.agenda?.service_duration ?? 30,
      start_hour: normalizeTime(data.agenda?.start_hour, "08:00"),
      end_hour: normalizeTime(data.agenda?.end_hour, "18:00"),
      working_days:
        sortWorkingDays(
          data.agenda?.working_days && data.agenda.working_days.length > 0
            ? data.agenda.working_days
            : [1, 2, 3, 4, 5, 6]
        ),
    });

    setProfileForm({
      full_name: data.profile?.full_name ?? "",
      phone: data.profile?.phone ?? "",
    });

    setBrandForm({
      name: data.profile?.business_name ?? data.profile?.full_name ?? user.user_metadata?.full_name ?? "",
      contact_phone: data.profile?.phone ?? "",
      city: data.profile?.address?.split(",").slice(-1)[0]?.trim() ?? "",
      location: data.profile?.address ?? "",
      latitude: data.profile?.latitude ?? undefined,
      longitude: data.profile?.longitude ?? undefined,
      google_maps_url: data.profile?.google_maps_url ?? "",
      description: data.profile?.description ?? "",
      years_experience: data.profile?.years_experience ?? undefined,
      accepts_waitlist: data.profile?.accepts_waitlist ?? false,
      notify_cancellation_alerts: data.profile?.notify_cancellation_alerts ?? true,
      loyalty_discount_enabled: data.profile?.loyalty_discount_enabled ?? false,
      loyalty_discount_percent: data.profile?.loyalty_discount_percent ?? 20,
      timezone: data.profile?.timezone ?? getBrowserTimezone(),
      booking_locale: data.profile?.booking_locale ?? "en",
      avatar_url: data.profile?.avatar_url ?? "",
      banner_url: data.profile?.banner_url ?? "",
    });

    // Set dark mode from profile, default to dark mode
    const savedDarkMode = data.profile?.dark_mode;
    if (savedDarkMode !== undefined && savedDarkMode !== null) {
      setTheme(savedDarkMode ? 'dark' : 'light');
    } else {
      // Default to dark mode
      setTheme('dark');
    }
  }, [data, user, setTheme]);

  const hasValidHours = useMemo(() => agendaForm.start_hour < agendaForm.end_hour, [agendaForm]);

  const generateTimeSlots = () => {
    if (!hasValidHours) return [];

    const interval = agendaForm.service_duration || 30;
    const [startHour, startMinute] = agendaForm.start_hour.split(":").map(Number);
    const [endHour, endMinute] = agendaForm.end_hour.split(":").map(Number);

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const slots: string[] = [];

    for (let minutes = startTotal; minutes <= endTotal; minutes += interval) {
      const hh = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
      const mm = (minutes % 60).toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }

    return slots;
  };

  const toggleWorkingDay = (day: number) => {
    setAgendaForm((prev) => {
      const exists = prev.working_days.includes(day);
      const nextDays = exists
        ? prev.working_days.filter((item) => item !== day)
        : [...prev.working_days, day];

      return {
        ...prev,
        working_days: sortWorkingDays(nextDays),
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not found");
      if (!hasValidHours) throw new Error("Opening hour must be earlier than closing hour");
      if (agendaForm.working_days.length === 0) {
        throw new Error("Select at least one working day");
      }

      const agendaPayload = {
        user_id: user.id,
        service_duration: agendaForm.service_duration,
        start_hour: agendaForm.start_hour,
        end_hour: agendaForm.end_hour,
        working_days: agendaForm.working_days,
      };

      // Auto-extract coordinates from a Google Maps URL if pasted
      let lat = brandForm.latitude;
      let lng = brandForm.longitude;
      const mapsUrl = (brandForm.google_maps_url || "").trim();
      if (mapsUrl) {
        const parsed = extractLatLngFromGoogleUrl(mapsUrl);
        if (parsed) {
          lat = parsed.lat;
          lng = parsed.lng;
        }
      }

      const profilePayload = {
        id: user.id,
        full_name: profileForm.full_name.trim() || null,
        phone: brandForm.contact_phone.trim() || profileForm.phone.trim() || null,
        business_name: brandForm.name.trim() || profileForm.full_name.trim() || null,
        address: [brandForm.location.trim(), brandForm.city.trim()].filter(Boolean).join(", ") || null,
        latitude: lat ?? null,
        longitude: lng ?? null,
        google_maps_url: mapsUrl || (lat != null && lng != null ? buildGoogleMapsUrl(lat, lng) : null),
        description: brandForm.description.trim() || null,
        years_experience: brandForm.years_experience ?? null,
        accepts_waitlist: brandForm.accepts_waitlist ?? false,
        notify_cancellation_alerts: brandForm.notify_cancellation_alerts,
        loyalty_discount_enabled: brandForm.loyalty_discount_enabled,
        loyalty_discount_percent: brandForm.loyalty_discount_percent,
        timezone: (brandForm.timezone || getBrowserTimezone()).trim(),
        booking_locale: brandForm.booking_locale || "en",
        avatar_url: brandForm.avatar_url?.trim() || null,
        banner_url: brandForm.banner_url?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const [agendaResult, profileResult] = await Promise.all([
        (supabase as any).from("agenda_settings").upsert(agendaPayload, { onConflict: "user_id" }),
        (supabase as any).from("profiles").upsert(profilePayload, { onConflict: "id" }),
      ]);

      if (agendaResult.error) throw agendaResult.error;
      if (profileResult.error) throw profileResult.error;

      // Keep business_hours in sync with agenda (single source of truth for public views)
      try {
        const hoursRows = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          user_id: user.id,
          day_of_week: d,
          open_time: agendaForm.start_hour,
          close_time: agendaForm.end_hour,
          is_closed: !agendaForm.working_days.includes(d),
        }));
        await (supabase as any).from("business_hours").delete().eq("user_id", user.id);
        await (supabase as any).from("business_hours").insert(hoursRows);
      } catch (e) {
        console.warn("business_hours sync skipped", e);
      }

      // Reflect parsed coordinates back into the form
      if (mapsUrl && lat !== undefined && lng !== undefined) {
        setBrandForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      }

      return profilePayload;
    },
    onSuccess: async (profilePayload) => {
      // Optimistically update caches so the saved name/image/texts are visible immediately
      queryClient.setQueryData(["settings-page-data", user?.id], (old: any) => ({
        ...old,
        profile: { ...(old?.profile || {}), ...profilePayload, id: user?.id },
      }));
      queryClient.setQueryData(["mobile-dashboard-profile", user?.id], (old: any) => ({
        ...(old || {}),
        full_name: profilePayload.full_name,
        business_name: profilePayload.business_name,
        avatar_url: profilePayload.avatar_url,
      }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings-page-data", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["agenda_settings", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["public-agenda-settings"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["appointments"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stylists"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["barber-details"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["mobile-dashboard-profile", user?.id] }),
      ]);

      toast({
        title: "Settings saved",
        description: "Your hours, working days, and business info were updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDarkModeMutation = useMutation({
    mutationFn: async (darkMode: boolean) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await (supabase as any)
        .from("profiles")
        .update({ dark_mode: darkMode })
        .eq("id", user.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-page-data", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update appearance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const notifications = [
    {
      id: "newBookings",
      label: "New bookings",
      desc: "Get notified when someone books an appointment.",
    },
    {
      id: "reminders",
      label: "Appointment reminders",
      desc: "Enable reminders before upcoming appointments.",
    },
    {
      id: "cancellations",
      label: "Cancellations",
      desc: "Get instant updates when bookings are cancelled.",
    },
    {
      id: "dailyDigest",
      label: "Daily digest",
      desc: "Receive a daily summary of your schedule.",
    },
  ] as const;

  if (isMobile) {
    return (
      <MobileSettings
        user={user}
        theme={theme}
        setTheme={setTheme}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        brandForm={brandForm}
        setBrandForm={setBrandForm}
        agendaForm={agendaForm}
        setAgendaForm={setAgendaForm}
        toggleWorkingDay={toggleWorkingDay}
        notificationPrefs={notificationPrefs}
        setNotificationPrefs={setNotificationPrefs}
        notifications={notifications}
        hasValidHours={hasValidHours}
        saveMutation={saveMutation}
        updateDarkModeMutation={updateDarkModeMutation}
        isLoading={isLoading}
        navigate={navigate}
        bannerMaxMB={bannerMaxMB}
        avatarMaxMB={avatarMaxMB}
      />
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
          <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c] text-[#1C1C1E] dark:text-[#F2F2F7] overflow-hidden relative">
        <AppSidebar />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="sticky top-0 z-20 border-b border-white/40 dark:border-white/5 bg-white/90 dark:bg-[#1C1C1E]/90">
            <div className="px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden text-[#1C1C1E] dark:text-[#F2F2F7]" />
                <motion.h1
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[17px] md:text-2xl font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate"
                >
                  Settings
                </motion.h1>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || isLoading}
                    className="rounded-full h-9 px-5 bg-[#0A84FF] text-white font-semibold border-0 hover:bg-[#0066d6]"
                  >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  )}
                  {saveMutation.isPending ? "Saving" : "Save"}
                </Button>
              </motion.div>
            </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
                <div className="space-y-6">
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                      setActiveTab(v);
                      setSearchParams({ tab: v }, { replace: true });
                    }}
                    className="space-y-6"
                  >
                    <TabsList className="grid w-full grid-cols-5 gap-1 rounded-[12px] bg-[#1C1C1E] border border-white/[0.06] p-1 h-auto shadow-sm">
                      {[
                        { v: "general", icon: Settings2, label: "General" },
                        { v: "booking", icon: Link2, label: "Booking" },
                        { v: "messages", icon: Sparkles, label: "Messages" },
                        { v: "notifications", icon: Bell, label: "Alerts", badge: "New" },
                        { v: "business", icon: Store, label: "Business" },
                      ].map(({ v, icon: Icon, label, badge }) => (
                        <TabsTrigger
                          key={v}
                          value={v}
                          className={cn(
                            "relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-[10px] px-1 md:px-3 py-2 text-[10px] md:text-sm font-medium transition-all duration-300",
                            "data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white",
                            "data-[state=inactive]:text-[#8E8E93] data-[state=inactive]:hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="relative">
                            <Icon className="w-4 h-4" />
                            {badge && (
                              <span className="absolute -top-2 -right-3 inline-flex items-center px-1 py-0 rounded-full bg-amber-500 text-[8px] font-bold text-black leading-none">
                                {badge}
                              </span>
                            )}
                          </div>
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="messages" className="mt-0 space-y-6 animate-fade-in">
                      <MessageTemplates />
                    </TabsContent>

                    <TabsContent value="general" className="mt-0 space-y-6 animate-fade-in">
                      {/* Role switcher */}
                      <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Your role</CardTitle>
                              <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                Switch between client and barber at any time.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: "client", label: "Client", desc: "Book appointments", Icon: UserCircle2 },
                              { key: "barber", label: "Barber", desc: "Manage my shop", Icon: Scissors },
                            ].map(({ key, label, desc, Icon }) => {
                              const currentRole = user?.user_metadata?.role ?? "client";
                              const selected = currentRole === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={async () => {
                                    if (selected) return;
                                    await setRole(key as "client" | "barber");
                                  }}
                                  className={cn(
                                    "relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                                    selected
                                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm"
                                      : "border-border hover:border-[hsl(var(--primary))]/40 hover:bg-muted/40",
                                  )}
                                >
                                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", selected ? "bg-[hsl(var(--primary))] text-white" : "bg-muted text-muted-foreground")}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="text-sm font-semibold">{label}</div>
                                  <div className="text-[11px] text-muted-foreground">{desc}</div>
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Find Barber action card */}
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      >
                        <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E] overflow-hidden">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                <Search className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                              </div>
                              <div>
                                <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Find a barber</CardTitle>
                                <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                  Switch to client mode and discover barbers near you.
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Button
                              type="button"
                              disabled={switchingRole}
                              onClick={() => setRole(role === "client" ? "barber" : "client")}
                              className={cn(
                                "w-full h-12 rounded-2xl font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-60",
                                role === "client"
                                  ? "bg-[#1C1C1E] hover:bg-[#000000] text-white shadow-black/20"
                                  : "bg-[#9f1239] hover:bg-[#881337] text-white shadow-rose-900/20"
                              )}
                            >
                              {switchingRole ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              ) : (
                                <>{role === "client" ? <Scissors className="w-5 h-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}</>
                              )}
                              {role === "client" ? "Switch to barber mode" : "Switch to client & find barber"}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-primary dark:text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Agenda timing</CardTitle>
                              <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                Control slot length, opening hours, and working days.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-gray-500 mb-3 block">
                              Working days
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {weekDays.map((day) => {
                                const active = agendaForm.working_days.includes(day.value);

                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWorkingDay(day.value)}
                                    className={cn(
                                      "min-w-[4.25rem] flex-1 rounded-[12px] border px-3 py-3 text-center transition-all",
                                      active
                                        ? "border-[#0A84FF] bg-[#0A84FF] text-white shadow-sm"
                                        : "border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:border-gray-400 dark:hover:border-[#3A3A3C]"
                                    )}
                                  >
                                    <span className="text-sm font-semibold">{day.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-gray-500 mb-3 block">
                              Working hours
                            </Label>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Input
                                  type="time"
                                  value={agendaForm.start_hour}
                                  onChange={(e) =>
                                    setAgendaForm((prev) => ({ ...prev, start_hour: e.target.value }))
                                  }
                                  className="h-14 rounded-[12px] border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] text-center text-lg font-medium"
                                />
                                <p className="text-[11px] text-[#8E8E93] text-center mt-1.5">Opens</p>
                              </div>
                              <span className="text-[#8E8E93] font-medium">to</span>
                              <div className="flex-1">
                                <Input
                                  type="time"
                                  value={agendaForm.end_hour}
                                  onChange={(e) =>
                                    setAgendaForm((prev) => ({ ...prev, end_hour: e.target.value }))
                                  }
                                  className="h-14 rounded-[12px] border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] text-center text-lg font-medium"
                                />
                                <p className="text-[11px] text-[#8E8E93] text-center mt-1.5">Closes</p>
                              </div>
                            </div>
                            {!hasValidHours && (
                              <p className="text-xs text-red-500 mt-2 text-center">Closing time must be later than opening time.</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-gray-500 mb-3 block">
                              Appointment slot
                            </Label>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                              {serviceDurationOptions.map((duration) => (
                                <button
                                  key={duration}
                                  type="button"
                                  onClick={() =>
                                    setAgendaForm((prev) => ({ ...prev, service_duration: duration }))
                                  }
                                  className={cn(
                                    "h-12 rounded-[12px] border text-sm font-medium transition-all",
                                    agendaForm.service_duration === duration
                                      ? "bg-[#0A84FF] text-white border-[#0A84FF] shadow-sm"
                                      : "bg-white dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-gray-400 border-[#C6C6C8] dark:border-[#2C2C2E] hover:border-gray-400 dark:hover:border-[#3A3A3C] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
                                  )}
                                >
                                  {duration}m
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-gray-500 mb-3 block">
                              Business time zone
                            </Label>
                            <Select
                              value={brandForm.timezone || getBrowserTimezone()}
                              onValueChange={(value) =>
                                setBrandForm((prev) => ({ ...prev, timezone: value }))
                              }
                            >
                              <SelectTrigger className="h-12 rounded-[12px] border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]">
                                <SelectValue placeholder="Select time zone" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[280px]">
                                {listTimezones().map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    {formatTzLabel(tz)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-[#8E8E93] mt-1.5">
                              Slots on your booking link and Find Barber use this time zone. Detected: {formatTzLabel(getBrowserTimezone())}
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-gray-500 mb-3 block">
                              Booking language
                            </Label>
                            <Select
                              value={brandForm.booking_locale || "en"}
                              onValueChange={(value) =>
                                setBrandForm((prev) => ({ ...prev, booking_locale: value }))
                              }
                            >
                              <SelectTrigger className="h-12 rounded-[12px] border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="el">Greek (Ελληνικά)</SelectItem>
                                <SelectItem value="es">Spanish (Español)</SelectItem>
                                <SelectItem value="pl">Polish (Polski)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-[#8E8E93] mt-1.5">
                              Language used on your public booking page and client messages. Default: English.
                            </p>
                          </div>

                          <Separator />

                          {/* Appearance Card */}
                          <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                  {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                                </div>
                                <div>
                                  <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Appearance</CardTitle>
                                  <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                    Customize how the app looks on your device.
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between py-2">
                                <div>
                                  <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">Dark mode</p>
                                  <p className="text-sm text-[#8E8E93] dark:text-gray-500">Use dark theme across the app</p>
                                </div>
                                <Switch
                                  checked={theme === 'dark'}
                                  onCheckedChange={(checked) => {
                                    setTheme(checked ? 'dark' : 'light');
                                    updateDarkModeMutation.mutate(checked);
                                  }}
                                />
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between py-2">
                                <div>
                                  <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">Barber mode</p>
                                  <p className="text-sm text-[#8E8E93] dark:text-gray-500">Use the barber dashboard instead of finding a barber</p>
                                </div>
                                <Switch
                                  checked={role === 'barber'}
                                  disabled={switchingRole}
                                  onCheckedChange={(checked) => setRole(checked ? 'barber' : 'client')}
                                />
                              </div>
                            </CardContent>
                          </Card>

                          <Separator />

                          <div>
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-3 block">
                              Working days
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                              {weekDays.map((day) => {
                                const active = agendaForm.working_days.includes(day.value);

                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWorkingDay(day.value)}
                                    className={cn(
                                      "rounded-2xl border px-4 py-3 text-left transition-all",
                                      active
                                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                        : "border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:border-gray-400 dark:hover:border-[#3A3A3C]"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold">{day.label}</span>
                                      {active && <Check className="w-4 h-4" />}
                                    </div>
                                    <p
                                      className={cn(
                                        "text-xs mt-1",
                                        active ? "text-white/70" : "text-[#8E8E93] dark:text-gray-500"
                                      )}
                                    >
                                      {day.full}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="booking" className="mt-0 space-y-6 animate-fade-in">
                      <BookingLinkGenerator />
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0 animate-fade-in">
                      <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Notifications</CardTitle>
                              <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                Local preferences for how you want to be informed.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <PushToggle />
                          <Separator className="bg-[#C6C6C8] dark:bg-[#2C2C2E]" />
                          {notifications.map((item, index) => (
                            <div key={item.id}>
                              <div className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{item.label}</p>
                                  <p className="text-sm text-[#8E8E93] dark:text-gray-500">{item.desc}</p>
                                </div>
                                <Switch
                                  checked={notificationPrefs[item.id]}
                                  onCheckedChange={(checked) =>
                                    setNotificationPrefs((prev) => ({
                                      ...prev,
                                      [item.id]: checked,
                                    }))
                                  }
                                />
                              </div>
                              {index < notifications.length - 1 && <Separator className="bg-[#C6C6C8] dark:bg-[#2C2C2E]" />}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <div className="mt-6">
                        <ReviewRequestsCard />
                      </div>
                    </TabsContent>

                    <TabsContent value="business" className="mt-0 space-y-6 animate-fade-in">
                      <SubscriptionCard />
                      {/* Public visibility toggle removed — all profiles are public by default */}
                      <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Business identity</CardTitle>
                              <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                                Persist the business details used across the app and public booking.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                          {/* Brand media — organised at the top */}
                          <div className="space-y-5">
                            <BrandImageUpload
                              label="Banner"
                              path={brandForm.banner_url}
                              folder="banner"
                              onChange={(url) => setBrandForm((prev) => ({ ...prev, banner_url: url }))}
                              className="w-full"
                              maxSizeMB={bannerMaxMB}
                              helperText={`Best 1200×400. Max ${bannerMaxMB}MB${isPremium ? " (Premium)" : " — upgrade for 8MB"}.`}
                            />

                            <BrandImageUpload
                              label="Profile photo"
                              path={brandForm.avatar_url}
                              folder="avatar"
                              circle
                              onChange={(url) => setBrandForm((prev) => ({ ...prev, avatar_url: url }))}
                              maxSizeMB={avatarMaxMB}
                              helperText={`Square image works best. Max ${avatarMaxMB}MB${isPremium ? " (Premium)" : " — upgrade for 5MB"}.`}
                            />
                          </div>

                          <Separator />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Owner / profile name
                              </Label>
                              <Input
                                value={profileForm.full_name}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                                }
                                placeholder="Your full name"
                                                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Personal phone
                              </Label>
                              <Input
                                value={profileForm.phone}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                placeholder="+1 555 123 4567"
                                                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Business name
                              </Label>
                              <Input
                                value={brandForm.name}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="Cutzio Studio"
                                                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Public business phone
                              </Label>
                              <Input
                                value={brandForm.contact_phone}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    contact_phone: e.target.value,
                                  }))
                                }
                                placeholder="+1 555 987 6543"
                                                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Years of experience
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={80}
                                value={brandForm.years_experience ?? ""}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({
                                    ...prev,
                                    years_experience: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                  }))
                                }
                                placeholder="e.g. 7"
                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                              <p className="text-xs text-[#8E8E93] dark:text-gray-500 mt-1.5">
                                Shown on your Find Barber profile.
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                About / short bio
                              </Label>
                              <textarea
                                value={brandForm.description}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Tell clients about your style, experience, and what makes you stand out."
                                rows={3}
                                maxLength={400}
                                className="w-full px-3 py-2 rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                              <p className="text-xs text-[#8E8E93] dark:text-gray-500 mt-1.5 text-right">
                                {brandForm.description.length}/400
                              </p>
                            </div>
                          </div>

                          {/* Cancellation waitlist */}
                          <div className="rounded-2xl border border-primary/20 bg-muted p-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <Label className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] block">
                                Accept cancellation waitlist
                              </Label>
                              <p className="text-xs text-[#8E8E93] mt-1">
                                Clients can join a 7-day waitlist on your profile. When you cancel an appointment, the first person in line gets emailed and has 5 minutes to claim it.
                              </p>
                            </div>
                            <Switch
                              checked={!!brandForm.accepts_waitlist}
                              onCheckedChange={(v) =>
                                setBrandForm((prev) => ({ ...prev, accepts_waitlist: v }))
                              }
                            />
                          </div>


                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                City
                              </Label>
                              <Input
                                value={brandForm.city}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({ ...prev, city: e.target.value }))
                                }
                                placeholder="New York"
                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Street address
                              </Label>
                              <Input
                                value={brandForm.location}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({ ...prev, location: e.target.value }))
                                }
                                placeholder="123 Main Street"
                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>
                          </div>


                          <div>
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                              Map Location
                            </Label>
                            <p className="text-xs text-[#8E8E93] dark:text-gray-500 mb-3">
                              Search your city/address, then tap the exact place where your barbershop is.
                            </p>
                            <BarbershopMap
                              barbershops={brandForm.latitude && brandForm.longitude ? [{
                                id: 'current',
                                name: brandForm.name || 'Your Business',
                                location: brandForm.location || '',
                                latitude: brandForm.latitude,
                                longitude: brandForm.longitude,
                                contact_phone: brandForm.contact_phone,
                              }] : []}
                              height="300px"
                              pickMode
                              initialCenter={brandForm.latitude && brandForm.longitude ? {
                                lat: brandForm.latitude,
                                lng: brandForm.longitude,
                              } : undefined}
                              onLocationPick={({ lat, lng }) =>
                                setBrandForm((prev) => ({
                                  ...prev,
                                  latitude: lat,
                                  longitude: lng,
                                  google_maps_url: prev.google_maps_url || buildGoogleMapsUrl(lat, lng),
                                }))
                              }
                            />
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-1 block">
                                  Latitude
                                </Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={brandForm.latitude || ''}
                                  onChange={(e) =>
                                    setBrandForm((prev) => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))
                                  }
                                  placeholder="40.7128"
                                  className="h-10 rounded-xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-1 block">
                                  Longitude
                                </Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={brandForm.longitude || ''}
                                  onChange={(e) =>
                                    setBrandForm((prev) => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))
                                  }
                                  placeholder="-74.0060"
                                  className="h-10 rounded-xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-6">
                  <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm">
                    <div className="bg-[#1C1C1E] dark:bg-[#2C2C2E] p-6 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-[#F2F2F7]/80" />
                        <span className="text-sm font-medium text-[#F2F2F7]/80">Live agenda preview</span>
                      </div>
                      <h3 className="text-xl font-semibold text-white">Your saved schedule</h3>
                      <p className="text-sm text-[#F2F2F7]/70 mt-1">
                        These values are used by the agenda and booking availability.
                      </p>
                    </div>

                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-4">
                          <p className="text-xs uppercase tracking-wide text-[#8E8E93] dark:text-gray-500">Open</p>
                          <p className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1">
                            {agendaForm.start_hour}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-4">
                          <p className="text-xs uppercase tracking-wide text-[#8E8E93] dark:text-gray-500">Close</p>
                          <p className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1">
                            {agendaForm.end_hour}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-4">
                        <p className="text-xs uppercase tracking-wide text-[#8E8E93] dark:text-gray-500">Active days</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {agendaForm.working_days.length > 0 ? (
                            weekDays
                              .filter((day) => agendaForm.working_days.includes(day.value))
                              .map((day) => (
                                <span
                                  key={day.value}
                                  className="rounded-full px-3 py-1 bg-white dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80"
                                >
                                  {day.label}
                                </span>
                              ))
                          ) : (
                            <span className="text-sm text-[#8E8E93] dark:text-gray-500">No working days selected</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs uppercase tracking-wide text-[#8E8E93] dark:text-gray-500">Time slots</p>
                          <span className="rounded-full bg-primary/10 text-primary border-0 px-3 py-1 text-xs font-medium">
                            {agendaForm.service_duration} min
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {generateTimeSlots()
                            .slice(0, 20)
                            .map((slot) => (
                              <span
                                key={slot}
                                className="rounded-xl px-2.5 py-1 bg-white dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80"
                              >
                                {slot}
                              </span>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                    <CardHeader>
                      <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Business summary</CardTitle>
                      <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                        What will persist after you save.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4">
                        <p className="text-xs text-[#8E8E93] dark:text-gray-500 uppercase tracking-wide">Business</p>
                        <p className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1">
                          {brandForm.name || "Unnamed business"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4">
                        <p className="text-xs text-[#8E8E93] dark:text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1">
                          {brandForm.contact_phone || profileForm.phone || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4">
                        <p className="text-xs text-[#8E8E93] dark:text-gray-500 uppercase tracking-wide">Location</p>
                        <p className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1">
                          {brandForm.location || "Not set"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-emerald-200 bg-emerald-50 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-950">Agenda updates instantly</p>
                          <p className="text-sm text-emerald-800 mt-1">
                            Saving invalidates your agenda settings query so the agenda and public
                            booking availability can refresh with the new schedule.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                    <CardHeader>
                      <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Legal</CardTitle>
                      <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                        Review our terms and privacy policy.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <button
                        type="button"
                        onClick={() => navigate("/terms")}
                        className="w-full flex items-center justify-between rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4 text-left text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7] transition hover:opacity-80"
                      >
                        Terms of Service
                        <ArrowRight className="h-4 w-4 text-[#8E8E93]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/privacy")}
                        className="w-full flex items-center justify-between rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4 text-left text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7] transition hover:opacity-80"
                      >
                        Privacy Policy
                        <ArrowRight className="h-4 w-4 text-[#8E8E93]" />
                      </button>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-red-200 bg-red-50 shadow-sm dark:border-red-900/40 dark:bg-red-900/20">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                          <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Danger zone</CardTitle>
                          <CardDescription className="text-[#8E8E93] dark:text-gray-400">
                            Delete your account and all data.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="w-full flex items-center justify-between rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#1C1C1E] p-4 text-left text-sm font-medium text-red-600 dark:text-red-300 transition hover:opacity-80"
                      >
                        Delete account
                        <ArrowRight className="h-4 w-4 text-red-400" />
                      </button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
