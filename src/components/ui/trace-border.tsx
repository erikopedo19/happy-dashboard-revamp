import { useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A soft glowing comet that loops around the parent's border, starting at the
 * top-left corner and running clockwise. Parent must be `relative`.
 * Thin tail segments share one head; stacked opacities fade the tail and a
 * radial-gradient halo rides the head. All SMIL so every layer stays in sync.
 */
const TAIL = [
  { len: 55, o: 0.12 },
  { len: 34, o: 0.22 },
  { len: 18, o: 0.4 },
  { len: 7, o: 0.85 },
];

export function TraceBorder({ radius = 30, duration = 5.5 }: { radius?: number; duration?: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();
  const glowId = `tb-glow-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inset = 0.5;
  const w = Math.max(size.w - inset * 2, 0);
  const h = Math.max(size.h - inset * 2, 0);
  const r = Math.max(Math.min(radius - inset, w / 2, h / 2), 0);
  const d = w && h
    ? `M${inset},${inset + r} A${r},${r} 0 0 1 ${inset + r},${inset} H${inset + w - r} A${r},${r} 0 0 1 ${inset + w},${inset + r} V${inset + h - r} A${r},${r} 0 0 1 ${inset + w - r},${inset + h} H${inset + r} A${r},${r} 0 0 1 ${inset},${inset + h - r} Z`
    : "";
  const dur = `${duration}s`;

  return (
    <svg ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" width={size.w} height={size.h}>
      {d && (
        <g key={d}>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
              <stop offset="35%" stopColor="#fff" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.75} />
          {!reduce && (
            <>
              <ellipse rx={30} ry={17} fill={`url(#${glowId})`}>
                <animateMotion dur={dur} repeatCount="indefinite" rotate="auto" path={d} />
              </ellipse>
              {TAIL.map((s) => (
                <path
                  key={s.len}
                  d={d}
                  pathLength={100}
                  fill="none"
                  stroke="#fff"
                  strokeOpacity={s.o}
                  strokeWidth={s.len < 10 ? 1.25 : 1}
                  strokeLinecap="round"
                  strokeDasharray={`${s.len} ${100 - s.len}`}
                  strokeDashoffset={s.len}
                >
                  <animate attributeName="stroke-dashoffset" from={s.len} to={s.len - 100} dur={dur} repeatCount="indefinite" />
                </path>
              ))}
            </>
          )}
        </g>
      )}
    </svg>
  );
}
