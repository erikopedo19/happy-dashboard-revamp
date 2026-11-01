import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import s from "./plan-change.module.css";

type Particle = { id: number; kind: "cf" | "pr"; style: CSSProperties };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLORS = ["#fff", "#ffd60a", "#30d158", "#7dffa0", "#64ffda", "#e5ffe9"];

/** Confetti + ring burst from a point, rendered into a portal-safe fixed layer. */
export function useBurst() {
  const [parts, setParts] = useState<Particle[]>([]);
  const seq = useRef(0);
  const fire = useCallback((x: number, y: number) => {
    if (reduced()) return;
    const batch: Particle[] = [];
    for (let k = 0; k < 3; k++) batch.push({ id: seq.current++, kind: "pr", style: { left: x, top: y, animationDelay: `${k * 0.28}s` } });
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 110 + Math.random() * 190;
      batch.push({
        id: seq.current++,
        kind: "cf",
        style: {
          left: x, top: y, background: COLORS[i % COLORS.length], animationDelay: `${Math.random() * 0.15}s`,
          ["--dx" as string]: `${Math.cos(a) * d}px`, ["--dy" as string]: `${Math.sin(a) * d - 40}px`, ["--r" as string]: `${Math.random() * 720 - 360}deg`,
        },
      });
    }
    setParts((p) => [...p, ...batch]);
    const ids = new Set(batch.map((b) => b.id));
    window.setTimeout(() => setParts((p) => p.filter((q) => !ids.has(q.id))), 2500);
  }, []);
  const layer = parts.map((p) => <i key={p.id} aria-hidden className={p.kind === "cf" ? s.cf : s.pr} style={p.style} />);
  return { fire, layer };
}

export type PlanChangeItem = { name: string; after: string };

/**
 * Full-screen reaction shown after the billing service confirms a plan change.
 * "downgrade": sad face, rain and what changes; "Keep" runs onKeep and turns happy on success.
 * "kept": the happy state on its own (e.g. after resuming Pro).
 */
export function PlanChangeOverlay({
  mode,
  plan = "Pro",
  endLabel,
  items,
  onKeep,
  onClose,
}: {
  mode: "downgrade" | "kept" | null;
  plan?: string;
  endLabel: string;
  items: PlanChangeItem[];
  onKeep: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState<"sad" | "happy" | "calm">("sad");
  const [keeping, setKeeping] = useState(false);
  const faceRef = useRef<SVGSVGElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const { fire, layer } = useBurst();
  const drops = useMemo(() => Array.from({ length: 22 }, () => ({
    left: `${Math.random() * 100}%`, animationDuration: `${2.6 + Math.random() * 2.6}s`,
    animationDelay: `${Math.random() * -5}s`, opacity: 0.25 + Math.random() * 0.5,
  })), []);

  const later = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  const burstFromFace = () => {
    const r = faceRef.current?.getBoundingClientRect();
    if (r) fire(r.left + r.width / 2, r.top + r.height / 2);
  };
  const close = () => {
    setOn(false);
    later(900, onClose);
  };

  useEffect(() => {
    if (!mode) return;
    setKeeping(false);
    setPhase(mode === "kept" ? "happy" : "sad");
    const raf = requestAnimationFrame(() => setOn(true));
    if (mode === "kept") {
      haptic("success");
      later(450, burstFromFace);
      later(2800, close);
    } else {
      haptic("warning");
      later(3500, () => keepRef.current?.focus({ preventScroll: true }));
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode || typeof document === "undefined") return null;

  const keep = async () => {
    if (keeping) return;
    setKeeping(true);
    const ok = await onKeep().catch(() => false);
    setKeeping(false);
    if (!ok) return;
    haptic("success");
    setPhase("happy");
    burstFromFace();
    later(2800, close);
  };
  const fine = () => {
    haptic("light");
    setPhase("calm");
    later(700, close);
  };

  const happy = phase === "happy";
  const title = happy ? `${plan} stays.` : phase === "calm" ? `${plan} ends ${endLabel}.` : `We’ll miss ${plan}.`;
  const sub = happy
    ? "Nothing changes. Everything is still yours."
    : phase === "calm"
    ? `Take care. You keep ${plan} until then.`
    : `You keep everything until ${endLabel}. After that:`;

  return createPortal(
    <div
      className={cx(s.sad, on && s.on, happy && s.happy, phase === "calm" && s.calm)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-change-title"
    >
      <div className={s.shine} />
      {drops.map((d, i) => <i key={i} aria-hidden className={s.drop} style={d} />)}
      <svg ref={faceRef} className={s.face} viewBox="0 0 150 150" aria-hidden="true">
        <defs>
          <radialGradient id="plan-face" cx="40%" cy="30%" r="80%">
            <stop offset="0" stopColor="#9aa6c0" />
            <stop offset="1" stopColor="#465069" />
          </radialGradient>
        </defs>
        <circle cx="75" cy="75" r="70" fill="url(#plan-face)" />
        <path className={s.brows} d="M40 58L62 50M110 58L88 50" stroke="#1a1f2c" strokeWidth="4" strokeLinecap="round" />
        <ellipse className={s.eye} cx="52" cy="72" rx="6" ry="8" fill="#1a1f2c" />
        <ellipse className={s.eye} cx="98" cy="72" rx="6" ry="8" fill="#1a1f2c" />
        <path className={s.frown} d="M52 110Q75 90 98 110" fill="none" stroke="#1a1f2c" strokeWidth="5" strokeLinecap="round" />
        <path className={s.smile} d="M48 96Q75 126 102 96" fill="none" stroke="#1a1f2c" strokeWidth="5" strokeLinecap="round" />
        <g className={s.tear}><ellipse cx="98" cy="88" rx="3.5" ry="5.5" fill="#9fd0ff" /></g>
      </svg>
      <h2 id="plan-change-title" className={s.title}>{title}</h2>
      <p className={s.sub} aria-live="polite">{sub}</p>
      {mode === "downgrade" && (
        <ul className={s.miss}>
          {items.map((it, i) => (
            <li key={it.name} style={{ ["--d" as string]: `${2.4 + i * 0.3}s` }}>
              <span className={s.n}>{it.name}</span>
              <span className={s.o}>{happy ? "Kept" : it.after}</span>
            </li>
          ))}
        </ul>
      )}
      {mode === "downgrade" && (
        <div className={s.row}>
          <button ref={keepRef} type="button" className={s.keep} onClick={keep} disabled={keeping}>
            {keeping && <Loader2 className="h-4 w-4 animate-spin" />}Keep {plan}
          </button>
          <button type="button" className={s.fine} onClick={fine} disabled={keeping}>Continue</button>
        </div>
      )}
      {layer}
    </div>,
    document.body,
  );
}

/** Upgrade confirmation mark: spins while waiting, draws a check and pops when done. */
export function PlanUpgradeBadge({ done, paused, className }: { done: boolean; paused?: boolean; className?: string }) {
  return (
    <div className={cx(s.badge, done && s.ok, paused && s.paused, className)}>
      <svg className={s.sp} viewBox="0 0 80 80" aria-hidden="true">
        <circle className={s.spt} cx="40" cy="40" r="34" />
        <circle className={s.spa} cx="40" cy="40" r="34" />
      </svg>
      <svg className={s.ck} viewBox="0 0 80 80" aria-hidden="true">
        <circle className={s.cc} cx="40" cy="40" r="34" />
        <path className={s.cm} d="M24 41l11 11 21-23" />
      </svg>
    </div>
  );
}

export const planGlowClass = (on: boolean) => cx(s.glow, on && s.on);
