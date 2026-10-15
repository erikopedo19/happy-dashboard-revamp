import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Clock3, XCircle } from "lucide-react";
import type { LiveActivityProps } from "@/lib/liveActivity";

// Mirrors expo/BookingActivity.tsx so the in-app pill matches the real Dynamic Island.
const LIME = "#A3E635";
const RED = "#FF2D46";
const FLASH_MS = 4600;

const inNativeShell = () =>
  typeof window !== "undefined" && !!(window as any).ReactNativeWebView;

const accentFor = (kind: LiveActivityProps["kind"]) =>
  kind === "cancelled" ? RED : kind === "new" ? LIME : "#F4F4F5";

const iconFor = (kind: LiveActivityProps["kind"]) =>
  kind === "cancelled" ? XCircle : kind === "new" ? CalendarCheck : Clock3;

function countdownLabel(startsAt: number | undefined, now: number) {
  if (!startsAt) return null;
  const diff = startsAt - now;
  if (diff <= 0) return "now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

function useTicker(ms = 15000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

function CountdownRing({ props, size = 16 }: { props: LiveActivityProps; size?: number }) {
  const stroke = accentFor(props.kind);
  const r = (size - 2) / 2;
  const c = 2 * Math.PI * r;
  let progress = 1;
  if (props.startsAt && props.countdownFrom) {
    const total = props.startsAt - props.countdownFrom;
    progress = total > 0 ? Math.min(1, Math.max(0, (Date.now() - props.countdownFrom) / total)) : 0;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

type Props = {
  event: LiveActivityProps | null;
  next: LiveActivityProps | null;
  onEventDone: () => void;
};

/**
 * In-app "Dynamic Island" — a top-of-screen pill that springs open on booking
 * events and otherwise shows a compact countdown to the next appointment.
 * Rendered inside the Expo WebView where the real Live Activity can't reach
 * (Expo Go); native dev/EAS builds get the real island via expo-widgets too.
 */
export function BookingIsland({ event, next, onEventDone }: Props) {
  const navigate = useNavigate();
  useTicker();
  const [expanded, setExpanded] = useState(false);
  const doneRef = useRef(onEventDone);
  doneRef.current = onEventDone;

  useEffect(() => {
    if (!event) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    const id = window.setTimeout(() => {
      setExpanded(false);
      doneRef.current();
    }, FLASH_MS);
    return () => window.clearTimeout(id);
  }, [event]);

  if (!inNativeShell()) return null;

  const display = expanded && event ? event : next;
  const accent = display ? accentFor(display.kind) : LIME;
  const Icon = display ? iconFor(display.kind) : Clock3;
  const countdown = countdownLabel(display?.startsAt, Date.now());
  const expandedWidth = Math.min(340, window.innerWidth - 40);

  const openAgenda = () => navigate("/agenda");

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[12000] flex justify-center"
      style={{ top: "calc(var(--sat, env(safe-area-inset-top, 0px)) + 8px)" }}
    >
      <AnimatePresence>
        {display && (
          <motion.button
            key="booking-island"
            type="button"
            onClick={openAgenda}
            className="pointer-events-auto flex items-center overflow-hidden bg-black text-left shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
            initial={{ opacity: 0, scale: 0.6, y: -10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              width: expanded ? expandedWidth : 180,
              height: expanded ? 108 : 38,
              borderRadius: expanded ? 26 : 19,
            }}
            exit={{ opacity: 0, scale: 0.6, y: -10 }}
            transition={{ type: "spring", damping: 17, stiffness: 150, mass: 0.8 }}
          >
            {expanded && event ? (
              <div className="flex w-full items-center gap-3 px-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: `${accent}66`, backgroundColor: `${accent}1a` }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {event.title}
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">
                    {event.subtitle}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium" style={{ color: accent }}>
                    {event.timeLabel}
                    {countdown ? ` · ${countdown}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2 px-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <CountdownRing props={display} />
                  <span className="truncate text-[12px] font-medium text-white">
                    {display.kind === "next"
                      ? display.title.replace(/^Next:\s*/, "")
                      : display.title}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: accent }}>
                  {countdown ?? display.timeLabel}
                </span>
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
