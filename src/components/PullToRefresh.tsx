import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 72;
const MAX_PULL = 110;

// Minimal circular pull indicator — a tiny ring that fills with pull progress
// and spins while refreshing. No text, no pill.
const RING_R = 7;
const RING_C = 2 * Math.PI * RING_R;

function PullDot({ progress, spinning }: { progress: number; spinning: boolean }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/90">
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        className={spinning ? "animate-spin" : undefined}
        style={spinning ? undefined : { transform: `rotate(${-90 + progress * 360}deg)` }}
      >
        <circle cx="9" cy="9" r={RING_R} fill="none" strokeWidth="2" className="stroke-black/10 dark:stroke-white/15" />
        <circle
          cx="9"
          cy="9"
          r={RING_R}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          stroke={progress >= 1 || spinning ? "#FF2D46" : "currentColor"}
          className="text-[#8E8E93]"
          strokeDasharray={RING_C}
          strokeDashoffset={spinning ? RING_C * 0.7 : RING_C * (1 - progress)}
          style={spinning ? undefined : { transition: "stroke-dashoffset .08s linear, stroke .15s ease" }}
        />
      </svg>
    </div>
  );
}

// Global pull-to-refresh with a minimal ring indicator. Capture-phase
// listeners cover document and nested-scroll pages; ignore controls, overlays,
// and pulls that begin inside a partially-scrolled container.
export function PullToRefresh() {
  const qc = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const s = useRef({ tracking: false, startY: 0, pull: 0, refreshing: false });

  // Rubber-band the whole page content down while pulling (native feel).
  const setContentPull = (v: number, animated: boolean) => {
    const body = document.body;
    body.style.transition = animated ? "transform .32s cubic-bezier(.22,.9,.32,1)" : "none";
    body.style.transform = v > 0.5 ? `translateY(${v}px)` : "";
  };

  useEffect(() => {
    const st = s.current;
    const pageScrollTop = () => Math.max(window.scrollY, document.scrollingElement?.scrollTop || 0);

    const onStart = (e: TouchEvent) => {
      if (st.refreshing || pageScrollTop() > 0 || e.touches.length !== 1) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [data-vaul-drawer], [data-no-ptr]')) return;
      // Don't hijack a pull inside an inner container that can still scroll up.
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        if (node.scrollTop > 1 && node.scrollHeight > node.clientHeight + 1) return;
        node = node.parentElement;
      }
      st.tracking = true;
      st.startY = e.touches[0].clientY;
      st.pull = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!st.tracking || st.refreshing) return;
      const dy = e.touches[0].clientY - st.startY;
      if (dy <= 0 || pageScrollTop() > 0) {
        st.tracking = false;
        st.pull = 0;
        setPull(0);
        setContentPull(0, true);
        return;
      }
      if (e.cancelable && dy > 6) e.preventDefault();
      const prev = st.pull;
      const next = Math.min(MAX_PULL, dy * 0.45);
      st.pull = next;
      setPull(next);
      setContentPull(next * 0.55, false);
      if (prev < THRESHOLD && next >= THRESHOLD) haptic("medium");
    };

    const onEnd = () => {
      if (!st.tracking || st.refreshing) return;
      st.tracking = false;
      if (st.pull >= THRESHOLD) {
        st.refreshing = true;
        st.pull = THRESHOLD * 0.72;
        setRefreshing(true);
        setPull(st.pull);
        setContentPull(30, true);
        haptic("success");
        Promise.resolve(qc.invalidateQueries())
          .catch(() => {})
          .then(() => {
            window.setTimeout(() => {
              st.refreshing = false;
              st.pull = 0;
              setRefreshing(false);
              setPull(0);
              setContentPull(0, true);
            }, 650);
          });
      } else {
        st.pull = 0;
        setPull(0);
        setContentPull(0, true);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true, capture: true });
    window.addEventListener("touchmove", onMove, { passive: false, capture: true });
    window.addEventListener("touchend", onEnd, { passive: true, capture: true });
    window.addEventListener("touchcancel", onEnd, { passive: true, capture: true });
    return () => {
      window.removeEventListener("touchstart", onStart, true);
      window.removeEventListener("touchmove", onMove, true);
      window.removeEventListener("touchend", onEnd, true);
      window.removeEventListener("touchcancel", onEnd, true);
      document.body.style.transition = "";
      document.body.style.transform = "";
    };
  }, [qc]);

  const shown = refreshing || pull > 4;
  const progress = Math.min(1, pull / THRESHOLD);
  const offset = refreshing ? 0 : Math.min(0, -40 + pull * 0.55);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-[85] flex justify-center"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 6px)",
        opacity: shown ? Math.min(1, pull / 20 + (refreshing ? 1 : 0)) : 0,
        transform: `translateY(${shown ? offset : -44}px)`,
        transition: refreshing || pull === 0 ? "transform .25s ease-out, opacity .2s ease" : "none",
      }}
    >
      <PullDot progress={progress} spinning={refreshing} />
    </div>
  );
}
