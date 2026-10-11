import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowRight, BellRing, CalendarCheck, Moon, Star, Sun, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { EASE, Em } from "./ui";
import { AgendaScene, BookingScene, ExploreScene, PhoneFrame } from "./phones";

export const LOGIN_HREF = "/auth?mode=signin";
export const TRY_HREF = "/auth?mode=signup";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Our Mission", href: "#mission" },
  { label: "Built For You", href: "#who" },
  { label: "Membership", href: "#pricing" },
  { label: "FAQs", href: "#faq" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="hidden h-9 w-9 place-items-center rounded-full sm:grid text-neutral-700 transition-colors hover:bg-black/[0.06] dark:text-neutral-200 dark:hover:bg-white/10"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-5">
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex w-full max-w-3xl items-center justify-between gap-2 rounded-full py-2 pl-4 pr-2 shadow-xl shadow-black/[0.07] ring-1 ring-black/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-[#141416]/70 dark:ring-white/10"
      >
        <a href="#top" className="flex items-center gap-2">
          <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-7 w-7 rounded-lg" />
          <span className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white">
            cutzioo
          </span>
        </a>
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <HoverBorderGradient
            as={Link}
            to={LOGIN_HREF}
            containerClassName="rounded-full"
            className="px-3.5 py-2 text-[14px] font-semibold sm:text-[13px]"
          >
            Log in
          </HoverBorderGradient>
          <Link
            to={TRY_HREF}
            className="rounded-full bg-neutral-900 px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:scale-[1.04] active:scale-[0.97] dark:bg-white dark:text-neutral-900 sm:text-[13px]"
          >
            <span className="sm:hidden">Try free</span>
            <span className="hidden sm:inline">Get Started</span>
          </Link>
        </div>
      </motion.nav>
    </header>
  );
}

