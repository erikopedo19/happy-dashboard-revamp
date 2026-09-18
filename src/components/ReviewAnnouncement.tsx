import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Settings } from "lucide-react";

const STORAGE_KEY = "cutzio:review-announcement-shown";

export function ReviewAnnouncement() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const goToSettings = () => {
    dismiss();
    navigate("/settings?tab=notifications");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="relative rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-white/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">New</span>
                <p className="text-sm font-semibold text-white">Automatic review requests</p>
              </div>
              <p className="text-[13px] text-white/60 mt-1 leading-relaxed">
                Clients can now leave reviews and you can get notified. Turn it on in Settings → Alerts.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={goToSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Open settings
                </button>
                <button
                  onClick={dismiss}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
