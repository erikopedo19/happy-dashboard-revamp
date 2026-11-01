import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A soft glow on the parent's outline plus a glowing comet that runs `loops`
 * times clockwise around it, eased in and out, each time `play` changes to a
 * new non-zero value. Parent must be `relative` and must not clip
 * (`overflow-hidden`) so the glow can spill outside.
 */
const TAIL_LEN = 55; // % of the outline
const STEPS = 32;
// Stacked butt-capped dashes that all end at the head: their opacities
// compound into a smooth fade with no visible ends or beads.
const TAIL = Array.from({ length: STEPS }, (_, i) => TAIL_LEN * (1 - i / STEPS));

export function TraceBorder({
  radius = 30,
  duration = 4.5,
  loops = 2,
  play = 0,
  delay = 0.4,
}: {
  radius?: number;
  duration?: number;
  loops?: number;
  play?: number;
  delay?: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const cometRef = useRef<SVGGElement | null>(null);
  const [running, setRunning] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (play && !reduce) setRunning(true);
  }, [play, reduce]);

  const inset = 0.5;
  const w = Math.max(size.w - inset * 2, 0);
  const h = Math.max(size.h - inset * 2, 0);
  const r = Math.max(Math.min(radius - inset, w / 2, h / 2), 0);
  const d = w && h
    ? `M${inset},${inset + r} A${r},${r} 0 0 1 ${inset + r},${inset} H${inset + w - r} A${r},${r} 0 0 1 ${inset + w},${inset + r} V${inset + h - r} A${r},${r} 0 0 1 ${inset + w - r},${inset + h} H${inset + r} A${r},${r} 0 0 1 ${inset},${inset + h - r} Z`
    : "";

  useLayoutEffect(() => {
    const g = cometRef.current;
    if (!running || !d || !g) return;
    const timing = { duration: duration * loops * 1000, delay: delay * 1000, fill: "both" as const };
    const anims = Array.from(g.querySelectorAll<SVGPathElement>("path[data-len]")).map((el) => {
      const len = Number(el.dataset.len);
      return el.animate(
        [{ strokeDashoffset: String(len) }, { strokeDashoffset: String(len - 100 * loops) }],
        { ...timing, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
      );
    });
    const fade = g.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], timing);
    fade.onfinish = () => setRunning(false);
    return () => {
      fade.onfinish = null;
      anims.forEach((a) => a.cancel());
      fade.cancel();
    };
  }, [running, d, play, duration, loops, delay]);

  const comet = (width: number, opacity: number, prefix: string) =>
    TAIL.map((len) => (
      <path
        key={`${prefix}-${len}`}
        data-len={len}
        d={d}
        pathLength={100}
        fill="none"
        stroke="#fff"
        strokeOpacity={opacity}
        strokeWidth={width}
        strokeLinecap="butt"
        strokeLinejoin="round"
        strokeDasharray={`${len} ${100 - len}`}
        strokeDashoffset={len}
      />
    ));

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          borderRadius: radius,
          boxShadow: "0 0 0 0.75px rgba(255,255,255,0.16)",
        }}
      />
      <svg ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" width={size.w} height={size.h}>
        {d && running && (
          <g ref={cometRef} key={d} opacity={0}>
            {comet(1.25, 0.1, "c")}
          </g>
        )}
      </svg>
    </>
  );
}
