/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

import {
  ChevronRight,
  Bell,
  Clock,
  User,
  Store,
  Sparkles,
  Link2,
  Moon,
  Sun,
  Check,
  Loader2,
  Save,
  Scissors,
  UserCircle2,
  LogOut,
  ChevronLeft,
  Calendar as CalendarIcon,
  MapPin,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PushToggle } from "@/components/PushToggle";
import { MessageTemplates } from "@/components/MessageTemplates";
import { BarbershopMap } from "@/components/BarbershopMap";
import { PublicVisibilityCard } from "@/components/PublicVisibilityCard";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { BrandImageUpload } from "@/components/BrandImageUpload";
import { ReviewRequestsCard } from "@/components/settings/ReviewRequestsCard";
import { MobileDock } from "@/components/MobileDock";
import { BookingStreakCard } from "@/components/BookingStreakCard";
import { useRoleSwitch } from "@/hooks/use-role-switch";
import { getBrowserTimezone, listTimezones, formatTzLabel } from "@/lib/tz";

const weekDays = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
];

const serviceDurationOptions = [10, 15, 20, 25, 30, 45, 60, 90];

// Sunday-first order for the day circles (S M T W T F S).
const dayCircles = [
  { value: 0, letter: "S" },
  { value: 1, letter: "M" },
  { value: 2, letter: "T" },
  { value: 3, letter: "W" },
  { value: 4, letter: "T" },
  { value: 5, letter: "F" },
  { value: 6, letter: "S" },
];

type Panel =
  | null
  | "profile"
  | "agenda"
  | "appearance"
  | "notifications"
  | "messages"
  | "booking"
  | "business"
  | "location"
  | "subscription";

