import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Flame, Share } from "lucide-react";
import { haptic } from "@/lib/haptics";

export type StreakDay = { key: string; letter: string; date: number; active: boolean };
export type StreakMonth = { year: number; monthIndex: number; booked: number[]; today: number };

export interface StreakCelebrationViewProps {
  streak: number;
  /** Last 7 days, oldest first, today last. */
  week: StreakDay[];
  month: StreakMonth;
  onClose: (showAgain: boolean) => void;
}

type Phase = "intro" | "band" | "streak" | "month";

const ease = [0.22, 1, 0.36, 1] as const;
const soft = { type: "spring", stiffness: 210, damping: 26 } as const;
const pop = { type: "spring", stiffness: 520, damping: 20 } as const;
const RED_BG = "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 48%,#D9102A 100%)";
const RED_BTN = "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)";
const POP_START = 1500;
const POP_EVERY = 430;

/** Full-screen streak celebration: spark → band → streak count + week → month → "show again?" */
export function StreakCelebrationView({ streak, week, month, onClose }: StreakCelebrationViewProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [asking, setAsking] = useState(false);
  const [popped, setPopped] = useState(0);
  const [ready, setReady] = useState(false);

  const runIdx = useMemo(() => {
    const idx: number[] = [];
    let i = week.length - 1;
    if (i >= 0 && !week[i].active) i--;
    for (; i >= 0 && week[i].active; i--) idx.unshift(i);
    return idx;
  }, [week]);
  const base = Math.max(0, streak - runIdx.length);
  const shown = base + popped;

  useEffect(() => {
    if (asking) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (phase === "intro") {
      at(250, () => haptic("light"));
      at(1050, () => setPhase("band"));
    } else if (phase === "band") {
      at(150, () => haptic("medium"));
      at(1400, () => setPhase("streak"));
    } else if (phase === "streak") {
      setPopped(0);
      setReady(false);
      runIdx.forEach((_, n) =>
        at(POP_START + n * POP_EVERY, () => {
          setPopped(n + 1);
          haptic(n === runIdx.length - 1 ? "success" : "light");
        }),
      );
      const end = POP_START + runIdx.length * POP_EVERY + 350;
      at(end, () => setReady(true));
      at(end + 3800, () => setPhase("month"));
    } else if (phase === "month") {
      at(1400 + month.booked.length * 70 + 1600, () => setAsking(true));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase, asking, runIdx, month.booked.length]);

  const revealed = phase === "streak" || phase === "month";

  return (
    <motion.div
      className="fixed inset-0 z-[500] overflow-hidden bg-[#0A0A0C] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.45 } }}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui, sans-serif" }}
    >
      {/* Spark */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            key="spark"
            className="absolute inset-0 flex items-center justify-center"
            exit={{ opacity: 0, scale: 0.4, filter: "blur(10px)", transition: { duration: 0.3 } }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: [0, 1.25, 1], rotate: 0 }}
              transition={{ duration: 0.6, ease }}
              className="relative flex h-24 w-24 items-center justify-center rounded-[30px]"
              style={{ background: RED_BTN, boxShadow: "0 18px 50px rgba(255,45,70,0.55), inset 0 2px 0 rgba(255,255,255,0.4)" }}
            >
              <Flame className="h-12 w-12 fill-white text-white" />
            </motion.div>
            <Sparkles count={5} radius={90} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagonal band */}
      <AnimatePresence>
        {phase === "band" && (
          <motion.div
            key="band"
            className="absolute left-[-35%] top-1/2 -mt-[115px] h-[230px] w-[170%]"
            initial={{ rotate: -14, scaleX: 0 }}
            animate={{ rotate: -14, scaleX: 1 }}
            exit={{ rotate: 0, scaleY: 5, transition: { duration: 0.55, ease } }}
            transition={{ duration: 0.5, ease }}
            style={{ background: RED_BG, transformOrigin: "50% 50%" }}
          >
            {[22, 48, 70, 160, 190].map((top, i) => (
              <motion.span
                key={top}
                className="absolute h-[5px] rounded-full bg-white/40"
                style={{ top, width: 60 + i * 24 }}
                initial={{ left: i % 2 ? "70%" : "10%", opacity: 0 }}
                animate={{ left: i % 2 ? "40%" : "35%", opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.06, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full red reveal */}
      <motion.div
        className="absolute inset-0"
        style={{ background: RED_BG }}
        initial={{ clipPath: "circle(0% at 50% 50%)" }}
        animate={{ clipPath: revealed ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)" }}
        transition={{ duration: 0.7, ease }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "month" ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.08) 0%,rgba(80,0,12,0.35) 100%)" }}
      />

      {/* Skip */}
      {!asking && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => {
            haptic("light");
            setAsking(true);
          }}
          className="absolute right-4 top-[max(env(safe-area-inset-top),14px)] z-20 h-9 rounded-full bg-white/15 px-4 text-[14px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-xl active:scale-95"
        >
          Skip
        </motion.button>
      )}

      {/* Content column */}
      {phase !== "intro" && (
        <div
          className="absolute inset-0 mx-auto flex max-w-md flex-col items-center px-5"
          style={{
            justifyContent: phase === "band" ? "center" : "flex-start",
            paddingTop: phase === "streak" ? "13vh" : phase === "month" ? "max(env(safe-area-inset-top),14px)" : 0,
          }}
        >
          {phase === "month" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-9 w-full items-center justify-between pr-20"
            >
              <button
                type="button"
                aria-label="Back"
                onClick={() => setPhase("streak")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Share"
                onClick={() =>
                  navigator.share?.({ title: "My Cutzioo streak", text: `${streak}-day booking streak on Cutzioo` }).catch(() => {})
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 active:scale-95"
              >
                <Share className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          <motion.div layout transition={soft} className="relative flex items-center justify-center">
            {revealed && <Rays />}
            <motion.div
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: phase === "band" ? 1.2 : phase === "month" ? 0.62 : 0.95, rotate: 0 }}
              transition={phase === "band" ? { type: "spring", stiffness: 380, damping: 14 } : soft}
            >
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                <BarberPoleMascot />
              </motion.div>
            </motion.div>
            {phase !== "band" && <Sparkles count={6} radius={110} />}
          </motion.div>

          <AnimatePresence mode="wait">
            {phase === "streak" && (
              <motion.div
                key="streak"
                className="flex w-full flex-col items-center"
                exit={{ opacity: 0, y: -12, filter: "blur(8px)", transition: { duration: 0.3 } }}
              >
                <div className="flex h-[78px] items-end">
                  <AnimatePresence mode="popLayout">
                    {shown > 0 && (
                      <motion.span
                        key={shown}
                        initial={{ scale: 1.45, opacity: 0, filter: "blur(6px)" }}
                        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                        exit={{ scale: 0.7, opacity: 0, filter: "blur(4px)" }}
                        transition={pop}
                        className="text-[76px] font-black leading-none tracking-[-0.04em] tabular-nums [text-shadow:0_6px_24px_rgba(120,0,15,0.35)]"
                      >
                        {shown}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <BlurIn delay={0.35} className="mt-1 text-[28px] font-extrabold tracking-[-0.02em]">
                  {streak === 1 ? "Day streak!" : "Days streak!"}
                </BlurIn>
                <BlurIn delay={0.55} className="mt-1 text-center text-[14px] font-medium leading-snug text-white/80">
                  Your chair keeps filling up.
                  <br />
                  One booking at a time.
                </BlurIn>

                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.9, duration: 0.55, ease }}
                  className="mt-7 w-full rounded-[24px] bg-white/[0.16] px-3 pb-3 pt-2.5 ring-1 ring-white/20 backdrop-blur-md"
                >
                  <div className="grid grid-cols-7 gap-1.5">
                    {week.map((d, i) => {
                      const inRun = runIdx.indexOf(i);
                      const checked = d.active && (inRun === -1 || inRun < popped);
                      const latest = inRun !== -1 && inRun === popped - 1;
                      return (
                        <div key={d.key} className="flex flex-col items-center gap-1.5">
                          <span className="text-[11px] font-bold text-white/80">{d.letter}</span>
                          <DayDot checked={checked} animate={inRun !== -1} latest={latest} label={d.date} />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {phase === "month" && (
              <motion.div
                key="month"
                className="flex w-full flex-col items-center"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease, delay: 0.15 }}
              >
                <MonthView month={month} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CTA */}
      <AnimatePresence>
        {phase === "streak" && ready && !asking && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={soft}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic("medium");
                setPhase("month");
              }}
              className="h-[54px] w-full rounded-[18px] bg-white text-[16px] font-bold text-[#FF2D46] shadow-[0_14px_30px_rgba(120,0,15,0.35)]"
            >
              See my month
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show again? */}
      <AnimatePresence>
        {asking && (
          <>
            <motion.div
              key="ask-dim"
              className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              key="ask"
              role="dialog"
              aria-label="Show streak animation again"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="absolute inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[32px] bg-[#111114] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 ring-1 ring-white/10"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15" />
              <div className="mt-5 flex justify-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...pop, delay: 0.15 }}
                  className="flex h-16 w-16 items-center justify-center rounded-[20px]"
                  style={{ background: RED_BTN }}
                >
                  <Flame className="h-8 w-8 fill-white text-white" />
                </motion.div>
              </div>
              <BlurIn delay={0.2} className="mt-4 text-center text-[22px] font-bold tracking-[-0.02em]">
                Play this animation again?
              </BlurIn>
              <BlurIn delay={0.28} className="mx-auto mt-1.5 max-w-[290px] text-center text-[14px] leading-relaxed text-white/55">
                We'll celebrate your streak each day you keep the chair busy. Say no and it won't show again.
              </BlurIn>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45, ease }}
                className="mt-6 space-y-2"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic("success");
                    onClose(true);
                  }}
                  className="h-[54px] w-full rounded-[18px] text-[16px] font-semibold shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_12px_26px_rgba(255,45,70,0.35)]"
                  style={{ background: RED_BTN }}
                >
                  Yes, show it again
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic("light");
                    onClose(false);
                  }}
                  className="h-[54px] w-full rounded-[18px] bg-white/[0.08] text-[16px] font-semibold text-white/80"
                >
                  Don't show again
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BlurIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease, delay }}
      className={className}
    >
      {children}
    </motion.p>
  );
}

function DayDot({ checked, animate, latest, label }: { checked: boolean; animate: boolean; latest: boolean; label: number }) {
  return (
    <div className="relative h-9 w-9">
      <AnimatePresence initial={false} mode="popLayout">
        {checked ? (
          <motion.div
            key="on"
            initial={animate ? { scale: 1.9, y: -14, opacity: 0 } : false}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={pop}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(120,0,15,0.3)]"
          >
            <Check className="h-[18px] w-[18px] text-[#FF2D46]" strokeWidth={3.4} />
          </motion.div>
        ) : (
          <motion.div
            key="off"
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-white/20 text-[13px] font-bold tabular-nums text-white"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      {latest && (
        <motion.span
          key={`ring-${label}`}
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-white"
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

function MonthView({ month }: { month: StreakMonth }) {
  const first = new Date(month.year, month.monthIndex, 1);
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const booked = new Set(month.booked);
  const order = new Map(month.booked.map((d, i) => [d, i]));
  const total = month.booked.length;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (total === 0) return;
    const step = Math.max(40, 900 / total);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= total) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, [total]);

  return (
    <>
      <div className="mt-1 flex w-full items-center gap-3 rounded-[22px] bg-white/[0.16] p-3 ring-1 ring-white/20 backdrop-blur-md">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white text-[26px] font-black tabular-nums text-[#FF2D46]">
          {count}
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-bold">Total days booked</p>
          <p className="text-[12.5px] leading-snug text-white/75">
            Clients sat in your chair on {total} {total === 1 ? "day" : "days"} this month. Keep it rolling.
          </p>
        </div>
      </div>

      <div className="mt-4 w-full rounded-[26px] bg-white/[0.10] p-4 ring-1 ring-white/15">
        <div className="flex items-center justify-between">
          <ChevronLeft className="h-4 w-4 text-white/50" />
          <p className="text-[17px] font-bold">
            {first.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </p>
          <ChevronRight className="h-4 w-4 text-white/50" />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-y-2 text-center text-[11px] font-bold text-white/70">
          {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-2">
          {Array.from({ length: lead }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isBooked = booked.has(day);
            const future = day > month.today;
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.012, duration: 0.3, ease }}
                className="flex justify-center"
              >
                <div
                  className={
                    "relative flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12.5px] font-bold tabular-nums " +
                    (future ? "bg-white/[0.08] text-white/45" : "bg-white/[0.16] text-white/90") +
                    (day === month.today ? " ring-2 ring-white/70" : "")
                  }
                >
                  {day}
                  {isBooked && (
                    <motion.span
                      initial={{ scale: 1.8, y: -10, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ ...pop, delay: 1.1 + (order.get(day) ?? 0) * 0.07 }}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-white"
                    >
                      <Check className="h-4 w-4 text-[#FF2D46]" strokeWidth={3.4} />
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Rays() {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -ml-[280px] -mt-[280px] h-[560px] w-[560px]"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease }}
    >
      <motion.div
        className="h-full w-full rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.16) 0deg 9deg, rgba(255,255,255,0) 9deg 24deg)",
          WebkitMaskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 68%)",
          maskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 68%)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -ml-[110px] -mt-[110px] h-[220px] w-[220px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)" }}
      />
    </motion.div>
  );
}

function Sparkles({ count, radius }: { count: number; radius: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.4;
        const r = radius * (0.8 + ((i * 37) % 10) / 25);
        const s = 6 + ((i * 13) % 6);
        return (
          <motion.svg
            key={i}
            viewBox="0 0 10 10"
            width={s}
            height={s}
            className="absolute"
            style={{ left: Math.cos(a) * r - s / 2, top: Math.sin(a) * r - s / 2 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4], rotate: [0, 45, 90] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.27, ease: "easeInOut" }}
          >
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="white" />
          </motion.svg>
        );
      })}
    </div>
  );
}

/** Cutzioo mascot: a happy barber pole with spinning stripes. */
export function BarberPoleMascot({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 120 150"
      style={{ filter: "drop-shadow(0 16px 22px rgba(90,0,14,0.35))", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <clipPath id="cz-pole-clip">
          <rect x="41" y="64" width="38" height="58" rx="10" />
        </clipPath>
        <linearGradient id="cz-chrome" x1="0" x2="1">
          <stop offset="0" stopColor="#B9B9C0" />
          <stop offset="0.5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A3A3AA" />
        </linearGradient>
        <radialGradient id="cz-head" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFE3DE" />
        </radialGradient>
      </defs>

      <g fill="#fff" stroke="#fff" strokeWidth="10" strokeLinejoin="round">
        <circle cx="60" cy="40" r="30" />
        <rect x="34" y="58" width="52" height="82" rx="16" />
      </g>

      <rect x="41" y="64" width="38" height="58" rx="10" fill="#fff" />
      <g clipPath="url(#cz-pole-clip)">
        <motion.g animate={{ y: [0, -22] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const y = 66 + i * 22;
            return <path key={i} d={`M30 ${y + 12} L90 ${y - 12} L90 ${y - 2} L30 ${y + 22} Z`} fill="#FF2D46" />;
          })}
        </motion.g>
        <rect x="44" y="64" width="8" height="58" fill="rgba(255,255,255,0.45)" />
      </g>
      <rect x="35" y="58" width="50" height="10" rx="5" fill="url(#cz-chrome)" />
      <rect x="33" y="120" width="54" height="16" rx="8" fill="url(#cz-chrome)" />

      <circle cx="60" cy="38" r="27" fill="url(#cz-head)" />
      <path d="M44 20 Q56 4 76 16 Q66 14 60 22 Q54 16 44 20 Z" fill="#FF2D46" />
      <path d="M46 39 q4.5 -5.5 9 0" stroke="#3A1418" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M65 39 q4.5 -5.5 9 0" stroke="#3A1418" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M54 47 q6 6.5 12 0" stroke="#3A1418" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="47" rx="5" ry="3" fill="#FF7A8A" opacity="0.6" />
      <ellipse cx="76" cy="47" rx="5" ry="3" fill="#FF7A8A" opacity="0.6" />
    </svg>
  );
}
