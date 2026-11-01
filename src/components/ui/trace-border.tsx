import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * A white light that travels around the parent's border, starting at the
 * top-left corner and running clockwise (to the right) back to it.
 * Parent must be `relative`; the SVG fills it.
 */
export function TraceBorder({ radius = 30, duration = 4.5, length = 0.22 }: { radius?: number; duration?: number; length?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inset = 0.75;
  const w = Math.max(size.w - inset * 2, 0);
  const h = Math.max(size.h - inset * 2, 0);
  const r = Math.max(Math.min(radius - inset, w / 2, h / 2), 0);
  // Path starts at the top-left corner (end of its arc) and runs clockwise.
  const d = w && h
    ? `M${inset},${inset + r} A${r},${r} 0 0 1 ${inset + r},${inset} H${inset + w - r} A${r},${r} 0 0 1 ${inset + w},${inset + r} V${inset + h - r} A${r},${r} 0 0 1 ${inset + w - r},${inset + h} H${inset + r} A${r},${r} 0 0 1 ${inset},${inset + h - r} Z`
    : "";
  const perimeter = 2 * (w + h) - (8 - 2 * Math.PI) * r;
  const dash = perimeter * length;

  return (
    <svg ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" width={size.w} height={size.h}>
      {d && (
        <>
          <path d={d} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          {[
            { w: 7, o: 0.12 },
            { w: 3.5, o: 0.3 },
            { w: 1.6, o: 1 },
          ].map((s) => (
            <motion.path
              key={s.w}
              d={d}
              fill="none"
              stroke="#fff"
              strokeOpacity={s.o}
              strokeWidth={s.w}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${perimeter}`}
              initial={{ strokeDashoffset: dash }}
              animate={{ strokeDashoffset: [dash, dash - perimeter] }}
              transition={{ duration, ease: "linear", repeat: Infinity }}
            />
          ))}
        </>
      )}
    </svg>
  );
}
