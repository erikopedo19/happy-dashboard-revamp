import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";

/** Guests can browse Reports; after a while they are asked to sign in. */
export function LoginNudge({ delaySec = 40 }: { delaySec?: number }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("reports-login-nudge-dismissed")) return;
    const t = setTimeout(() => setShow(true), delaySec * 1000);
    return () => clearTimeout(t);
  }, [delaySec]);
  const close = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("reports-login-nudge-dismissed", "1");
  };
  if (dismissed) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="relative rounded-[26px] border border-white/[0.08] bg-[#121215] p-4">
            <div className="relative flex items-center gap-3.5">
              <motion.div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 bg-[#FF2D46]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Lock className="w-5 h-5 text-white" strokeWidth={2.4} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white leading-tight">
                  Save your insights
                </p>
                <p className="text-[12px] text-white/50 mt-0.5">
                  Sign in to unlock live tracking, exports & alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Dismiss"
                className="w-8 h-8 rounded-[12px] bg-white/10 text-white/50 flex items-center justify-center hover:bg-[#22222A] transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
            <div className="relative mt-3.5 flex items-center gap-2.5">
              <Link
                to={`/auth?next=${encodeURIComponent(window.location.pathname)}`}
                className="flex-1 h-11 rounded-[12px] bg-[#FF2D46] text-white text-[14px] font-semibold flex items-center justify-center active:scale-[0.98] transition-transform"
              >
                Sign in
              </Link>
              <Link
                to="/auth?signup=1"
                className="flex-1 h-11 rounded-[12px] bg-white/10 text-white text-[14px] font-semibold flex items-center justify-center border border-white/[0.08] active:scale-[0.98] transition-transform"
              >
                Create account
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
