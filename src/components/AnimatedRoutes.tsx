import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

/**
 * Wraps <Routes> with AnimatePresence using "popLayout" so the incoming page
 * mounts immediately without waiting for the previous page's exit animation.
 * This makes navigation feel instant.
 */
export const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <div key={location.pathname} className="contents">
        {children}
      </div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
