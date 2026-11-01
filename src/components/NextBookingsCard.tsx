import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { CalendarDays, Check, ChevronDown, ChevronRight, Clock, Loader2, MessageCircle, Phone, Scissors, Timer } from "lucide-react";
import { RollingText } from "@/components/RollingText";
import { TraceBorder } from "@/components/ui/trace-border";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

type NextBooking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  price: number | null;
  customer: { name: string; phone: string | null } | null;
  service: { name: string; duration: number | null; price: number | null } | null;
};

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;
const CARD_BG = "linear-gradient(115deg, #2A1530 0%, #3A2238 38%, #2B2420 75%, #1E1A16 100%)";
const RED_BUTTON = "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)";

const to12h = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const endTime = (time: string, duration: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + duration;
  return to12h(`${Math.floor(total / 60) % 24}:${total % 60}`);
};

const startsAtOf = (b: NextBooking) => {
  const [y, mo, d] = b.appointment_date.split("-").map(Number);
  const [h, m] = b.appointment_time.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
};

/** "26 min", "2h 14m", "3d 4h" — time left until the booking starts. */
export const formatCountdown = (ms: number) => {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return mins % 60 ? `${h}h ${mins % 60}m` : `${h}h`;
  const days = Math.floor(h / 24);
  return h % 24 ? `${days}d ${h % 24}h` : `${days}d`;
};

const useNow = (everyMs = 15_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
};

