import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/** Iridescent arc that sweeps the outline; the glow copy lights the area just outside it. */
const ARC =
  "conic-gradient(from 0deg, transparent 0turn, transparent 0.52turn, #7DFFE0 0.62turn, #94D0FF 0.7turn, #AD8CFF 0.78turn, #FF6AD5 0.86turn, #FFB38A 0.93turn, transparent 1turn)";
const RING =
  "conic-gradient(from 210deg, #FF6AD5, #AD8CFF, #94D0FF, #7DFFE0, #FFE29A, #FF9A8B, #FF6AD5)";
const EDGE_FADE = (px: number) =>
  `linear-gradient(to right, transparent, #000 ${px}px, #000 calc(100% - ${px}px), transparent), linear-gradient(to bottom, transparent, #000 ${px}px, #000 calc(100% - ${px}px), transparent)`;

function Spinner({ blur = 0, period }: { blur?: number; period: number }) {
  return (
    <span
      className="opal-spin absolute left-1/2 top-1/2 aspect-square w-[160%]"
      style={{ background: ARC, filter: blur ? `blur(${blur}px)` : undefined, animationDuration: `${period}s` }}
    />
  );
}

/** Glow that sits behind the card. Render it as a sibling before the card inside a `relative` wrapper. */
export function OpalGlow({ radius = 30, play = 0, period = 6 }: { radius?: number; play?: number; period?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const spread = 18;

  useEffect(() => {
    const el = ref.current;
    if (!el || !play || reduce) return;
    const a = el.animate(
      [{ opacity: 0.55 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0.55 }],
      { duration: period * 2 * 1000, easing: "ease-in-out", delay: 300 },
    );
    return () => a.cancel();
  }, [play, reduce, period]);

  if (reduce) return null;
  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute overflow-hidden"
      style={{
        inset: -spread,
        borderRadius: radius + spread,
        opacity: 0.55,
        WebkitMaskImage: EDGE_FADE(spread),
        maskImage: EDGE_FADE(spread),
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    >
      <Spinner blur={14} period={period} />
    </span>
  );
}

/** Thin iridescent outline with the sweeping arc. Place inside a `relative` card. */
export function OpalBorder({ radius = 30, width = 1.25, period = 6 }: { radius?: number; width?: number; period?: number }) {
  const reduce = useReducedMotion();
  const ring = {
    padding: width,
    borderRadius: radius,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
  } as const;
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 z-20 opacity-30" style={{ ...ring, background: RING }} />
      {!reduce && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden" style={ring}>
          <Spinner period={period} />
        </span>
      )}
    </>
  );
}
