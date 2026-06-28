import { useEffect } from "react";
import { useGlimm } from "glimm/react";

/**
 * Bus-style sweep trigger. The previous version intercepted every link click
 * and every programmatic route change, which felt laggy. Now we only sweep
 * when something explicitly dispatches `glimm:sweep` (e.g. login success,
 * auth mode toggle).
 *
 *   window.dispatchEvent(new CustomEvent("glimm:sweep"))
 */
export function GlimmIntercept() {
  const { sweep } = useGlimm();

  useEffect(() => {
    const onSweep = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { sweepMs?: number; outroMs?: number }
        | undefined;
      sweep(() => {}, {
        sweepMs: detail?.sweepMs ?? 700,
        outroMs: detail?.outroMs ?? 380,
      });
    };
    window.addEventListener("glimm:sweep", onSweep);
    return () => window.removeEventListener("glimm:sweep", onSweep);
  }, [sweep]);

  return null;
}

export function triggerGlimm(opts?: { sweepMs?: number; outroMs?: number }) {
  window.dispatchEvent(new CustomEvent("glimm:sweep", { detail: opts }));
}

export default GlimmIntercept;
