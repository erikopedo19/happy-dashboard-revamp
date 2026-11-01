import { useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A glowing comet that loops around the parent's border, starting at the
 * top-left corner and running clockwise, over a soft glow on the whole
 * outline. Parent must be `relative` and must not clip (`overflow-hidden`)
 * so the glow can spill outside. All SMIL so every layer stays in sync.
 */
const TAIL = [
  { len: 60, o: 0.1 },
  { len: 46, o: 0.12 },
  { len: 34, o: 0.14 },
  { len: 24, o: 0.16 },
  { len: 16, o: 0.18 },
  { len: 10, o: 0.22 },
  { len: 5, o: 0.6 },
];
// Wider, fainter copies of the tail stack into a soft glow along the whole comet.
const GLOW = [
  { w: 4, k: 0.3 },
  { w: 8, k: 0.14 },
  { w: 14, k: 0.07 },
  { w: 22, k: 0.035 },
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

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          borderRadius: radius,
          boxShadow: "0 0 0 0.75px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.10), 0 0 32px rgba(255,255,255,0.05), inset 0 0 14px rgba(255,255,255,0.07)",
        }}
      />
      <svg ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" width={size.w} height={size.h}>
        {d && !reduce && (
          <g key={d}>
            <defs>
              <radialGradient id={glowId}>
                <stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
                <stop offset="35%" stopColor="#fff" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#fff" stopOpacity={0} />
              </radialGradient>
            </defs>
            <ellipse rx={30} ry={16} fill={`url(#${glowId})`}>
              <animateMotion dur={`${duration}s`} begin={`${-duration}s`} repeatCount="indefinite" rotate="auto" path={d} />
            </ellipse>
            {TAIL.flatMap((s) => [...GLOW.map((g) => ({ ...s, w: g.w, o: s.o * g.k })), { ...s, w: s.len < 6 ? 1.25 : 1 }]).map((s) => (
              <path
                key={`${s.len}-${s.w}`}
                d={d}
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeOpacity={s.o}
                strokeWidth={s.w}
                strokeLinecap="round"
                strokeDasharray={`${s.len} ${100 - s.len}`}
                strokeDashoffset={s.len}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from={s.len}
                  to={s.len - 100}
                  dur={`${duration}s`}
                  begin={`${-duration}s`}
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </g>
        )}
      </svg>
    </>
  );
}
