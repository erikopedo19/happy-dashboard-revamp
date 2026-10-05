import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronRight, Scissors } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { FlipWords } from "@/components/aceternity/flip-words";

const INTRO_KEY = "cutzio:intro-seen";

export function hasSeenIntro() {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* ignore */
  }
}

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1600&auto=format&fit=crop",
    title: ["Look sharp,", "feel ready,"],
    flip: ["every day", "every cut", "every week"],
    text: "Find the closest barbers and salons, see real open times, and book in two taps — no calls, no waiting.",
  },
  {
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop",
    title: ["Your chair,"],
    flip: ["your rules", "your clients", "your brand"],
    text: "Run your agenda, clients and bookings from one place. Cutzioo keeps your day full and your clients coming back.",
  },
];

const spring = { type: "spring" as const, stiffness: 320, damping: 32 };

export function OnboardingIntro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const go = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), SLIDES.length - 1);
    if (bounded === index) return;
    setDir(bounded > index ? 1 : -1);
    setIndex(bounded);
    haptic("selection");
  };

  const finish = () => {
    haptic("success");
    markIntroSeen();
    onDone();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) {
      if (last) finish();
      else go(index + 1);
    } else if (info.offset.x > 60 || info.velocity.x > 400) {
      go(index - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#0A0A0C] text-white select-none">
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={index}
          custom={dir}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src={slide.image} alt="" className="h-full w-full object-cover" draggable={false} />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-[#0A0A0C]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/85 to-transparent" />

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        className="relative z-10 flex h-full flex-col justify-end px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div className="absolute right-5 top-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={finish}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/80 backdrop-blur-md transition active:scale-95"
          >
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={spring}
          >
            <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">
              {slide.title.map((line, i) => (
                <motion.span
                  key={line}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, ...spring }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + slide.title.length * 0.07, ...spring }}
                className="block text-[#FF5A6E]"
              >
                <FlipWords words={slide.flip} className="-ml-2" />
              </motion.span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ...spring }}
              className="mt-4 max-w-[32ch] text-[14px] leading-relaxed text-white/60"
            >
              {slide.text}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <motion.button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              animate={{ width: i === index ? 22 : 6, opacity: i === index ? 1 : 0.35 }}
              transition={spring}
              className="h-1.5 rounded-full bg-white"
            />
          ))}
        </div>

        <motion.button
          type="button"
          onClick={() => (last ? finish() : go(index + 1))}
          whileTap={{ scale: 0.97 }}
          className="mt-6 flex h-[64px] w-full items-center rounded-full bg-[#141416]/90 p-2 pr-5 ring-1 ring-white/10 backdrop-blur-xl"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5A6E] to-[#E0152F] shadow-[0_8px_20px_rgba(255,45,70,0.45)]">
            <Scissors className="h-5 w-5 text-white" strokeWidth={2.2} />
          </span>
          <span className="ml-4 flex-1 text-left text-[16px] font-semibold">{last ? "Get Started" : "Next"}</span>
          <span className="flex items-center -space-x-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                className={cn("inline-flex")}
              >
                <ChevronRight className="h-4 w-4 text-white/80" strokeWidth={2.5} />
              </motion.span>
            ))}
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