/** Day sky: blue gradient, sun rays, clouds, rainbow streak — cream at the base. */
function SkyLight() {
  return (
    <div className="absolute inset-0 dark:hidden" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#79b2e8_0%,#a8cdf0_34%,#dcebf7_58%,#f6ead6_84%,#fbf7ee_100%)]" />
      {/* sun glow + rays top-right */}
      <div className="absolute -top-24 right-[-10%] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.95),rgba(255,244,214,0.5),transparent)] blur-md" />
      <div className="absolute -top-10 right-[-6%] h-[360px] w-[560px] rotate-[-18deg] bg-[conic-gradient(from_200deg_at_80%_20%,transparent_0deg,rgba(255,255,255,0.75)_8deg,transparent_16deg,transparent_28deg,rgba(255,236,190,0.6)_34deg,transparent_44deg,transparent_60deg,rgba(255,255,255,0.55)_66deg,transparent_76deg)] blur-sm" />
      {/* rainbow streak top-left */}
      <div className="absolute -left-24 -top-28 h-[340px] w-[340px] rounded-full bg-[conic-gradient(from_40deg,#f43f5e22,#f59e0b22,#facc1522,#34d39922,#60a5fa22,#a78bfa22,transparent_70%)] blur-xl" />
      {/* clouds */}
      <div className="absolute left-[6%] top-[46%] h-16 w-64 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute right-[4%] top-[58%] h-20 w-72 rounded-full bg-white/60 blur-2xl" />
      <div className="absolute bottom-[16%] left-[30%] h-24 w-[420px] rounded-full bg-white/70 blur-3xl" />
      {/* fade into page */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[#fbf7ee]" />
    </div>
  );
}

/** Night sky for dark mode: deep navy, moon glow, stars, faint aurora. */
function SkyDark() {
  return (
    <div className="absolute inset-0 hidden dark:block" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#04070f_0%,#0a1224_42%,#101b31_70%,#0c0c0e_100%)]" />
      <div className="absolute -top-20 right-[-8%] h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(148,190,255,0.32),transparent)] blur-2xl" />
      <div className="absolute left-[-10%] top-[-6%] h-[380px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,0.16),transparent)] blur-3xl" />
      {/* stars */}
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(1.5px_1.5px_at_12%_18%,#fff,transparent),radial-gradient(1px_1px_at_28%_42%,#fff9,transparent),radial-gradient(1.5px_1.5px_at_44%_12%,#fff,transparent),radial-gradient(1px_1px_at_60%_30%,#fff8,transparent),radial-gradient(1.5px_1.5px_at_76%_16%,#fff,transparent),radial-gradient(1px_1px_at_88%_38%,#fff7,transparent),radial-gradient(1px_1px_at_36%_64%,#fff6,transparent),radial-gradient(1px_1px_at_68%_56%,#fff6,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[#0c0c0e]" />
    </div>
  );
}

function FloatChip({
  className,
  icon,
  title,
  sub,
  delay = 0,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: [0, -9, 0], scale: 1 }}
      transition={{
        opacity: { duration: 0.5, delay: 0.7 + delay, ease: EASE },
        scale: { duration: 0.5, delay: 0.7 + delay, ease: EASE },
        y: { duration: 4.5, delay: 0.7 + delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={cn(
        "absolute z-20 hidden items-center gap-2.5 sm:flex rounded-2xl bg-white/90 px-3.5 py-2.5 text-left shadow-xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-md",
        className
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
        {icon}
      </span>
      <span>
        <span className="block text-[12px] font-bold leading-tight text-neutral-900">{title}</span>
        <span className="block text-[10px] leading-tight text-neutral-500">{sub}</span>
      </span>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yCenter = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const ySides = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} id="top" className="relative overflow-hidden">
      <SkyLight />
      <SkyDark />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
        {/* headline */}
        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="mx-auto max-w-3xl text-center text-[34px] font-bold leading-[1.06] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(30,64,120,0.35)] sm:text-6xl"
        >
          Your <Em>agenda</Em>, <Em>clients</Em> &<br className="hidden sm:block" />{" "}
          <Em>barbershop</Em> in one place
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mx-auto mt-4 max-w-md text-center text-[16px] leading-snug text-white/85 drop-shadow-[0_1px_8px_rgba(30,64,120,0.35)] sm:hidden"
        >
          Online booking, reminders and payments for barbers. First month free.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="mx-auto mt-7 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
        >
          <Link
            to={TRY_HREF}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 text-[17px] font-semibold text-white shadow-[0_16px_34px_-10px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.04] active:scale-[0.97] dark:bg-white dark:text-neutral-900 sm:h-auto sm:py-3 sm:text-[15px]"
          >
            <span className="sm:hidden">Try it free</span>
            <span className="hidden sm:inline">Start free — no card needed</span>
            <ArrowRight className="h-4 w-4 sm:hidden" />
          </Link>
          <HoverBorderGradient
            as={Link}
            to={LOGIN_HREF}
            containerClassName="rounded-full w-full sm:w-auto"
            className="h-14 sm:h-auto sm:py-3 w-full justify-center flex items-center text-[17px] sm:text-[15px] font-semibold px-6"
          >
            Log in
          </HoverBorderGradient>
        </motion.div>

        {/* phones + floating chips */}
        <motion.div style={{ opacity: fadeOut }} className="relative mt-12 sm:mt-6">
          <div className="relative mx-auto flex h-[400px] items-end justify-center sm:h-[560px]">
            <motion.div style={{ y: ySides }} className="absolute bottom-0 left-1/2 z-0 hidden sm:block">
              <div className="w-[210px] -translate-x-[165%] rotate-[-9deg] lg:-translate-x-[178%]">
                <motion.div
                  initial={{ opacity: 0, y: 90 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
                >
                  <PhoneFrame className="w-[210px]">
                    <AgendaScene />
                  </PhoneFrame>
                </motion.div>
              </div>
            </motion.div>
            <motion.div style={{ y: ySides }} className="absolute bottom-0 left-1/2 z-0 hidden sm:block">
              <div className="w-[210px] translate-x-[65%] rotate-[9deg] lg:translate-x-[78%]">
                <motion.div
                  initial={{ opacity: 0, y: 90 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
                >
                  <PhoneFrame className="w-[210px]">
                    <ExploreScene />
                  </PhoneFrame>
                </motion.div>
              </div>
            </motion.div>
            <motion.div style={{ y: yCenter }} className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 110 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.35, ease: EASE }}
              >
                <PhoneFrame className="w-[210px] sm:w-[262px]">
                  <BookingScene />
                </PhoneFrame>
              </motion.div>
            </motion.div>
          </div>

          <FloatChip
            className="left-[2%] top-[24%] sm:left-[6%] lg:left-[13%]"
            icon={<CalendarCheck className="h-4 w-4" />}
            title="New booking"
            sub="Maria · Today 14:30"
            delay={0}
          />
          <FloatChip
            className="left-[4%] top-[46%] sm:left-[10%] lg:left-[17%]"
            icon={<BellRing className="h-4 w-4" />}
            title="Reminders sent"
            sub="No more no-shows"
            delay={0.7}
          />
          <FloatChip
            className="right-[2%] top-[20%] sm:right-[6%] lg:right-[12%]"
            icon={<Wallet className="h-4 w-4" />}
            title="Payout sent"
            sub="€118 · this week"
            delay={0.4}
          />
          <FloatChip
            className="right-[3%] top-[44%] sm:right-[9%] lg:right-[16%]"
            icon={<Star className="h-4 w-4" />}
            title="4.9 rating"
            sub="230 reviews"
            delay={1.1}
          />
        </motion.div>

        {/* trusted-by + rating strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="relative flex flex-col items-center justify-between gap-3 pb-10 sm:flex-row sm:pb-14"
        >
          <div className="hidden text-center sm:block sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              Trusted by
            </p>
            <p className="mt-1.5 flex gap-4 text-[15px] font-bold tracking-tight text-neutral-700 dark:text-neutral-300">
              <span>FADE CLUB</span>
              <span>SHARP STYLE</span>
              <span>KING'S CUTS</span>
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="hidden max-w-[240px] text-[11px] leading-snug sm:block text-neutral-500 dark:text-neutral-400">
              The booking & management app for barbers, shops and everyone who cuts hair.
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5 sm:justify-end">
              <div className="flex -space-x-2">
                {["/landing/barber-portrait.jpg", "/landing/testimonial.jpg", "/landing/aud-team.jpg"].map(
                  (src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-[#141416]"
                    />
                  )
                )}
              </div>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 4.9
              </span>
              <span className="text-[11px] text-neutral-500">1.2k+ barbers</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Phone-only sticky Log in / Try it free bar, shown once the hero buttons scroll away. */
export function MobileCtaBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ y: show ? 0 : 140, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden"
      aria-hidden={!show}
    >
      <div className="flex gap-2 rounded-full bg-white/80 p-1.5 shadow-2xl shadow-black/20 ring-1 ring-black/[0.06] backdrop-blur-2xl dark:bg-[#141416]/80 dark:ring-white/10">
        <Link
          to={LOGIN_HREF}
          tabIndex={show ? 0 : -1}
          className="flex h-12 flex-1 items-center justify-center rounded-full text-[16px] font-semibold text-neutral-900 ring-1 ring-black/10 active:scale-[0.97] dark:text-white dark:ring-white/15"
        >
          Log in
        </Link>
        <Link
          to={TRY_HREF}
          tabIndex={show ? 0 : -1}
          className="flex h-12 flex-[1.4] items-center justify-center gap-1.5 rounded-full bg-neutral-900 text-[16px] font-semibold text-white active:scale-[0.97] dark:bg-white dark:text-neutral-900"
        >
          Try it free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
