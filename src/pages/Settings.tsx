import { useEffect, useMemo, useState } from "react";
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
  Moon,
  Sun,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoseGradientButton } from "@/components/RoseGradientButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { BrandImageUpload } from "@/components/BrandImageUpload";

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
  location: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
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
  location: "",
  latitude: undefined,
  longitude: undefined,
  google_maps_url: "",
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
  const [activeTab, setActiveTab] = useState("general");
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
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

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
          .select("full_name, phone, dark_mode, business_name, address, latitude, longitude, google_maps_url, avatar_url")
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
      location: data.profile?.address ?? "",
      latitude: data.profile?.latitude ?? undefined,
      longitude: data.profile?.longitude ?? undefined,
      google_maps_url: data.profile?.google_maps_url ?? "",
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
        address: brandForm.location.trim() || null,
        latitude: lat ?? null,
        longitude: lng ?? null,
        google_maps_url: mapsUrl || null,
        updated_at: new Date().toISOString(),
      };

      const [agendaResult, profileResult] = await Promise.all([
        (supabase as any).from("agenda_settings").upsert(agendaPayload, { onConflict: "user_id" }),
        (supabase as any).from("profiles").upsert(profilePayload, { onConflict: "id" }),
      ]);

      if (agendaResult.error) throw agendaResult.error;
      if (profileResult.error) throw profileResult.error;

      // Reflect parsed coordinates back into the form
      if (mapsUrl && lat !== undefined && lng !== undefined) {
        setBrandForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      }

      return true;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings-page-data", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["agenda_settings", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["public-agenda-settings"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["appointments"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["stylists"], exact: false }),
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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-[#C6C6C8] dark:border-[#2C2C2E] bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="lg:hidden text-gray-600 dark:text-gray-400" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-2xl font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Settings</h1>
                    <Badge className="rounded-full bg-gray-900 dark:bg-rose-600 text-white border-0">
                      Live sync
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-[#8E8E93] dark:text-gray-500">
                    Save once and your agenda and booking flow update immediately.
                  </p>
                </div>
              </div>

              <RoseGradientButton
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || isLoading}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                )}
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </RoseGradientButton>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
                <div className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="w-full justify-start rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-1 h-auto flex-wrap">
                      <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E]">
                        <Settings2 className="w-4 h-4 mr-2" />
                        General
                      </TabsTrigger>
                      <TabsTrigger value="booking" className="rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E]">
                        <Link2 className="w-4 h-4 mr-2" />
                        Booking
                      </TabsTrigger>
                      <TabsTrigger value="messages" className="rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E]">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Messages
                      </TabsTrigger>
                      <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E]">
                        <Bell className="w-4 h-4 mr-2" />
                        Notifications
                      </TabsTrigger>
                      <TabsTrigger value="business" className="rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E]">
                        <Store className="w-4 h-4 mr-2" />
                        Business
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="messages" className="mt-0 space-y-6">
                      <MessageTemplates />
                    </TabsContent>

                    <TabsContent value="general" className="mt-0 space-y-6">
                      <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-3 block">
                              Slot duration
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
                                    "h-11 rounded-2xl border text-sm font-medium transition-all",
                                    agendaForm.service_duration === duration
                                      ? "bg-[#007AFF] text-white border-gray-950 shadow-sm"
                                      : "bg-white dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-gray-400 border-[#C6C6C8] dark:border-[#2C2C2E] hover:border-gray-400 dark:hover:border-[#3A3A3C] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
                                  )}
                                >
                                  {duration}m
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Opens at
                              </Label>
                              <Input
                                type="time"
                                value={agendaForm.start_hour}
                                onChange={(e) =>
                                  setAgendaForm((prev) => ({ ...prev, start_hour: e.target.value }))
                                }
                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                                Closes at
                              </Label>
                              <Input
                                type="time"
                                value={agendaForm.end_hour}
                                onChange={(e) =>
                                  setAgendaForm((prev) => ({ ...prev, end_hour: e.target.value }))
                                }
                                className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                              />
                            </div>
                          </div>

                          {!hasValidHours && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              Closing time must be later than opening time.
                            </div>
                          )}

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
                                        ? "border-gray-950 bg-[#007AFF] text-white shadow-sm"
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

                    <TabsContent value="booking" className="mt-0 space-y-6">
                      <BookingLinkGenerator />
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0">
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
                    </TabsContent>

                    <TabsContent value="business" className="mt-0 space-y-6">
                      {user?.id && <PublicVisibilityCard userId={user.id} />}
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

                          <div>
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                              Location
                            </Label>
                            <Input
                              value={brandForm.location}
                              onChange={(e) =>
                                setBrandForm((prev) => ({ ...prev, location: e.target.value }))
                              }
                              placeholder="123 Main Street, New York"
                              className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                              Google Maps link
                            </Label>
                            <p className="text-xs text-[#8E8E93] dark:text-gray-500 mb-2">
                              Paste a Google Maps share link — coordinates auto-fill on save.
                            </p>
                            <Input
                              value={brandForm.google_maps_url || ""}
                              onChange={(e) => {
                                const url = e.target.value;
                                setBrandForm((prev) => {
                                  const parsed = extractLatLngFromGoogleUrl(url);
                                  return {
                                    ...prev,
                                    google_maps_url: url,
                                    latitude: parsed?.lat ?? prev.latitude,
                                    longitude: parsed?.lng ?? prev.longitude,
                                  };
                                });
                              }}
                              placeholder="https://maps.google.com/?q=40.7128,-74.0060"
                              className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
                              Map Location
                            </Label>
                            <p className="text-xs text-[#8E8E93] dark:text-gray-500 mb-3">
                              Click on the map to set your barbershop location
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
                              onBarbershopClick={(barbershop) => {
                                // This is for when clicking on other barbershops in the public page
                              }}
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
                  <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E] overflow-hidden">
                    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-white/80" />
                        <span className="text-sm font-medium text-white/80">Live agenda preview</span>
                      </div>
                      <h3 className="text-xl font-semibold">Your saved schedule</h3>
                      <p className="text-sm text-white/70 mt-1">
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
                                <Badge
                                  key={day.value}
                                  variant="secondary"
                                  className="rounded-full px-3 py-1 bg-white dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80"
                                >
                                  {day.label}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-sm text-[#8E8E93] dark:text-gray-500">No working days selected</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs uppercase tracking-wide text-[#8E8E93] dark:text-gray-500">Time slots</p>
                          <Badge className="rounded-full bg-blue-100 text-blue-700 border-0">
                            {agendaForm.service_duration} min
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {generateTimeSlots()
                            .slice(0, 20)
                            .map((slot) => (
                              <Badge
                                key={slot}
                                variant="secondary"
                                className="rounded-xl px-2.5 py-1 bg-white dark:bg-[#2C2C2E] border border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80"
                              >
                                {slot}
                              </Badge>
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
                </div>
              </div>
            </div>
          </div>
          <MobileDock />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