export function MobileSettings(props: any) {
  const {
    user,
    theme,
    setTheme,
    profileForm,
    setProfileForm,
    brandForm,
    setBrandForm,
    agendaForm,
    setAgendaForm,
    toggleWorkingDay,
    notificationPrefs,
    setNotificationPrefs,
    notifications,
    hasValidHours,
    saveMutation,
    updateDarkModeMutation,
    isLoading,
    bannerMaxMB = 2,
    avatarMaxMB = 2,
  } = props;

  const { toast } = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const currentRole = user?.user_metadata?.role ?? "client";

  const initials =
    (profileForm.full_name || user?.email || "U")
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="min-h-screen w-full bg-[#0b0b0d] text-white relative overflow-x-hidden">


      {/* Header */}
      <header className="relative z-10 px-6 pt-7 pb-4 flex items-end justify-between">
        <div>
          <p className="text-white/40 text-[12px] font-medium uppercase tracking-[0.18em]">
            Account
          </p>
          <h1 className="font-cal text-[40px] leading-[1.05] text-white mt-1">
            Settings.
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="h-11 px-4 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[13px] font-semibold shadow-[0_8px_22px_-6px_rgba(225,29,72,0.6)] flex items-center gap-1.5"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          {saveMutation.isPending ? "Saving" : "Save"}
        </motion.button>
      </header>

      {/* Profile hero card */}
      <section className="relative z-10 px-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setPanel("profile")}
          className="w-full text-left rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-4 flex items-center gap-4 active:bg-white/[0.06] transition"
        >
          <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center font-cal text-xl text-white shadow-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-cal text-[18px] text-white truncate">
              {profileForm.full_name || brandForm.name || "Set your name"}
            </p>
            <p className="text-[12px] text-white/45 truncate">
              {user?.email || "Tap to edit profile"}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300">
            {currentRole}
          </span>
        </motion.button>
      </section>

      {/* Role switch chips */}
      <section className="relative z-10 px-6 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "client", label: "Client", Icon: UserCircle2 },
            { key: "barber", label: "Barber", Icon: Scissors },
          ].map(({ key, label, Icon }) => {
            const selected = currentRole === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  if (selected) return;
                  await supabase.auth.updateUser({ data: { role: key } });
                  await (supabase as any).from("profiles").update({ role: key }).eq("id", user?.id);
                  toast({ title: `Switched to ${label}` });
                  window.location.reload();
                }}
                className={cn(
                  "h-14 rounded-2xl border flex items-center justify-center gap-2 text-[13px] font-semibold transition",
                  selected
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                    : "bg-white/[0.04] border-white/10 text-white/70"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {selected && <Check className="h-3.5 w-3.5" />}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Grouped lists */}
      <section className="relative z-10 px-6 mt-6 pb-32 space-y-6">
        <BookingStreakCard />
        <Group label="Business">
          <Row
            icon={User}
            tint="#0A84FF"
            label="Profile identity"
            value={
              profileForm.full_name ||
              user?.user_metadata?.full_name ||
              user?.email?.split("@")[0] ||
              "Set your name"
            }
            avatar={brandForm.avatar_url}
            onClick={() => setPanel("profile")}
          />
          <Row
            icon={Store}
            tint="#e11d48"
            label="Business identity"
            value={brandForm.name || "Not set"}
            avatar={brandForm.avatar_url}
            banner={brandForm.banner_url}
            onClick={() => setPanel("business")}
          />

          <Row
            icon={MapPin}
            tint="#22c55e"
            label="Map location"
            value={
              brandForm.latitude && brandForm.longitude
                ? `${brandForm.latitude.toFixed(3)}, ${brandForm.longitude.toFixed(3)}`
                : "Pick on map"
            }
            onClick={() => setPanel("location")}
          />
          <Row
            icon={Link2}
            tint="#06b6d4"
            label="Booking link"
            value="Share & embed"
            onClick={() => setPanel("booking")}
          />
          <Row
            icon={Sparkles}
            tint="#ec4899"
            label="Message templates"
            value="WhatsApp & SMS"
            onClick={() => setPanel("messages")}
          />
          <Row
            icon={CalendarIcon}
            tint="#8b5cf6"
            label="Subscription"
            value="Plan & billing"
            onClick={() => setPanel("subscription")}
          />
        </Group>

        <Group label="Preferences">
          <Row
            icon={Clock}
            tint="#3b82f6"
            label="Agenda timing"
            value={`${agendaForm.start_hour} – ${agendaForm.end_hour}`}
            onClick={() => setPanel("agenda")}
          />
          <Row
            icon={theme === "dark" ? Moon : Sun}
            tint="#a855f7"
            label="Appearance"
            value={theme === "dark" ? "Dark" : "Light"}
            onClick={() => setPanel("appearance")}
          />
          <Row
            icon={Bell}
            tint="#f59e0b"
            label="Alerts & reviews"
            value={`${Object.values(notificationPrefs).filter(Boolean).length} on`}
            onClick={() => setPanel("notifications")}
          />
        </Group>

        <Group label="Session">
          <Row
            icon={LogOut}
            tint="#ef4444"
            label="Sign out"
            danger
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          />
        </Group>

        <p className="text-center text-[11px] text-white/30 pt-2">
          Cutzio · v1.0
        </p>
      </section>

      <MobileDock />

      {/* Slide-over panel */}
      <AnimatePresence>
        {panel && (
          <Sheet onClose={() => setPanel(null)} title={titleFor(panel)}>
            {panel === "profile" && (
              <PanelStack>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center gap-4">
                  <BrandImageUpload
                    label=""
                    path={brandForm.avatar_url}
                    onChange={(url) => setBrandForm((p: any) => ({ ...p, avatar_url: url }))}
                    folder="avatar"
                    circle
                    maxSizeMB={avatarMaxMB}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {profileForm.full_name || brandForm.name || "Your name"}
                    </p>
                    <p className="text-[11px] text-white/50">Personal identity · shown on Find Barber</p>
                  </div>
                </div>
                <Field label="Full name">
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((p: any) => ({ ...p, full_name: e.target.value }))
                    }
                    placeholder="Your full name"
                    className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                  />
                </Field>
                <Field label="Personal phone">
                  <Input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((p: any) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+1 555 123 4567"
                    className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                  />
                </Field>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4" strokeWidth={2.5} /> Save changes</>
                  )}
                </motion.button>
                {user?.id && (
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-1">
                    <PublicVisibilityCard userId={user.id} />
                  </div>
                )}
              </PanelStack>
            )}

            {panel === "agenda" && (
              <PanelStack>
                {/* During this time */}
                <div>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <Clock className="h-3.5 w-3.5 text-white/40" />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/45">
                      During this time
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="time"
                        value={agendaForm.start_hour}
                        onChange={(e) =>
                          setAgendaForm((p: any) => ({ ...p, start_hour: e.target.value }))
                        }
                        className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-center text-lg font-semibold outline-none focus:border-rose-500"
                      />
                      <p className="text-[11px] text-white/40 text-center mt-1.5">Opens</p>
                    </div>
                    <span className="text-white/40 font-medium mb-5">to</span>
                    <div className="flex-1">
                      <input
                        type="time"
                        value={agendaForm.end_hour}
                        onChange={(e) =>
                          setAgendaForm((p: any) => ({ ...p, end_hour: e.target.value }))
                        }
                        className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-center text-lg font-semibold outline-none focus:border-rose-500"
                      />
                      <p className="text-[11px] text-white/40 text-center mt-1.5">Closes</p>
                    </div>
                  </div>
                  {!hasValidHours && (
                    <p className="text-[12px] text-rose-300 px-1 mt-2">
                      Closing time must be later than opening.
                    </p>
                  )}
                </div>

                {/* On these days */}
                <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3.5">
                    <p className="text-[15px] font-medium text-white">On these days</p>
                    <span className="text-[13px] text-white/40">
                      {agendaForm.working_days.length === 7
                        ? "Everyday"
                        : `${agendaForm.working_days.length} days`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    {dayCircles.map((d) => {
                      const active = agendaForm.working_days.includes(d.value);
                      return (
                        <motion.button
                          key={`${d.value}-${d.letter}`}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => toggleWorkingDay(d.value)}
                          className={cn(
                            "h-9 w-9 rounded-full text-[13px] font-semibold transition",
                            active
                              ? "bg-white text-black"
                              : "bg-white/[0.06] text-white/50"
                          )}
                        >
                          {d.letter}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Per-day custom hours */}
                <CustomDayHoursEditor
                  userId={user?.id}
                  workingDays={agendaForm.working_days}
                  defaultOpen={agendaForm.start_hour}
                  defaultClose={agendaForm.end_hour}
                />


                {/* Slot duration */}
                <Field label="Slot duration">
                  <div className="grid grid-cols-4 gap-2">
                    {serviceDurationOptions.map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          setAgendaForm((p: any) => ({ ...p, service_duration: d }))
                        }
                        className={cn(
                          "h-11 rounded-2xl text-[13px] font-semibold border transition",
                          agendaForm.service_duration === d
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white/[0.04] text-white/70 border-white/10"
                        )}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Time zone */}
                <Field label="Time zone">
                  <select
                    value={brandForm.timezone || getBrowserTimezone()}
                    onChange={(e) =>
                      setBrandForm((p: any) => ({ ...p, timezone: e.target.value }))
                    }
                    className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-white px-3 text-[14px]"
                  >
                    {listTimezones().map((tz) => (
                      <option key={tz} value={tz} className="bg-[#111]">
                        {formatTzLabel(tz)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-white/40 mt-1.5 px-1">
                    Booking slots for clients use this zone. Device: {formatTzLabel(getBrowserTimezone())}
                  </p>
                </Field>

                {/* Booking language */}
                <Field label="Booking language">
                  <select
                    value={brandForm.booking_locale || "en"}
                    onChange={(e) =>
                      setBrandForm((p: any) => ({ ...p, booking_locale: e.target.value }))
                    }
                    className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-white px-3 text-[14px]"
                  >
                    <option value="en" className="bg-[#111]">English</option>
                    <option value="el" className="bg-[#111]">Greek (Ελληνικά)</option>
                    <option value="pl" className="bg-[#111]">Polish (Polski)</option>
                  </select>
                  <p className="text-[11px] text-white/40 mt-1.5 px-1">
                    Language used on the public booking page and client messages. Default: English.
                  </p>
                </Field>

                {/* Gradient save button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !hasValidHours || agendaForm.working_days.length === 0}
                  className="w-full h-14 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[15px] font-semibold shadow-[0_12px_28px_-8px_rgba(225,29,72,0.65)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4" strokeWidth={2.5} /> Save working hours</>
                  )}
                </motion.button>
              </PanelStack>
            )}

            {panel === "appearance" && (
              <PanelStack>
                <ListCard>
                  <ToggleRow
                    icon={Moon}
                    label="Dark mode"
                    desc="Use dark theme across the app"
                    checked={theme === "dark"}
                    onChange={(v) => {
                      setTheme(v ? "dark" : "light");
                      updateDarkModeMutation.mutate(v);
                    }}
                  />
                  <ModeRow />
                </ListCard>
              </PanelStack>
            )}

            {panel === "notifications" && (
              <PanelStack>
                <ListCard>
                  <div className="px-4 py-3 border-b border-white/5">
                    <PushToggle />
                  </div>
                  {notifications.map((item: any, i: number) => (
                    <ToggleRow
                      key={item.id}
                      label={item.label}
                      desc={item.desc}
                      checked={notificationPrefs[item.id]}
                      onChange={(v) =>
                        setNotificationPrefs((p: any) => ({ ...p, [item.id]: v }))
                      }
                      isLast={i === notifications.length - 1}
                    />
                  ))}
                </ListCard>
                <div className="mt-4">
                  <ReviewRequestsCard />
                </div>
              </PanelStack>
            )}

            {panel === "messages" && (
              <PanelStack>
                <MessageTemplates />
              </PanelStack>
            )}

            {panel === "booking" && (
              <PanelStack>
                <BookingLinkGenerator />
              </PanelStack>
            )}

            {panel === "subscription" && (
              <PanelStack>
                <SubscriptionCard />
              </PanelStack>
            )}

            {panel === "business" && (
              <PanelStack>
                <BrandImageUpload
                  label="Banner photo"
                  path={brandForm.banner_url}
                  onChange={(url) => setBrandForm((p: any) => ({ ...p, banner_url: url }))}
                  folder="banner"
                  maxSizeMB={bannerMaxMB}
                  helperText={`Recommended 1200×400, max ${bannerMaxMB}MB`}
                  className="w-full"
                />

                <Field label="Business name">
                  <Input
                    value={brandForm.name}
                    onChange={(e) => setBrandForm((p: any) => ({ ...p, name: e.target.value }))}
                    placeholder="Cutzio Studio"
                    className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                  />
                </Field>
                <Field label="Public phone">
                  <Input
                    value={brandForm.contact_phone}
                    onChange={(e) =>
                      setBrandForm((p: any) => ({ ...p, contact_phone: e.target.value }))
                    }
                    placeholder="+1 555 987 6543"
                    className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <Input
                      value={brandForm.city}
                      onChange={(e) => setBrandForm((p: any) => ({ ...p, city: e.target.value }))}
                      placeholder="New York"
                      className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                    />
                  </Field>
                  <Field label="Years exp">
                    <Input
                      type="number"
                      value={brandForm.years_experience ?? ""}
                      onChange={(e) =>
                        setBrandForm((p: any) => ({
                          ...p,
                          years_experience: e.target.value
                            ? parseInt(e.target.value, 10)
                            : undefined,
                        }))
                      }
                      placeholder="7"
                      className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                    />
                  </Field>
                </div>
                <Field label="Street address">
                  <Input
                    value={brandForm.location}
                    onChange={(e) =>
                      setBrandForm((p: any) => ({ ...p, location: e.target.value }))
                    }
                    placeholder="123 Main Street"
                    className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                  />
                </Field>
                <Field label="About">
                  <textarea
                    value={brandForm.description}
                    onChange={(e) =>
                      setBrandForm((p: any) => ({ ...p, description: e.target.value }))
                    }
                    rows={4}
                    maxLength={400}
                    placeholder="Tell clients about your style..."
                    className="w-full rounded-2xl bg-white/[0.06] border border-white/10 text-white p-3 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <ListCard>
                  <ToggleRow
                    icon={Sparkles}
                    label="Accept cancellation waitlist"
                    desc="Clients can join a 7-day waitlist."
                    checked={!!brandForm.accepts_waitlist}
                    onChange={(v) =>
                      setBrandForm((p: any) => ({ ...p, accepts_waitlist: v }))
                    }
                  />
                </ListCard>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4" strokeWidth={2.5} /> Save business identity</>
                  )}
                </motion.button>
              </PanelStack>
            )}

            {panel === "location" && (
              <PanelStack>
                <p className="text-[13px] text-white/50 px-1">
                  Search your address, then tap where your shop is.
                </p>
                <div className="rounded-2xl overflow-hidden border border-white/10">
                  <BarbershopMap
                    barbershops={
                      brandForm.latitude && brandForm.longitude
                        ? [
                            {
                              id: "current",
                              name: brandForm.name || "Your Business",
                              location: brandForm.location || "",
                              latitude: brandForm.latitude,
                              longitude: brandForm.longitude,
                              contact_phone: brandForm.contact_phone,
                            },
                          ]
                        : []
                    }
                    height="380px"
                    pickMode
                    initialCenter={
                      brandForm.latitude && brandForm.longitude
                        ? { lat: brandForm.latitude, lng: brandForm.longitude }
                        : undefined
                    }
                    onLocationPick={({ lat, lng }: any) =>
                      setBrandForm((p: any) => ({
                        ...p,
                        latitude: lat,
                        longitude: lng,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="any"
                      value={brandForm.latitude || ""}
                      onChange={(e) =>
                        setBrandForm((p: any) => ({
                          ...p,
                          latitude: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      step="any"
                      value={brandForm.longitude || ""}
                      onChange={(e) =>
                        setBrandForm((p: any) => ({
                          ...p,
                          longitude: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      className="h-12 rounded-2xl bg-white/[0.06] border-white/10 text-white"
                    />
                  </Field>
                </div>
              </PanelStack>
            )}
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- atoms ---------- */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/35 text-[11px] uppercase tracking-[0.18em] font-bold px-2 mb-2">
        {label}
      </p>
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  tint,
  label,
  value,
  onClick,
  danger,
  avatar,
  banner,
}: {
  icon: any;
  tint: string;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  avatar?: string | null;
  banner?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition text-left"
    >
      {banner || avatar ? (
        <span className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
          {banner && (
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {avatar && (
            <img
              src={avatar}
              alt=""
              className={cn(
                "h-full w-full object-cover",
                banner && "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-[#15151A]"
              )}
            />
          )}
        </span>
      ) : (
        <span
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${tint}26` }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: tint }} />
        </span>
      )}
      <span
        className={cn(
          "flex-1 text-[15px] font-medium truncate",
          danger ? "text-rose-300" : "text-white"
        )}
      >
        {label}
      </span>
      {value && (
        <span className="text-[13px] text-white/40 truncate max-w-[40%]">{value}</span>
      )}
      <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
    </button>
  );
}


function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed inset-0 z-50 bg-[#0b0b0d] flex flex-col"
      >
        <header className="flex items-center gap-2 px-4 pt-6 pb-3 border-b border-white/5">
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 active:scale-95 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-cal text-[22px] text-white ml-1">{title}</h2>
        </header>
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-32"
          style={{ WebkitOverflowScrolling: "touch" as any }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
}


function PanelStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/45 mb-2 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden divide-y divide-white/5">
      {children}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
  isLast,
}: {
  icon?: any;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", isLast && "")}>
      {Icon && (
        <span className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-4 w-4 text-white/70" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-white">{label}</p>
        {desc && <p className="text-[12px] text-white/40 mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function titleFor(p: Panel): string {
  switch (p) {
    case "profile":
      return "Profile";
    case "agenda":
      return "Agenda";
    case "appearance":
      return "Appearance";
    case "notifications":
      return "Notifications";
    case "messages":
      return "Messages";
    case "booking":
      return "Booking link";
    case "business":
      return "Business";
    case "location":
      return "Map location";
    case "subscription":
      return "Subscription";
    default:
      return "";
  }
}

function ModeRow() {
  const { role, setRole, switching } = useRoleSwitch();
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 rounded-2xl bg-white/5 flex items-center justify-center text-white/80">
          <Scissors className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[15px] font-medium text-white">Barber mode</p>
          <p className="text-xs text-white/55">Use the barber dashboard instead of finding a barber</p>
        </div>
      </div>
      <Switch
        checked={role === "barber"}
        disabled={switching}
        onCheckedChange={(v) => setRole(v ? "barber" : "client")}
      />
    </div>
  );
}
