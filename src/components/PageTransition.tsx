import { motion } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const SESSION_KEY = "pt:seen-routes";

function getSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(path: string) {
  try {
    const seen = getSeen();
    seen.add(path);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* noop */
  }
}

/**
 * Snappy iOS-style page transition. Animates only the first visit to each
 * route per session, with a very short fade/slide so navigation feels instant.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  const shouldAnimateRef = useRef<boolean | null>(null);
  if (shouldAnimateRef.current === null) {
    const seen = getSeen();
    shouldAnimateRef.current = !seen.has(pathname);
    if (shouldAnimateRef.current) markSeen(pathname);
  }
  const shouldAnimate = shouldAnimateRef.current;

  if (!shouldAnimate) {
    return <div style={{ height: "100%" }}>{children}</div>;
  }

  return (
    <motion.div
      initial={isMobile ? { opacity: 0, x: 12 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
