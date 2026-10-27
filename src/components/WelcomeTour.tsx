import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowRight, Bookmark, CalendarDays, Heart, Home, MapPin, Scissors, Sparkles, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const KEY_PREFIX = "cutzio:welcome-tour-v1:";
const APP_PATHS = ["/find-barber", "/my-bookings", "/me", "/favorites", "/admin", "/agenda", "/settings"];

const IMG = (id: string, w = 1400) => `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;
const PHOTOS = {
  welcome: IMG("1503951914875-452162b0f3f1"),
  shop: IMG("1585747860715-2ba37e788b70", 900),
  fade: IMG("1622286342621-4bd786c2447c", 900),
  crew: IMG("1622288432450-277d0fef5ed6", 900),
  portrait: IMG("1517832606299-7ae9b720a186"),
};

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 260, damping: 30 };

/** iOS-style text reveal: each word rises out of a soft blur. */
function RiseText({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const lines = text.split("\n");
  let n = 0;
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(" ").map((word, wi) => {
            const i = n++;
            return (
              <motion.span
                key={`${li}-${wi}`}
                className="inline-block whitespace-pre will-change-transform"
                initial={{ opacity: 0, y: "0.45em", filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...spring, delay: delay + i * 0.06, filter: { duration: 0.5, delay: delay + i * 0.06, ease } }}
              >
                {word}
                {wi < line.split(" ").length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

function Fade({ delay = 0, y = 14, className, children }: { delay?: number; y?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay, filter: { duration: 0.45, delay, ease } }}
    >
      {children}
    </motion.div>
  );
}

function KenBurns({ src, className }: { src: string; className?: string }) {
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      initial={{ scale: 1.14, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ scale: { duration: 2.4, ease }, opacity: { duration: 0.7, ease } }}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

type Copy = {
  welcomeTitle: string;
  welcomeText: string;
  pickTitle: string;
  cards: { label: string; title: string; chip: string; img: string }[];
  finalTitle: string;
  finalText: string;
  finalCta: string;
};

const CLIENT_COPY: Copy = {
  welcomeTitle: "Welcome\nto Cutzioo",
  welcomeText: "Your next cut, booked in seconds.\nReal open times, no calls.",
  pickTitle: "Pick your\nbarber.",
  cards: [
    { label: "Fresh", title: "FRESH\nFADES", chip: "Open today", img: PHOTOS.fade },
    { label: "Crew", title: "THE\nCREW", chip: "Trending", img: PHOTOS.crew },
    { label: "Shop", title: "THE\nCHAIR", chip: "Near you", img: PHOTOS.shop },
  ],
  finalTitle: "Your chair,\nready.",
  finalText:
    "Book the barbers you love, follow your live queue, and get a heads-up when it's your turn. Save favourites and rebook in one tap whenever you need a fresh cut.",
  finalCta: "Find a barber",
};

const BARBER_COPY: Copy = {
  welcomeTitle: "Welcome\nto Cutzioo",
  welcomeText: "Run your chair, your clients\nand your bookings in one place.",
  pickTitle: "Fill your\nagenda.",
  cards: [
    { label: "Agenda", title: "FULL\nAGENDA", chip: "Live bookings", img: PHOTOS.fade },
    { label: "Clients", title: "LOYAL\nCLIENTS", chip: "Rebook reminders", img: PHOTOS.crew },
    { label: "Shop", title: "YOUR\nSHOP", chip: "On the map", img: PHOTOS.shop },
  ],
  finalTitle: "Your chair,\nyour rules.",
  finalText:
    "Share your booking link, let clients find you on the map, and watch your day fill up. Reminders, reviews and rebooking run on their own so you can focus on the cut.",
  finalCta: "Open dashboard",
};

export function WelcomeTour() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const key = user ? `${KEY_PREFIX}${user.id}` : null;
  const onAppPage = pathname === "/" || APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!key || !onAppPage) return;
    try {
      if (localStorage.getItem(key) !== "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, [key, onAppPage]);

  if (!user) return null;

  const role = user.user_metadata?.role === "client" ? "client" : "barber";
  const copy = role === "client" ? CLIENT_COPY : BARBER_COPY;
  const total = 3;

  const go = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), total - 1);
    if (bounded === index) return;
    setDir(bounded > index ? 1 : -1);
    setIndex(bounded);
    haptic("selection");
  };

  const finish = () => {
    haptic("success");
    try {
      if (key) localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) {
      if (index === total - 1) finish();
      else go(index + 1);
    } else if (info.offset.x > 60 || info.velocity.x > 400) {
      go(index - 1);
    }
  };

  const initial = (user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase();
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
          transition={{ duration: 0.5, ease }}
          className="fixed inset-0 z-[400] overflow-hidden bg-black text-white select-none"
          style={{ fontFamily: "var(--font-apple)" }}
        >
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={index}
              custom={dir}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, x: dir * 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: dir * -40, scale: 0.98 }}
              transition={{ duration: 0.55, ease }}
              className="absolute inset-0"
            >
              {index === 0 && <WelcomeSlide copy={copy} onNext={() => go(1)} />}
              {index === 1 && (
                <PickSlide copy={copy} avatar={avatar} initial={initial} onNext={() => go(2)} />
              )}
              {index === 2 && <FinalSlide copy={copy} onDone={finish} />}
            </motion.div>
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ width: i === index ? 20 : 6, opacity: i === index ? 0.95 : 0.35 }}
                transition={spring}
                className="h-1.5 rounded-full bg-white"
              />
            ))}
          </div>
          {index < total - 1 && (
            <button
              type="button"
              onClick={finish}
              className="absolute right-5 top-[max(2rem,calc(env(safe-area-inset-top)+1.5rem))] z-30 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur-xl transition active:scale-95"
            >
              Skip
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function WelcomeSlide({ copy, onNext }: { copy: Copy; onNext: () => void }) {
  return (
    <div className="relative h-full w-full">
      <KenBurns src={PHOTOS.welcome} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/90" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/70 to-transparent" />

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
        <h1 className="text-[44px] font-medium leading-[1.04] tracking-[-0.035em] text-[#F4EFE9]">
          <RiseText text={copy.welcomeTitle} delay={0.25} />
        </h1>
        <Fade delay={0.6} className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-white/65">
          {copy.welcomeText}
        </Fade>
        <Fade delay={0.8} className="mt-9 w-full max-w-[260px]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onNext}
            className="h-[52px] w-full rounded-full bg-white/[0.12] text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/20 backdrop-blur-2xl"
          >
            Get Started
          </motion.button>
        </Fade>
        <Fade delay={0.95} className="mt-6 text-[11px] leading-relaxed text-white/40">
          By continuing, you agree to our
          <br />
          <Link to="/terms" className="underline underline-offset-2">
            Terms and Conditions
          </Link>
          .
        </Fade>
      </div>
    </div>
  );
}

function PickSlide({
  copy,
  avatar,
  initial,
  onNext,
}: {
  copy: Copy;
  avatar?: string;
  initial: string;
  onNext: () => void;
}) {
  const [front, ...rest] = [...copy.cards].reverse();
  const behind = rest.reverse();
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0A0A0C]">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease }}
        style={{
          background:
            "radial-gradient(120% 70% at 50% 0%, #5b2230 0%, #2a1218 38%, #0A0A0C 78%), linear-gradient(180deg, #2a1218, #0A0A0C)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.75rem))]">
        <div className="flex items-start justify-between">
          <Fade delay={0.1} y={8}>
            <div className="h-11 w-11 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[15px] font-semibold">{initial}</div>
              )}
            </div>
          </Fade>
          <h2 className="pt-0.5 text-center text-[19px] font-medium leading-[1.1] tracking-[-0.02em] text-white/85">
            <RiseText text={copy.pickTitle} delay={0.15} />
          </h2>
          <div className="h-11 w-11" aria-hidden />
        </div>

        <div className="relative mx-auto mt-8 flex w-full max-w-[340px] flex-1 flex-col">
          {behind.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 0.88 + i * 0.05 }}
              transition={{ ...spring, delay: 0.2 + i * 0.08 }}
              className="absolute inset-x-0 h-24 rounded-[26px] bg-gradient-to-b from-[#3a1c24] to-[#1b0f13] ring-1 ring-white/10"
              style={{ top: i * 14, transformOrigin: "50% 0%" }}
            >
              <Sparkles className="ml-4 mt-3 h-4 w-4 text-white/40" />
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: 0.35 }}
            className="relative mt-8 flex flex-1 flex-col overflow-hidden rounded-[30px] bg-gradient-to-b from-[#24151a] via-[#141012] to-[#0d0b0c] p-3 ring-1 ring-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between px-2 pt-1">
              <Scissors className="h-4 w-4 text-white/70" />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A6E]/25 ring-1 ring-[#FF8FA3]/40">
                <ArrowRight className="h-4 w-4 -rotate-45 text-[#FFC2CC]" />
              </span>
            </div>
            <h3 className="mt-1 text-center text-[30px] font-medium leading-[1.02] tracking-[-0.01em]">
              <RiseText text={front.title} delay={0.55} />
            </h3>
            <motion.div
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.5, ease }}
              className="relative mt-4 min-h-[180px] flex-1 overflow-hidden rounded-[22px]"
            >
              <img src={front.img} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-xl">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-emerald-400" />
                {front.chip}
              </span>
            </motion.div>
          </motion.div>
        </div>

        <Fade delay={0.7} y={20} className="mx-auto mt-5 w-full max-w-[300px]">
          <div className="flex h-[64px] items-center justify-between rounded-full bg-white/[0.08] px-2 ring-1 ring-white/15 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            {[CalendarDays, Home, Heart, MapPin].map((Icon, i) =>
              i === 1 ? (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={onNext}
                  aria-label="Next"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_6px_20px_rgba(255,255,255,0.25)]"
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              ) : (
                <span key={i} className="flex h-12 w-12 items-center justify-center text-white/55">
                  <Icon className="h-5 w-5" />
                </span>
              )
            )}
          </div>
        </Fade>
      </div>
    </div>
  );
}

function FinalSlide({ copy, onDone }: { copy: Copy; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="relative h-full w-full">
      <KenBurns src={PHOTOS.portrait} className="object-[60%_center]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/85 to-transparent" />

      <button
        type="button"
        onClick={onDone}
        aria-label="Close"
        className="absolute right-5 top-[max(2rem,calc(env(safe-area-inset-top)+1.5rem))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-xl transition active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 flex h-full flex-col justify-end px-7 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <Fade delay={0.2} y={10}>
          <Scissors className="h-6 w-6 -rotate-45 text-white" strokeWidth={2.2} />
        </Fade>
        <h1 className="mt-4 text-[46px] font-semibold leading-[0.98] tracking-[-0.035em]">
          <RiseText text={copy.finalTitle} delay={0.3} />
        </h1>
        <Fade delay={0.65} className="relative mt-5 max-w-[34ch]">
          <p
            className="text-[14px] leading-[1.45] text-white/75"
            style={{ WebkitMaskImage: "linear-gradient(180deg, #000 60%, transparent)", maskImage: "linear-gradient(180deg, #000 60%, transparent)" }}
          >
            {copy.finalText}
          </p>
        </Fade>
        <Fade delay={0.85} y={18} className="mt-6 flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onDone}
            className="h-[50px] rounded-full bg-white px-8 text-[15px] font-semibold text-black shadow-[0_10px_30px_rgba(255,255,255,0.18)]"
          >
            {copy.finalCta}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              haptic("light");
              setSaved((v) => !v);
            }}
            aria-label="Save"
            className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-xl"
          >
            <Bookmark className={cn("h-[18px] w-[18px] transition", saved && "fill-white")} />
          </motion.button>
        </Fade>
      </div>
    </div>
  );
}

export default WelcomeTour;
