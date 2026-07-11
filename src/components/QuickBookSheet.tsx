import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Calendar, Clock, Scissors, ArrowLeft, Sparkles, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserTimezone, dateStrInTz, minutesInTz, timeStrToMinutes, formatTzLabel } from "@/lib/tz";

interface QuickBookSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barberName: string;
  bookingLink?: string | null;
  accentColor?: string;
}

type Step = "pick" | "details" | "success";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface AgendaSettings {
  start_hour: string;
  end_hour: string;
  service_duration: number;
  working_days?: number[] | null;
  timezone?: string | null;
}

interface BookedSlot {
  appointment_time: string;
  service: { duration: number } | null;
}

function generateTimeSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];
  const s = parseInt(start.split(":")[0]);
  const e = parseInt(end.split(":")[0]);
  for (let h = s; h <= e; h++) {
    for (let m = 0; m < 60; m += interval) {
      if (h === e && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

export function QuickBookSheet({
  open,
  onOpenChange,
  barberId,
  barberName,
  accentColor = "#e11d48",
}: QuickBookSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("pick");
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState<{ date: Date; time: string } | null>(null);
  // Hard re-entry lock — guards against double-tap firing two RPCs before React re-renders the disabled state.
  const submitLockRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("pick");
      setTime("");
      setDate(new Date());
      setConfirmedTime(null);
      submitLockRef.current = false;
    }
  }, [open]);

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["quickbook-services", barberId],
    enabled: open && !!barberId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("services")
        .select("id, name, duration, price")
        .eq("user_id", barberId)
        .is("deleted_at", null)
        .order("price", { ascending: true });
      return data || [];
    },
  });

  useEffect(() => {
    if (services.length && !serviceId) setServiceId(services[0].id);
  }, [services, serviceId]);

  const { data: settings } = useQuery<AgendaSettings>({
    queryKey: ["quickbook-settings", barberId],
    enabled: open && !!barberId,
    queryFn: async () => {
      const [agendaRes, profileRes] = await Promise.all([
        (supabase as any)
          .from("agenda_settings")
          .select("start_hour, end_hour, service_duration, working_days")
          .eq("user_id", barberId)
          .maybeSingle(),
        (supabase as any)
          .from("profiles")
          .select("timezone")
          .eq("id", barberId)
          .maybeSingle(),
      ]);
      const base = agendaRes?.data || {
        start_hour: "09:00",
        end_hour: "18:00",
        service_duration: 30,
        working_days: [0, 1, 2, 3, 4, 5, 6],
      };
      return { ...base, timezone: profileRes?.data?.timezone || null } as AgendaSettings;
    },
  });

  const { data: booked = [] } = useQuery<BookedSlot[]>({
    queryKey: ["quickbook-booked", barberId, format(date, "yyyy-MM-dd")],
    enabled: open && !!barberId,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_booked_slots", {
        _business_id: barberId,
        _date: format(date, "yyyy-MM-dd"),
      });
      return data || [];
    },
  });

  const allSlots = useMemo(() => {
    if (!settings) return [];
    return generateTimeSlots(settings.start_hour, settings.end_hour, settings.service_duration);
  }, [settings]);

  const selectedService = services.find((s) => s.id === serviceId);
  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4, 5, 6];

  const nextDays = useMemo(() => {
    const out: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      if (workingDays.includes(d.getDay())) out.push(d);
      if (out.length >= 7) break;
    }
    return out;
  }, [workingDays]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !settings) return [];
    const interval = settings.service_duration;
    const slotsNeeded = Math.ceil(selectedService.duration / interval);
    const tz = settings.timezone || getBrowserTimezone();
    const now = new Date();
    const selectedDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const isTodayTz = selectedDateStr === dateStrInTz(now, tz);
    const nowMinutes = minutesInTz(now, tz);

    return allSlots.filter((t) => {
      if (isTodayTz && timeStrToMinutes(t) <= nowMinutes) return false;
      const startIdx = allSlots.indexOf(t);
      for (let i = 0; i < slotsNeeded; i++) {
        const check = allSlots[startIdx + i];
        if (!check) return false;
        const taken = booked.some((b) => {
          const bt = b.appointment_time?.substring(0, 5);
          if (!bt) return false;
          const bSlots = Math.ceil((b.service?.duration || interval) / interval);
          const bIdx = allSlots.indexOf(bt);
          const cIdx = allSlots.indexOf(check);
          return cIdx >= bIdx && cIdx < bIdx + bSlots;
        });
        if (taken) return false;
      }
      return true;
    });
  }, [allSlots, booked, selectedService, settings, date]);

  const canContinue = serviceId && time;
  const canConfirm = name.trim() && /\S+@\S+\.\S+/.test(email);

  const handleConfirm = async () => {
    if (!selectedService || !canConfirm) return;
    // Synchronous re-entry guard — beats React state in a rapid double-tap race.
    if (submitLockRef.current || submitting) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_public_booking", {
        p_business_id: barberId,
        p_customer_name: name.trim(),
        p_customer_email: email.trim(),
        p_customer_phone: phone.trim() || null,
        p_service_id: selectedService.id,
        p_appointment_date: format(date, "yyyy-MM-dd"),
        p_appointment_time: time,
        p_notes: null,
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Could not create booking");
      }
      setConfirmedTime({ date, time });
      setStep("success");
      qc.invalidateQueries({ queryKey: ["quickbook-booked"] });
    } catch (e: any) {
      // Release lock so the user can retry after a failure (e.g. slot taken).
      submitLockRef.current = false;
      toast({
        title: "Booking failed",
        description: e?.message || "Please try a different time",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] border-0 bg-white dark:bg-[#1C1C1E] p-0 max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Grabber */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between shrink-0">
          {step === "details" ? (
            <button
              onClick={() => setStep("pick")}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center active:scale-95 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold">
              {step === "success" ? "Confirmed" : "Book with"}
            </p>
            <h2 className="font-serif text-[20px] leading-tight text-[#1C1C1E] dark:text-[#F2F2F7] truncate max-w-[200px]">
              {barberName}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center active:scale-95 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <AnimatePresence mode="wait">
            {step === "pick" && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 pb-4"
              >
                {/* Service */}
                <section>
                  <SectionTitle icon={<Scissors className="w-3.5 h-3.5" />} label="Service" />
                  {servicesLoading ? (
                    <div className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
                  ) : services.length === 0 ? (
                    <EmptyHint text="No services available yet" />
                  ) : (
                    <div className="space-y-2">
                      {services.map((s) => {
                        const active = s.id === serviceId;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setServiceId(s.id);
                              setTime("");
                            }}
                            className={cn(
                              "w-full p-3.5 rounded-2xl border-2 flex items-center justify-between text-left transition active:scale-[0.99]",
                              active
                                ? "border-transparent bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10"
                                : "border-black/5 dark:border-white/5 bg-[#F8F8F8] dark:bg-[#2C2C2E]"
                            )}
                            style={active ? { boxShadow: `0 0 0 2px ${accentColor}` } : undefined}
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                                {s.name}
                              </div>
                              <div className="text-[12px] text-[#8E8E93] mt-0.5">
                                {s.duration} min
                              </div>
                            </div>
                            <div className="font-bold tabular-nums text-[15px]" style={{ color: active ? accentColor : undefined }}>
                              ${Number(s.price).toFixed(0)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Date */}
                <section>
                  <SectionTitle icon={<Calendar className="w-3.5 h-3.5" />} label="Date" />
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {nextDays.map((d) => {
                      const active = isSameDay(d, date);
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => {
                            setDate(d);
                            setTime("");
                          }}
                          className={cn(
                            "shrink-0 w-14 py-2.5 rounded-2xl flex flex-col items-center transition active:scale-95",
                            active
                              ? "text-white shadow-[0_8px_20px_rgba(225,29,72,0.28)]"
                              : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                          )}
                          style={active ? { background: accentColor } : undefined}
                        >
                          <span className="text-[10px] uppercase tracking-wide opacity-80">
                            {format(d, "EEE")}
                          </span>
                          <span className="text-[18px] font-semibold leading-tight mt-0.5">
                            {format(d, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Time */}
                <section>
                  <SectionTitle icon={<Clock className="w-3.5 h-3.5" />} label="Time" />
                  {!selectedService ? (
                    <EmptyHint text="Pick a service first" />
                  ) : availableSlots.length === 0 ? (
                    <EmptyHint text="No slots available on this day" />
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((t) => {
                        const active = t === time;
                        return (
                          <button
                            key={t}
                            onClick={() => setTime(t)}
                            className={cn(
                              "h-11 rounded-xl text-[13px] font-semibold transition active:scale-95",
                              active
                                ? "text-white shadow-[0_6px_16px_rgba(225,29,72,0.28)]"
                                : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                            )}
                            style={active ? { background: accentColor } : undefined}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </motion.div>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pb-4"
              >
                <div className="rounded-2xl p-3.5 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accentColor }}>
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                      {selectedService?.name} · {time}
                    </div>
                    <div className="text-[11px] text-[#8E8E93]">
                      {format(date, "EEEE, MMM d")} · {selectedService?.duration} min · ${Number(selectedService?.price ?? 0).toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">Full name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Smith"
                      className="mt-1.5 h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-1.5 h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">Phone <span className="text-[#8E8E93]/60 normal-case">(optional)</span></Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="mt-1.5 h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                className="py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...spring, delay: 0.1 }}
                  className="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(225,29,72,0.3)]"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                >
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="font-serif text-[28px] leading-tight mt-5 text-[#1C1C1E] dark:text-[#F2F2F7]"
                >
                  You're booked.
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                  className="text-[14px] text-[#8E8E93] mt-1.5"
                >
                  Confirmation just landed in your inbox.
                </motion.p>

                {confirmedTime && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mx-auto mt-6 max-w-xs rounded-3xl bg-[#F8F8F8] dark:bg-[#2C2C2E] p-5"
                  >
                    <div className="flex items-center justify-around">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-semibold">Date</div>
                        <div className="font-serif text-[20px] mt-1 text-[#1C1C1E] dark:text-[#F2F2F7]">
                          {format(confirmedTime.date, "MMM d")}
                        </div>
                      </div>
                      <div className="w-px h-10 bg-black/10 dark:bg-white/10" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-semibold">Time</div>
                        <div className="font-serif text-[20px] mt-1 text-[#1C1C1E] dark:text-[#F2F2F7]">
                          {confirmedTime.time}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-center">
                      <div className="text-[12px] text-[#8E8E93]">{selectedService?.name} · {barberName}</div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E]">
          {step === "pick" && (
            <Button
              disabled={!canContinue}
              onClick={() => setStep("details")}
              className="w-full h-12 rounded-2xl text-white font-semibold border-0 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
            >
              Continue
            </Button>
          )}
          {step === "details" && (
            <Button
              disabled={!canConfirm || submitting}
              onClick={handleConfirm}
              className="w-full h-12 rounded-2xl text-white font-semibold border-0 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...
                </>
              ) : (
                "Confirm booking"
              )}
            </Button>
          )}
          {step === "success" && (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#E5E5EA] font-semibold border-0"
            >
              Done
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-[#8E8E93]">
      {icon}
      <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#F8F8F8] dark:bg-[#2C2C2E] py-6 text-center text-[13px] text-[#8E8E93]">
      {text}
    </div>
  );
}
