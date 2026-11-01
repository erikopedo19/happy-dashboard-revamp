import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Crown, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

const ease = [0.22, 1, 0.36, 1] as const;
const sheetSpring = { type: "spring", stiffness: 280, damping: 34, mass: 0.9 } as const;
const RED = "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)";

const STEPS = [
  { title: "A client cancels", body: "Their slot opens up on your agenda." },
  { title: "The list gets pinged", body: "The first person waiting gets an instant alert." },
  { title: "The chair fills itself", body: "They claim the slot in one tap. No calls, no gaps." },
];

/** Slide-up sheet explaining the cancellation list, shown to barbers without Premium. */
export function CancellationListExplainer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2400);
    return () => window.clearInterval(id);
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cl-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[420] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="cl-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Cancellation list"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[421] mx-auto flex max-h-[92dvh] max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-[#0E0E10] text-white ring-1 ring-white/10 shadow-[0_-24px_80px_-16px_rgba(0,0,0,0.7)]"
          >
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-white/15" />
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              <Demo step={step} />

              <motion.div
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, ease, delay: 0.15 }}
                className="mt-7 text-center"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF2D46]/15 px-3 py-1 text-[12px] font-semibold text-[#FF5A6E]">
                  <Crown className="h-3.5 w-3.5" /> Premium
                </span>
                <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.03em]">Cancellation list</h2>
                <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-relaxed text-white/60">
                  Clients join a waiting list for your chair. When someone cancels, the slot goes straight to the next person.
                </p>
              </motion.div>

              <div className="mt-6 space-y-2">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-[18px] px-4 py-3 transition-colors duration-500"
                    style={{ background: step === i ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)" }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-500"
                      style={{ background: step === i ? "#FF2D46" : "rgba(255,255,255,0.08)" }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{s.title}</p>
                      <p className="text-[13px] text-white/50">{s.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.45 }}
                className="mt-7 space-y-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    haptic("medium");
                    onClose();
                    navigate("/pricing");
                  }}
                  className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-semibold shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_12px_26px_rgba(255,45,70,0.35)] active:scale-[0.98] transition"
                  style={{ background: RED }}
                >
                  <Crown className="h-4 w-4" /> Unlock with Premium
                </button>
                <button type="button" onClick={onClose} className="h-11 w-full text-[15px] font-medium text-white/60 active:opacity-60">
                  Not now
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Demo({ step }: { step: number }) {
  const cancelled = step >= 0;
  const pinged = step >= 1;
  const filled = step === 2;
  return (
    <div className="relative mx-auto h-[190px] w-full max-w-[320px] overflow-hidden rounded-[26px] bg-gradient-to-b from-[#1B1B1F] to-[#121215] p-4 ring-1 ring-white/10">
      <div className="space-y-2">
        <Slot time="10:00" name="Marco R." tone="muted" />
        <motion.div
          layout
          className="relative flex h-12 items-center gap-3 rounded-[14px] px-3"
          animate={{
            backgroundColor: filled ? "rgba(48,209,88,0.16)" : "rgba(255,45,70,0.12)",
            borderColor: filled ? "rgba(48,209,88,0.5)" : "rgba(255,45,70,0.45)",
          }}
          transition={{ duration: 0.5, ease }}
          style={{ borderWidth: 1, borderStyle: filled ? "solid" : "dashed" }}
        >
          <span className="w-11 text-[12px] font-semibold tabular-nums text-white/50">11:00</span>
          <AnimatePresence mode="wait">
            {filled ? (
              <motion.span key="filled" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[14px] font-semibold text-[#30D158]">
                <Check className="h-4 w-4" /> Nikos P. claimed it
              </motion.span>
            ) : (
              <motion.span key="open" initial={{ opacity: 0, y: 8 }} animate={{ opacity: cancelled ? 1 : 0, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-[14px] font-semibold text-[#FF5A6E]">
                Cancelled · slot open
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        <Slot time="12:00" name="John D." tone="muted" />
      </div>

      <AnimatePresence>
        {pinged && !filled && (
          <motion.div
            key="ping"
            initial={{ opacity: 0, y: -30, scale: 0.9, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute inset-x-3 top-3 flex items-center gap-3 rounded-[18px] bg-white/[0.14] px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-2xl"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FF2D46]">
              <BellRing className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">A slot just opened</p>
              <p className="truncate text-[12px] text-white/60">11:00 today · tap to claim</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({ time, name }: { time: string; name: string; tone: "muted" }) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-[14px] bg-white/[0.05] px-3">
      <span className="w-11 text-[12px] font-semibold tabular-nums text-white/50">{time}</span>
      <span className="text-[14px] font-medium text-white/80">{name}</span>
    </div>
  );
}
