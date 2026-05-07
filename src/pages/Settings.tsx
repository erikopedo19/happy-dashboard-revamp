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
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

  const { data, isLoading } = useQuery({
    queryKey: ["settings-page-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const [agendaResult, profileResult, brandResult] = await Promise.all([
        (supabase as any)
          .from("agenda_settings")
          .select("user_id, service_duration, start_hour, end_hour, working_days")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("brand_profiles")
          .select("name, contact_phone, location")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (agendaResult.error && agendaResult.error.code !== "PGRST116") {
        throw agendaResult.error;
      }

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      if (brandResult.error && brandResult.error.code !== "PGRST116") {
        throw brandResult.error;
      }

      return {
        agenda: agendaResult.data,
        profile: profileResult.data,
        brand: brandResult.data,
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
      name: data.brand?.name ?? user.user_metadata?.full_name ?? "",
      contact_phone: data.brand?.contact_phone ?? data.profile?.phone ?? "",
      location: data.brand?.location ?? "",
    });
  }, [data, user]);

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

      const profilePayload = {
        id: user.id,
        full_name: profileForm.full_name.trim() || null,
        phone: profileForm.phone.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const brandPayload = {
        user_id: user.id,
        name: brandForm.name.trim() || profileForm.full_name.trim() || "My Business",
        contact_phone: brandForm.contact_phone.trim() || profileForm.phone.trim() || null,
        location: brandForm.location.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const [agendaResult, profileResult, brandResult] = await Promise.all([
        (supabase as any).from("agenda_settings").upsert(agendaPayload, { onConflict: "user_id" }),
        (supabase as any).from("profiles").upsert(profilePayload, { onConflict: "id" }),
        (supabase as any).from("brand_profiles").upsert(brandPayload, { onConflict: "user_id" }),
      ]);

      if (agendaResult.error) throw agendaResult.error;
      if (profileResult.error) throw profileResult.error;
      if (brandResult.error) throw brandResult.error;

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
      <div className="h-screen flex w-full bg-[#f6f7fb] overflow-hidden">
        <AppSidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-white/60 bg-white/85 backdrop-blur-xl">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="lg:hidden" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-2xl font-semibold text-gray-950">Settings</h1>
                    <Badge className="rounded-full bg-gray-900 text-white border-0">
                      Live sync
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500">
                    Save once and your agenda and booking flow update immediately.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || isLoading}
                className="rounded-2xl bg-gray-950 hover:bg-black text-white shadow-sm"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
                <div className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="w-full justify-start rounded-2xl bg-white border border-gray-200 p-1 h-auto flex-wrap">
                      <TabsTrigger value="general" className="rounded-xl">
                        <Settings2 className="w-4 h-4 mr-2" />
                        General
                      </TabsTrigger>
                      <TabsTrigger value="booking" className="rounded-xl">
                        <Link2 className="w-4 h-4 mr-2" />
                        Booking
                      </TabsTrigger>
                      <TabsTrigger value="notifications" className="rounded-xl">
                        <Bell className="w-4 h-4 mr-2" />
                        Notifications
                      </TabsTrigger>
                      <TabsTrigger value="business" className="rounded-xl">
                        <Store className="w-4 h-4 mr-2" />
                        Business
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-0 space-y-6">
                      <Card className="rounded-3xl border-gray-200 shadow-sm bg-white">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle>Agenda timing</CardTitle>
                              <CardDescription>
                                Control slot length, opening hours, and working days.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
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
                                      ? "bg-gray-950 text-white border-gray-950 shadow-sm"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-950"
                                  )}
                                >
                                  {duration}m
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Opens at
                              </Label>
                              <Input
                                type="time"
                                value={agendaForm.start_hour}
                                onChange={(e) =>
                                  setAgendaForm((prev) => ({ ...prev, start_hour: e.target.value }))
                                }
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Closes at
                              </Label>
                              <Input
                                type="time"
                                value={agendaForm.end_hour}
                                onChange={(e) =>
                                  setAgendaForm((prev) => ({ ...prev, end_hour: e.target.value }))
                                }
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>
                          </div>

                          {!hasValidHours && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              Closing time must be later than opening time.
                            </div>
                          )}

                          <Separator />

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-3 block">
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
                                        ? "border-gray-950 bg-gray-950 text-white shadow-sm"
                                        : "border-gray-200 bg-white hover:border-gray-400"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold">{day.label}</span>
                                      {active && <Check className="w-4 h-4" />}
                                    </div>
                                    <p
                                      className={cn(
                                        "text-xs mt-1",
                                        active ? "text-white/70" : "text-gray-500"
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
                      <Card className="rounded-3xl border-gray-200 shadow-sm bg-white">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                              <Bell className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <CardTitle>Notifications</CardTitle>
                              <CardDescription>
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
                                  <p className="text-sm font-medium text-gray-950">{item.label}</p>
                                  <p className="text-sm text-gray-500">{item.desc}</p>
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
                              {index < notifications.length - 1 && <Separator />}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="business" className="mt-0 space-y-6">
                      <Card className="rounded-3xl border-gray-200 shadow-sm bg-white">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <CardTitle>Business identity</CardTitle>
                              <CardDescription>
                                Persist the business details used across the app and public booking.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Owner / profile name
                              </Label>
                              <Input
                                value={profileForm.full_name}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                                }
                                placeholder="Your full name"
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Personal phone
                              </Label>
                              <Input
                                value={profileForm.phone}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                                placeholder="+1 555 123 4567"
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Business name
                              </Label>
                              <Input
                                value={brandForm.name}
                                onChange={(e) =>
                                  setBrandForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="Cutzio Studio"
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
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
                                className="h-12 rounded-2xl border-gray-200"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Location
                            </Label>
                            <Input
                              value={brandForm.location}
                              onChange={(e) =>
                                setBrandForm((prev) => ({ ...prev, location: e.target.value }))
                              }
                              placeholder="123 Main Street, New York"
                              className="h-12 rounded-2xl border-gray-200"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-6">
                  <Card className="rounded-3xl border-gray-200 shadow-sm bg-white overflow-hidden">
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
                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Open</p>
                          <p className="text-lg font-semibold text-gray-950 mt-1">
                            {agendaForm.start_hour}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Close</p>
                          <p className="text-lg font-semibold text-gray-950 mt-1">
                            {agendaForm.end_hour}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Active days</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {agendaForm.working_days.length > 0 ? (
                            weekDays
                              .filter((day) => agendaForm.working_days.includes(day.value))
                              .map((day) => (
                                <Badge
                                  key={day.value}
                                  variant="secondary"
                                  className="rounded-full px-3 py-1 bg-white border border-gray-200 text-gray-700"
                                >
                                  {day.label}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-sm text-gray-500">No working days selected</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Time slots</p>
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
                                className="rounded-xl px-2.5 py-1 bg-white border border-gray-200 text-gray-700"
                              >
                                {slot}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-gray-200 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle>Business summary</CardTitle>
                      <CardDescription>
                        What will persist after you save.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Business</p>
                        <p className="text-base font-semibold text-gray-950 mt-1">
                          {brandForm.name || "Unnamed business"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-base font-semibold text-gray-950 mt-1">
                          {brandForm.contact_phone || profileForm.phone || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                        <p className="text-base font-semibold text-gray-950 mt-1">
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
