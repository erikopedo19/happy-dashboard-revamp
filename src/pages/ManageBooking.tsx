import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Star,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { format, addDays, startOfDay, isBefore, formatDistanceToNowStrict, addMinutes } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ScreenLoader } from "@/components/ScreenLoader";
import { DeleteButton } from "@/components/ui/delete-button";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service: { id: string; name: string; duration: number; price: number | null };
  business: {
    id: string;
    name: string;
    brand_color: string;
    avatar_url: string | null;
    banner_url: string | null;
    address: string | null;
    phone: string | null;
  };
  customer: { name: string; email: string; phone: string | null };
};

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease, delay: 0.08 * i } },
});

const icsStamp = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

export default function ManageBooking() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  const fetchBooking = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_appointment_by_token", { _token: token });
    setBooking(error || !data ? null : (data as Booking));
    setLoading(false);
  };

  useEffect(() => { fetchBooking(); /* eslint-disable-next-line */ }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!booking || mode !== "reschedule") return;
      const { data } = await (supabase as any).rpc("get_booked_slots", {
        _business_id: booking.business.id,
        _date: format(selectedDate, "yyyy-MM-dd"),
      });
      setBookedTimes((data || []).map((r: any) => r.appointment_time?.slice(0, 5)));
    };
    run();
  }, [booking, mode, selectedDate]);

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = 8; h < 20; h++) for (const m of [0, 30]) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    return out;
  }, []);
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)), []);

  const handleCancel = async () => {
    if (!token) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("cancel_appointment_by_token", { _token: token });
    setBusy(false);
    if (error || !data?.success) {
      toast({ title: "Could not cancel", description: data?.error || error?.message, variant: "destructive" });
      throw error ?? new Error(data?.error || "Cancel failed");
    }
    toast({ title: "Booking cancelled" });
    fetchBooking();
  };

  const handleReschedule = async () => {
    if (!token || !selectedTime) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("reschedule_appointment_by_token", {
      _token: token,
      _new_date: format(selectedDate, "yyyy-MM-dd"),
      _new_time: selectedTime,
    });
    setBusy(false);
    if (error || !data?.success) {
      toast({ title: "Could not reschedule", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booking rescheduled!" });
    setMode("view");
    setSelectedTime("");
    fetchBooking();
  };

  if (loading) return <ScreenLoader className="bg-[#0A0A0B]" />;

  if (!booking) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0A0B] flex items-center justify-center px-6 text-center">
        <motion.div {...rise()}>
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Booking not found</h1>
          <p className="text-white/60 mb-6">This link is invalid or has expired.</p>
          <Link to="/" className="text-white underline underline-offset-4">Back home</Link>
        </motion.div>
      </div>
    );
  }

  const accent = booking.business.brand_color || "#FF2D46";
  const start = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
  const end = addMinutes(start, booking.service.duration || 30);
  const cancelled = booking.status === "cancelled";
  const completed = booking.status === "completed";
  const past = isBefore(start, new Date());
  const statusLabel = cancelled ? "Cancelled" : completed ? "Completed" : past ? "Past" : "Confirmed";
  const statusTone = cancelled
    ? "bg-[#FF5A6E]/15 text-[#FF8A98]"
    : completed
      ? "bg-emerald-500/15 text-emerald-300"
      : past
        ? "bg-white/10 text-white/60"
        : "bg-white/10 text-white";
  const initials = booking.business.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const addToCalendar = () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cutzioo//Booking//EN", "BEGIN:VEVENT",
      `UID:${booking.id}@cutzioo.com`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
      `SUMMARY:${booking.service.name} at ${booking.business.name}`,
      booking.business.address ? `LOCATION:${booking.business.address.replace(/,/g, "\\,")}` : "",
      `URL:${window.location.href}`, "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${booking.business.name.replace(/\s+/g, "-").toLowerCase()}-booking.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-white">
      {/* Backdrop glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: accent }} />
      </div>

      <div className="relative mx-auto max-w-md px-5 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]">
        {/* Business */}
        <motion.div {...rise(0)} className="flex items-center gap-3">
          {booking.business.avatar_url ? (
            <img src={booking.business.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/10" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold ring-1 ring-white/10" style={{ background: accent }}>{initials}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{booking.business.name}</p>
            <p className="text-[12px] text-white/50">Your booking</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone)}>{statusLabel}</span>
        </motion.div>

        {/* Ticket */}
        <motion.div {...rise(1)} className="relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#111114]">
          {booking.business.banner_url && (
            <img src={booking.business.banner_url} alt="" className="absolute inset-x-0 top-0 h-28 w-full object-cover opacity-40" />
          )}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-[#111114]" />

          <div className="relative px-6 pt-7">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/50">{format(start, "EEEE")}</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[56px] font-bold leading-none tracking-tight tabular-nums">{format(start, "d")}</span>
              <div className="pb-1">
                <p className="text-[18px] font-semibold leading-tight">{format(start, "MMMM yyyy")}</p>
                <p className="text-[14px] text-white/60 tabular-nums">{format(start, "HH:mm")} – {format(end, "HH:mm")}</p>
              </div>
            </div>
            {!cancelled && !completed && (
              <p className={cn("mt-3 text-[13px] font-medium", past ? "text-white/45" : "text-emerald-300")}>
                {past ? `${formatDistanceToNowStrict(start)} ago` : `In ${formatDistanceToNowStrict(start)}`}
              </p>
            )}
          </div>

          {/* perforation */}
          <div className="relative my-6 flex items-center">
            <span className="h-6 w-6 -ml-3 rounded-full bg-[#0A0A0B]" />
            <span className="mx-2 h-px flex-1 border-t border-dashed border-white/15" />
            <span className="h-6 w-6 -mr-3 rounded-full bg-[#0A0A0B]" />
          </div>

          <div className="relative space-y-4 px-6 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-white/40">Service</p>
                <p className="mt-0.5 truncate text-[16px] font-semibold">{booking.service.name}</p>
                <p className="text-[13px] text-white/55">{booking.service.duration} min</p>
              </div>
              {booking.service.price != null && (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-white/40">Price</p>
                  <p className="mt-0.5 text-[16px] font-semibold tabular-nums">€{Number(booking.service.price).toFixed(2)}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Booked for</p>
              <p className="mt-0.5 text-[15px] font-medium">{booking.customer.name}</p>
            </div>
            {booking.business.address && (
              <div className="flex items-start gap-2.5 text-[13px] text-white/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
                <span>{booking.business.address}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        {!cancelled && (
          <motion.div {...rise(2)} className="mt-4 grid grid-cols-3 gap-2.5">
            <QuickAction icon={CalendarPlus} label="Calendar" onClick={addToCalendar} />
            <QuickAction
              icon={Navigation}
              label="Directions"
              href={booking.business.address ? `https://maps.google.com/?q=${encodeURIComponent(booking.business.address)}` : undefined}
            />
            <QuickAction icon={Phone} label="Call" href={booking.business.phone ? `tel:${booking.business.phone}` : undefined} />
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {mode === "view" ? (
            <motion.div key="view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease }} className="mt-6 space-y-3">
              {cancelled ? (
                <div className="rounded-3xl border border-[#FF5A6E]/20 bg-[#FF5A6E]/10 p-5 text-center">
                  <p className="text-[15px] font-semibold text-[#FF8A98]">This appointment was cancelled</p>
                  <p className="mt-1 text-[13px] text-[#FF8A98]/70">Book again whenever you're ready — {booking.business.name} will be glad to see you.</p>
                </div>
              ) : completed ? (
                token && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center">
                    <p className="text-[14px] text-white/70">How was your visit at <span className="font-semibold text-white">{booking.business.name}</span>?</p>
                    <a href={`/review/${token}`} className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-[#0A0A0B] transition active:scale-95" style={{ background: accent }}>
                      <Star className="h-4 w-4" /> Leave a review
                    </a>
                  </div>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("reschedule")}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-[#0A0A0B] transition active:scale-[0.98]"
                    style={{ background: accent }}
                  >
                    <CalendarClock className="h-5 w-5" /> Reschedule
                  </button>
                  <div className="flex justify-center pt-1">
                    <DeleteButton
                      label="Cancel booking"
                      confirmLabel="Yes, cancel"
                      cancelLabel="Keep"
                      pendingLabel="Cancelling"
                      doneLabel="Cancelled"
                      disabled={busy}
                      onConfirm={handleCancel}
                      onError={() => {}}
                      className="border border-white/15 bg-white/5 text-white shadow-none"
                    />
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="reschedule" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease }} className="mt-6 rounded-[28px] border border-white/10 bg-[#111114] p-5">
              <button type="button" onClick={() => setMode("view")} className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <p className="mt-5 text-[11px] uppercase tracking-wider text-white/40">New date</p>
              <div className="mt-3 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {dates.map((d) => {
                  const active = format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                      className={cn(
                        "w-[60px] shrink-0 snap-start rounded-2xl border py-2.5 text-center transition active:scale-95",
                        active ? "border-transparent text-[#0A0A0B]" : "border-white/10 text-white/80 hover:bg-white/5",
                      )}
                      style={active ? { background: accent } : undefined}
                    >
                      <div className="text-[10px] uppercase opacity-70">{format(d, "EEE")}</div>
                      <div className="text-[17px] font-bold leading-tight">{format(d, "d")}</div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-[11px] uppercase tracking-wider text-white/40">New time</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {slots.map((t) => {
                  const taken = bookedTimes.includes(t);
                  const active = t === selectedTime;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={taken}
                      onClick={() => setSelectedTime(t)}
                      className={cn(
                        "rounded-xl border py-2.5 text-[13px] font-medium tabular-nums transition active:scale-95",
                        active ? "border-transparent text-[#0A0A0B]"
                          : taken ? "cursor-not-allowed border-white/5 text-white/20 line-through"
                            : "border-white/10 text-white/80 hover:bg-white/5",
                      )}
                      style={active ? { background: accent } : undefined}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleReschedule}
                disabled={!selectedTime || busy}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-[#0A0A0B] transition active:scale-[0.98] disabled:opacity-40"
                style={{ background: accent }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Confirm {selectedTime ? `${format(selectedDate, "EEE d")} · ${selectedTime}` : "new time"}</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-center text-[11px] text-white/30">
          Powered by <span className="font-semibold text-white/60">cutzioo.com</span>
        </p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, href }: { icon: typeof Clock; label: string; onClick?: () => void; href?: string }) {
  const cls = cn(
    "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] text-[12px] font-medium text-white/80 transition active:scale-95",
    !onClick && !href && "pointer-events-none opacity-35",
  );
  if (href) {
    return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}><Icon className="h-5 w-5" />{label}</a>;
  }
  return <button type="button" onClick={onClick} className={cls}><Icon className="h-5 w-5" />{label}</button>;
}
