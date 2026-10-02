import { useEffect, useRef, useState } from "react";

interface VirtualRowsOptions {
  count: number;
  rowHeight: number;
  overscan?: number;
}

export function useVirtualRows({ count, rowHeight, overscan = 6 }: VirtualRowsOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setViewport({ scrollTop: element.scrollTop, height: element.clientHeight });
      });
    };

    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const start = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - overscan);
  const end = Math.min(
    count,
    Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + overscan,
  );

  return {
    containerRef,
    start,
    end,
    paddingTop: start * rowHeight,
    paddingBottom: Math.max(0, (count - end) * rowHeight),
  };
}
