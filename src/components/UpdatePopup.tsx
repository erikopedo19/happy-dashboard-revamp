import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const KEY = "cutzio:update-shown-at";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function UpdatePopup() {
  const isMobile = useIsMobile() ?? false;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    try {
      const raw = localStorage.getItem(KEY);
      const last = raw ? parseInt(raw, 10) : 0;
      if (Number.isNaN(last) || Date.now() - last > ONE_DAY_MS) {
        setOpen(true);
      }
    } catch {}
  }, [isMobile]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  };

  if (!isMobile || !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[200] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <div className="mx-auto max-w-sm rounded-[24px] bg-[#15151A] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-4 relative overflow-hidden">
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[11px] uppercase tracking-widest text-rose-400 font-semibold mb-1">
              Update
            </p>
            <h4 className="text-[15px] font-semibold text-white leading-tight">
              What’s new
            </h4>
            <p className="text-[13px] text-white/60 mt-1 leading-relaxed">
              QR flyers, a smarter dock, and easier booking links are live. Tap around to check them out.
            </p>
            <button
              onClick={dismiss}
              className="mt-3 h-10 w-full rounded-xl bg-rose-500 text-white text-[13px] font-semibold active:scale-[0.98] transition"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
