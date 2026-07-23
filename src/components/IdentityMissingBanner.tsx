import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImagePlus, User as UserIcon, ArrowRight } from "lucide-react";

const DISMISS_KEY = "cutzio:identity-missing-banner-dismissed-until";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

type Kind = "avatar" | "banner" | "both";

interface Props {
  missingAvatar: boolean;
  missingBanner: boolean;
  onOpenIdentity: () => void;
}

/**
 * Non-blocking suggestion shown inside the Settings screen for barbers
 * missing a profile photo or banner. Dismiss = hidden for 2 weeks.
 */
export function IdentityMissingBanner({ missingAvatar, missingBanner, onOpenIdentity }: Props) {
  const kind: Kind | null = missingAvatar && missingBanner
    ? "both"
    : missingAvatar
      ? "avatar"
      : missingBanner
        ? "banner"
        : null;

  const [show, setShow] = useState(() => {
    if (!kind) return false;
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() >= until;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!kind) {
      setShow(false);
      return;
    }
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setShow(Date.now() >= until);
    } catch {
      setShow(true);
    }
  }, [kind]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + TWO_WEEKS_MS)); } catch {}
    setShow(false);
  };

  if (!kind || !show) return null;

  const copy =
    kind === "both"
      ? { title: "Complete your profile", body: "Add a profile photo and a banner so clients can recognize your shop." }
      : kind === "avatar"
        ? { title: "Add a profile photo", body: "Profiles with a photo get noticeably more bookings." }
        : { title: "Add a banner image", body: "A banner makes your public page stand out." };

  const Icon = kind === "avatar" ? UserIcon : ImagePlus;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="identity-missing-banner"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-[#1c1c1e] via-[#1a1a1c] to-[#151517] p-4 pr-10"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss for 2 weeks"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF375F] to-[#FF9F0A] text-white shadow-lg shadow-black/30">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-white leading-tight">{copy.title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-white/55">{copy.body}</p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onOpenIdentity}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3.5 text-[12px] font-semibold text-[#1c1c1e] active:scale-[0.98] transition"
              >
                Add now <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={dismiss}
                className="h-9 rounded-full px-3 text-[12px] font-medium text-white/50 hover:text-white/80 transition"
              >
                Not now
              </button>
              <span className="ml-auto text-[10px] text-white/30">Hidden 2 weeks after dismiss</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
