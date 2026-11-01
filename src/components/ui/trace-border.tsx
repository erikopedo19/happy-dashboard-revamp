import { useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A glowing comet that loops around the parent's border, starting at the
 * top-left corner and running clockwise, over a soft glow on the whole
 * outline. Parent must be `relative` and must not clip (`overflow-hidden`)
 * so the glow can spill outside. All SMIL so every layer stays in sync.
 */
const TAIL_LEN = 55; // % of the outline
const STEPS = 32;
// Stacked butt-capped dashes that all end at the head: their opacities
// compound into a smooth fade with no visible ends or beads.
const TAIL = Array.from({ length: STEPS }, (_, i) => TAIL_LEN * (1 - i / STEPS));

export function TraceBorder({ radius = 30, duration = 5.5 }: { radius?: number; duration?: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();
  const blurId = `tb-blur-${useId().replace(/:/g, "")}`;

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

  const comet = (width: number, opacity: number, prefix: string) =>
    TAIL.map((len) => (
      <path
        key={`${prefix}-${len}`}
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
      >
        <animate
          attributeName="stroke-dashoffset"
          from={len}
          to={len - 100}
          dur={`${duration}s`}
          begin={`${-duration}s`}
          repeatCount="indefinite"
        />
      </path>
    ));

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
              <filter id={blurId} filterUnits="userSpaceOnUse" x={-40} y={-40} width={size.w + 80} height={size.h + 80}>
                <feGaussianBlur stdDeviation={5} />
              </filter>
            </defs>
            <g filter={`url(#${blurId})`}>{comet(6, 0.07, "g")}</g>
            {comet(1.1, 0.085, "c")}
          </g>
        )}
      </svg>
    </>
  );
}
