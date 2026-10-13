import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Crown,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE, Em, Reveal, Tag } from "./ui";

type PlanKey = "monthly" | "yearly";

const PLANS: Record<PlanKey, { price: string; per: string; note: string }> = {
  monthly: { price: "€8.99", per: "/ month", note: "billed every month" },
  yearly: { price: "€7.49", per: "/ month", note: "€89.90 billed once a year" },
};

const PERKS = [
  { icon: CalendarClock, label: "Unlimited bookings & clients" },
  { icon: Users, label: "Team members & stylists" },
  { icon: MapPin, label: "Map listing: get found" },
  { icon: ShieldCheck, label: "No-show protection & deposits" },
];

/** Apple-style 3D tilt that follows the pointer. */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 180, damping: 22 });
  const shineX = useTransform(mx, [0, 1], ["20%", "80%"]);
  const shine = useTransform(
    shineX,
    (x) => `radial-gradient(340px circle at ${x} 0%, rgba(255,255,255,0.14), transparent 70%)`
  );

  return (
    <div style={{ perspective: 1200 }} className={className}>
      <motion.div
        ref={ref}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onMouseLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        className="group relative overflow-hidden rounded-[32px] bg-[#111114] p-8 text-left shadow-[0_40px_80px_-24px_rgba(0,0,0,0.5)] ring-1 ring-white/10 sm:p-10"
      >
        {/* ambient glow + orbit ring, like the in-app paywall pass */}
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-500/25 blur-3xl" />
        <div aria-hidden className="absolute -left-20 bottom-[-30%] h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div
          aria-hidden
          className="absolute right-[-60px] top-[-60px] h-56 w-56 rounded-full border border-white/15"
        />
        <div
          aria-hidden
          className="absolute right-[-30px] top-[-30px] h-32 w-32 rounded-full border border-rose-400/30"
        />
        {/* pointer shine */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: shine }}
        />
        {children}
      </motion.div>
    </div>
  );
}

export function Membership() {
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const p = PLANS[plan];

  return (
    <section id="pricing" className="bg-[#fbf7ee] py-20 dark:bg-[#0c0c0e] sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal className="text-center">
          <Tag>Membership</Tag>
        </Reveal>
        <Reveal delay={0.05} className="text-center">
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            One membership.
            <br />
            <Em className="text-neutral-400 dark:text-neutral-500">Everything unlocked.</Em>
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="text-center">
          <p className="mx-auto mt-4 max-w-md text-[15px] text-neutral-500 dark:text-neutral-400">
            Start with 7 days free. Keep your book full for less than the price of one cut a month.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* left: perks */}
          <div className="order-2 text-left lg:order-1">
            <Reveal delay={0.15}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Included with Pro
              </p>
              <ul className="mt-4 space-y-3">
                {PERKS.map((perk, i) => (
                  <motion.li
                    key={perk.label}
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: EASE }}
                    className="flex items-center gap-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-rose-500 shadow-sm ring-1 ring-black/[0.05] dark:bg-[#1a1a1d] dark:ring-white/10">
                      <perk.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
                      {perk.label}
                    </span>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <strong className="text-neutral-800 dark:text-neutral-200">4.8</strong>
                from barbers on Cutzioo
              </div>
            </Reveal>
          </div>

          {/* right: the Pro pass card */}
          <Reveal delay={0.1} className="order-1 lg:order-2">
            <TiltCard>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    <Crown className="h-4 w-4 text-rose-400" />
                    Cutzioo Pro
                  </span>
                  <AnimatePresence>
                    {plan === "yearly" && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="rounded-full bg-rose-500 px-2.5 py-1 text-[10.5px] font-bold text-white"
                      >
                        Best value
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <p className="mt-6 text-xl font-bold text-white">
                  Made for your <Em className="text-white/80">next chapter.</Em>
                </p>

                {/* segmented control */}
                <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/[0.07] p-1 ring-1 ring-white/10">
                  {(["monthly", "yearly"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPlan(k)}
                      className={cn(
                        "relative rounded-xl py-2 text-[13px] font-semibold transition-colors",
                        plan === k ? "text-white" : "text-white/50 hover:text-white/80"
                      )}
                    >
                      {plan === k && (
                        <motion.span
                          layoutId="plan-pill"
                          className="absolute inset-0 rounded-xl bg-white/[0.14] ring-1 ring-white/20"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative capitalize">{k}</span>
                    </button>
                  ))}
                </div>

                {/* animated price */}
                <div className="mt-6 flex items-end gap-2">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={p.price}
                      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="text-5xl font-bold tracking-tight text-white"
                    >
                      {p.price}
                    </motion.span>
                  </AnimatePresence>
                  <span className="pb-1.5 text-[14px] text-white/60">{p.per}</span>
                </div>
                <p className="mt-1 h-5 text-[12.5px] text-white/50">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={p.note}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {p.note}
                    </motion.span>
                  </AnimatePresence>
                </p>

                <Link
                  to="/pricing"
                  className="mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-semibold text-neutral-900 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-3 text-center text-[11.5px] text-white/40">
                  7 days free · Secure payment by Stripe · cancel anytime
                </p>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
