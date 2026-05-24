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
 * iOS-style page transition wrapper.
 * Plays the slide/fade animation only the FIRST time a route is opened in
 * this session. Repeat visits render instantly for a snappier feel.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  // Decide once per mount, before the first paint
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
      initial={isMobile ? { opacity: 0, x: 24 } : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={isMobile ? { opacity: 0, x: -24 } : { opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
