import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 72;
const MAX_PULL = 110;

const SNIP_STYLE = `
.ptr-blade-top { transform-origin: 16px 16px; animation: ptr-snip-top .34s ease-in-out infinite alternate; }
.ptr-blade-bottom { transform-origin: 16px 16px; animation: ptr-snip-bottom .34s ease-in-out infinite alternate; }
@keyframes ptr-snip-top { from { transform: rotate(-24deg); } to { transform: rotate(7deg); } }
@keyframes ptr-snip-bottom { from { transform: rotate(24deg); } to { transform: rotate(-7deg); } }
`;

// Scissors built as two blades pivoting around the screw at (16,16), so they
// can open proportionally to the pull and "snip" while refreshing.
function SnipScissors({ open, snipping }: { open: number; snipping: boolean }) {
  const still = (deg: number) =>
    snipping ? undefined : { transform: `rotate(${deg}deg)`, transformOrigin: "16px 16px" };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <g className={snipping ? "ptr-blade-top" : undefined} style={still(-open)}>
        <line x1="16" y1="16" x2="27" y2="9" />
        <circle cx="7" cy="21" r="3" />
      </g>
      <g className={snipping ? "ptr-blade-bottom" : undefined} style={still(open)}>
        <line x1="16" y1="16" x2="27" y2="23" />
        <circle cx="7" cy="11" r="3" />
      </g>
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Global pull-to-refresh with a scissors-snip easter egg. Listens on the
// window so it works on pages that scroll the document; skips pulls that
// start inside inputs, dialogs, drawers, or partially-scrolled containers.
export function PullToRefresh() {
  const qc = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const s = useRef({ tracking: false, startY: 0, pull: 0, refreshing: false });

  useEffect(() => {
    const st = s.current;

    const onStart = (e: TouchEvent) => {
      if (st.refreshing || window.scrollY > 0 || e.touches.length !== 1) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [role="dialog"], [data-vaul-drawer], [data-no-ptr]')) return;
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
      if (dy <= 0 || window.scrollY > 0) {
        st.tracking = false;
        st.pull = 0;
        setPull(0);
        return;
      }
      if (e.cancelable && dy > 6) e.preventDefault();
      const prev = st.pull;
      const next = Math.min(MAX_PULL, dy * 0.45);
      st.pull = next;
      setPull(next);
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
        haptic("success");
        Promise.resolve(qc.invalidateQueries())
          .catch(() => {})
          .then(() => {
            // Let the snip animation play a beat before hiding.
            window.setTimeout(() => {
              st.refreshing = false;
              st.pull = 0;
              setRefreshing(false);
              setPull(0);
            }, 650);
          });
      } else {
        st.pull = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [qc]);

  const shown = refreshing || pull > 0;
  const progress = Math.min(1, pull / THRESHOLD);
  const top = refreshing ? 14 : Math.min(14, -56 + pull * 0.95);

  return (
    <>
      <style>{SNIP_STYLE}</style>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 z-[85] flex justify-center"
        style={{
          top: "env(safe-area-inset-top, 0px)",
          transform: `translateY(${shown ? top : -64}px)`,
          transition: refreshing || pull === 0 ? "transform .25s ease-out" : "none",
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/95 px-4 py-2 text-[12px] font-semibold text-[#1C1C1E] shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/95 dark:text-[#F2F2F7]">
          <SnipScissors open={18 * progress} snipping={refreshing} />
          <span>{refreshing ? "Snip snip…" : progress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
    </>
  );
}
