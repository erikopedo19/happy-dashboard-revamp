import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

/**
 * Wraps <Routes> children to allow exit animations between pages.
 * Pair each route element with <PageTransition>.
 */
export const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={location.pathname} className="contents">
        {children}
      </div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
