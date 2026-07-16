import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, User, Image as ImageIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Kind = "name" | "photo";

const NEVER_KEY = (k: Kind) => `identity-suggest-${k}-never`;
const LAST_KEY = (k: Kind) => `identity-suggest-${k}-lastShown`;

const todayStr = () => new Date().toISOString().slice(0, 10);

function shouldShow(kind: Kind): boolean {
  try {
    if (localStorage.getItem(NEVER_KEY(kind)) === "1") return false;
    return localStorage.getItem(LAST_KEY(kind)) !== todayStr();
  } catch {
    return false;
  }
}

function markShown(kind: Kind) {
  try {
    localStorage.setItem(LAST_KEY(kind), todayStr());
  } catch {}
}

function markNever(kind: Kind) {
  try {
    localStorage.setItem(NEVER_KEY(kind), "1");
  } catch {}
}

/**
 * Shows a small suggestion card to the barber viewing Find Barber when:
 *  - Their brand name falls back to "Barber" (no business_name/full_name), or
 *  - They have no profile photo.
 * Dismissed with "Never again" → never shows. Otherwise shows once per day.
 */
export function IdentitySuggestionPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("business_name, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;

      const brandName = (data.business_name || data.full_name || "").trim();
      const nameIsFallback = !brandName;
      const missingPhoto = !data.avatar_url;

      // Name suggestion takes priority; only surface one at a time.
      if (nameIsFallback && shouldShow("name")) {
        setKind("name");
        markShown("name");
      } else if (missingPhoto && shouldShow("photo")) {
        setKind("photo");
        markShown("photo");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismiss = () => setKind(null);

  const never = () => {
    if (kind) markNever(kind);
    setKind(null);
  };

  const goEdit = () => {
    if (kind) markNever(kind); // stop suggesting once acted on
    setKind(null);
    navigate("/settings");
  };

  const config =
    kind === "name"
      ? {
          icon: User,
          title: "You're showing as “Barber”",
          body: "Add your name so clients can recognize you on Find Barber.",
          cta: "Set my name",
        }
      : kind === "photo"
      ? {
          icon: ImageIcon,
          title: "Add a profile photo",
          body: "Profiles with a photo get noticeably more bookings.",
          cta: "Upload photo",
        }
      : null;

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed left-1/2 -translate-x-1/2 z-[60] w-[min(94vw,380px)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:bottom-6"
        >
          <div className="relative rounded-2xl bg-[#1C1C1E] text-white border border-white/10 shadow-2xl p-3.5 pr-9">
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-2 right-2 h-7 w-7 rounded-full text-white/50 hover:text-white flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-400 flex items-center justify-center shrink-0">
                <config.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold leading-tight">{config.title}</p>
                <p className="text-[12px] text-white/60 mt-0.5 leading-snug">{config.body}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={goEdit}
                className="h-9 px-3.5 rounded-full bg-white text-[#1C1C1E] text-[12px] font-semibold inline-flex items-center gap-1"
              >
                {config.cta} <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={dismiss}
                className="h-9 px-3.5 rounded-full bg-white/10 text-white/80 text-[12px] font-medium"
              >
                Not now
              </button>
              <button
                onClick={never}
                className="ml-auto h-9 px-2 text-[11px] text-white/45 hover:text-white/70"
              >
                Never again
              </button>
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