export function NextBookingsCard({ currency = "EUR" }: { currency?: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { data: bookings = [] } = useQuery<NextBooking[]>({
    queryKey: ["dashboard-next-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, price, customer:customers(name, phone), service:services(name, duration, price)")
        .eq("user_id", user.id)
        .gte("appointment_date", today)
        .or("status.is.null,status.not.in.(cancelled,completed)")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(12);
      if (error) throw error;
      const now = format(new Date(), "HH:mm");
      return ((data || []) as unknown as NextBooking[])
        .filter((b) => b.appointment_date > today || b.appointment_time.slice(0, 5) >= now)
        .slice(0, 3);
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const [next, ...rest] = bookings;
  const now = useNow();
  const msLeft = next ? startsAtOf(next).getTime() - now : 0;
  const countdown = formatCountdown(msLeft);
  // Fill the bar over the last 2 hours before the booking.
  const soonProgress = Math.min(1, Math.max(0, 1 - msLeft / (2 * 60 * 60_000)));

  useEffect(() => {
    if (!next) setOpen(false);
  }, [next]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const expand = () => {
    haptic("light");
    setOpen(true);
  };

  const close = () => {
    haptic("selection");
    setOpen(false);
  };

  const markDone = async (id: string) => {
    setCompleting(true);
    haptic("medium");
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    setCompleting(false);
    if (error) {
      haptic("error");
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    haptic("success");
    toast({ title: "Marked as done" });
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["dashboard-next-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-dashboard-today"] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-dashboard-metrics"] });
  };

  const onSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) close();
  };

  const duration = next?.service?.duration || 0;
  const price = Number(next?.price ?? next?.service?.price ?? 0);
  const phone = next?.customer?.phone?.replace(/[^\d+]/g, "") || "";
  const priceLabel = (() => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(price);
    } catch {
      return `€${price}`;
    }
  })();
  const isToday = next ? next.appointment_date === format(new Date(), "yyyy-MM-dd") : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">Your next booking</h2>
        <button type="button" onClick={() => navigate("/agenda")} className="flex items-center gap-0.5 text-[14px] font-semibold text-[#FF5A6E]">
          Agenda<ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {next ? (
        <motion.button
          type="button"
          layoutId={`next-booking-${next.id}`}
          onClick={expand}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ opacity: { duration: 0.6, ease }, y: { duration: 0.6, ease }, layout: spring }}
          whileTap={{ scale: 0.98 }}
          className="relative flex w-full flex-col overflow-hidden p-5 text-left text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
          style={{ background: CARD_BG, borderRadius: 30 }}
        >
          <TraceBorder radius={30} />
          <div className="relative flex w-full items-center gap-4">
          <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-[#7B3FA0]/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-[#8A6A3A]/25 blur-3xl" />
          <motion.div
            layoutId={`next-booking-date-${next.id}`}
            transition={spring}
            className="relative flex h-[76px] w-[68px] shrink-0 flex-col items-center justify-center rounded-[20px] bg-white text-[#1C1C1E] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          >
            <span className="text-[13px] font-medium leading-none text-[#3A3A3C]">{format(parseISO(next.appointment_date), "MMM")}</span>
            <span className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{format(parseISO(next.appointment_date), "d")}</span>
          </motion.div>
          <div className="relative min-w-0 flex-1">
            <motion.p
              layoutId={`next-booking-name-${next.id}`}
              transition={spring}
              className="truncate text-[25px] font-bold leading-tight tracking-[-0.03em]"
            >
              {next.customer?.name || "Walk-in"}
            </motion.p>
            <p className="mt-1 truncate text-[14px] text-white/65">
              {next.service?.name || "Appointment"} • {to12h(next.appointment_time)}
              {duration ? ` • ${duration} min` : ""}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85 ring-1 ring-white/15 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#30D158]" />
              {next.status === "pending" ? "Awaiting confirmation" : "You are hosting"}
            </span>
          </div>
          </div>
          <div className="relative mt-4 w-full border-t border-white/10 pt-3.5">
            <div className="flex items-end justify-between gap-3">
              <span className="flex items-center gap-1.5 pb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
                <Timer className="h-3.5 w-3.5" />
                {countdown === "Now" ? "Starting" : "Starts in"}
              </span>
              <RollingText text={countdown} className="text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums" />
            </div>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full origin-left rounded-full bg-white"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: soonProgress }}
                transition={{ duration: 0.9, ease }}
              />
            </div>
          </div>
        </motion.button>
      ) : (
        <div className="flex items-center gap-4 rounded-[30px] bg-white p-5 ring-1 ring-black/[0.06] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
          <div className="flex h-[64px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[11px] font-medium text-[#8E8E93]">{format(new Date(), "MMM")}</span>
            <span className="text-[24px] font-semibold leading-none">{format(new Date(), "d")}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold">No upcoming bookings</p>
            <p className="mt-0.5 text-[13px] text-[#8E8E93]">Share your link to fill your chair.</p>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
          {rest.map((b, i) => (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => navigate("/agenda")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.3 + i * 0.08 }}
              className="flex w-full items-center gap-3 border-b border-black/[0.05] px-4 py-3 text-left last:border-0 dark:border-white/[0.06]"
            >
              <div className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                <span className="text-[9px] font-semibold uppercase text-[#8E8E93]">{format(parseISO(b.appointment_date), "MMM")}</span>
                <span className="text-[16px] font-semibold leading-none">{format(parseISO(b.appointment_date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{b.customer?.name || "Walk-in"}</p>
                <p className="truncate text-[12.5px] text-[#8E8E93]">{b.service?.name || "Appointment"}</p>
              </div>
              <span className="flex items-center gap-1 text-[12.5px] font-medium tabular-nums text-[#8E8E93]">
                <Clock className="h-3.5 w-3.5" />{to12h(b.appointment_time)}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && next && (
              <>
                <motion.div
                  key="next-booking-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
                  onClick={close}
                />
                <motion.div
                  key="next-booking-sheet"
                  layoutId={`next-booking-${next.id}`}
                  transition={{ layout: spring }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.7 }}
                  onDragEnd={onSheetDragEnd}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Next booking"
                  className="fixed inset-0 z-[401] flex flex-col overflow-hidden text-white"
                  style={{ background: CARD_BG, borderRadius: 0 }}
                >
                  <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#7B3FA0]/35 blur-3xl" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-[#8A6A3A]/30 blur-3xl" />

                  <div className="relative flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
                    <motion.button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, ease, delay: 0.15 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15 backdrop-blur-xl active:scale-95"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.button>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.15 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85 ring-1 ring-white/15"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#30D158]" />
                      {next.status === "pending" ? "Awaiting confirmation" : isToday ? "Today" : "Upcoming"}
                    </motion.span>
                  </div>

                  <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
                    <motion.div
                      layoutId={`next-booking-date-${next.id}`}
                      transition={spring}
                      className="flex h-[96px] w-[86px] flex-col items-center justify-center rounded-[24px] bg-white text-[#1C1C1E] shadow-[0_14px_30px_rgba(0,0,0,0.4)]"
                    >
                      <span className="text-[15px] font-medium leading-none text-[#3A3A3C]">{format(parseISO(next.appointment_date), "MMM")}</span>
                      <span className="mt-1.5 text-[38px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{format(parseISO(next.appointment_date), "d")}</span>
                    </motion.div>

                    <motion.p
                      layoutId={`next-booking-name-${next.id}`}
                      transition={spring}
                      className="mt-6 text-[38px] font-bold leading-[1.05] tracking-[-0.04em]"
                    >
                      {next.customer?.name || "Walk-in"}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.55, ease, delay: 0.18 }}
                      className="mt-6 overflow-hidden rounded-[22px] bg-white/[0.08] ring-1 ring-white/10 backdrop-blur-xl"
                    >
                      <DetailRow icon={Scissors} label="Service" value={next.service?.name || "Appointment"} />
                      <DetailRow
                        icon={Clock}
                        label="Time"
                        value={duration ? `${to12h(next.appointment_time)} – ${endTime(next.appointment_time, duration)}` : to12h(next.appointment_time)}
                      />
                      <DetailRow icon={CalendarDays} label="Date" value={format(parseISO(next.appointment_date), "EEEE, MMM d")} />
                      {duration > 0 && <DetailRow icon={Clock} label="Length" value={`${duration} min`} />}
                      {price > 0 && <DetailRow icon={Check} label="Price" value={priceLabel} />}
                    </motion.div>

                    <div className="flex-1" />

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.55, ease, delay: 0.26 }}
                      className="mt-8 space-y-3"
                    >
                      {isToday && (
                        <button
                          type="button"
                          onClick={() => markDone(next.id)}
                          disabled={completing}
                          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-semibold text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_12px_26px_rgba(255,45,70,0.35)] transition active:scale-[0.98] disabled:opacity-60"
                          style={{ background: RED_BUTTON }}
                        >
                          {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Mark done
                        </button>
                      )}
                      <div className="flex gap-3">
                        {phone && (
                          <>
                            <a href={`tel:${phone}`} onClick={() => haptic("light")} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-white/10 text-[15px] font-semibold ring-1 ring-white/10 active:scale-[0.98] transition">
                              <Phone className="h-[18px] w-[18px]" /> Call
                            </a>
                            <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer" onClick={() => haptic("light")} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-white/10 text-[15px] font-semibold ring-1 ring-white/10 active:scale-[0.98] transition">
                              <MessageCircle className="h-[18px] w-[18px]" /> Message
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate("/agenda");
                          }}
                          className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-white/10 text-[15px] font-semibold ring-1 ring-white/10 active:scale-[0.98] transition"
                        >
                          <CalendarDays className="h-[18px] w-[18px]" /> Agenda
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 last:border-0">
      <Icon className="h-[18px] w-[18px] shrink-0 text-white/55" />
      <span className="text-[15px] text-white/60">{label}</span>
      <span className="ml-auto truncate text-right text-[15px] font-semibold">{value}</span>
    </div>
  );
}
