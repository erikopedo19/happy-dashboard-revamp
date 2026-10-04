import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Alert } from "@heroui/react";
import { ImagePlus, User as UserIcon, ArrowRight } from "lucide-react";

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
      >
        <Alert
          color="danger"
          variant="flat"
          isClosable
          onClose={dismiss}
          title={copy.title}
          description={
            <>
              {copy.body}
              <span className="mt-3 flex items-center gap-2">
                <button
                  onClick={onOpenIdentity}
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-[#1C1C1E] dark:bg-white px-3.5 text-[12px] font-semibold text-white dark:text-[#1c1c1e] active:scale-[0.98] transition"
                >
                  Add now <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  onClick={dismiss}
                  className="h-9 rounded-full px-3 text-[12px] font-medium text-[#8E8E93] dark:text-white/50 hover:text-[#1C1C1E] dark:hover:text-white/80 transition"
                >
                  Not now
                </button>
                <span className="ml-auto text-[10px] text-[#8E8E93] dark:text-white/30">Hidden 2 weeks after dismiss</span>
              </span>
            </>
          }
          icon={<Icon className="h-5 w-5" strokeWidth={2.2} />}
          classNames={{
            base: "rounded-[22px] border border-black/[0.05] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] items-start py-3.5",
            iconWrapper: "bg-[#FF2D46]/10",
            title: "text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]",
            description: "text-[12px] text-[#636366] dark:text-[#A1A1A6]",
            closeButton: "text-[#8E8E93]",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
