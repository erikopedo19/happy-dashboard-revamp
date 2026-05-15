import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * iOS-style page transition wrapper.
 * Mobile: subtle slide + fade (right→left) like a UINavigationController push.
 * Desktop: gentle opacity/scale fade.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();

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
