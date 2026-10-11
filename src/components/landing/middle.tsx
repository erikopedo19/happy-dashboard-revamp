import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  CreditCard,
  Globe,
  LineChart,
  MapPin,
  MessageSquare,
  Palette,
  Scissors,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE, Em, PillButton, Reveal, Tag } from "./ui";
import { AgendaScene, BookingScene, ExploreScene, PhoneFrame } from "./phones";

/* ============================ Features band ================================ */
const CHIP_ICONS = [
  { icon: Calendar, label: "Smart agenda" },
  { icon: Globe, label: "Booking link" },
  { icon: Bell, label: "Reminders" },
  { icon: CreditCard, label: "Card payments" },
  { icon: Users, label: "Client notes" },
  { icon: MapPin, label: "Map discovery" },
  { icon: Star, label: "Reviews" },
  { icon: MessageSquare, label: "Waitlist" },
  { icon: ShieldCheck, label: "No-show protection" },
  { icon: LineChart, label: "Analytics" },
  { icon: Wallet, label: "Payouts" },
  { icon: Palette, label: "Your branding" },
];

const FAINT_WORDS = [
  "skin fade · taper · beard trim · hot towel · line up · buzz cut · ",
  "agenda · walk-ins · deposits · reminders · payouts · rebook · ",
  "fade · scissor cut · kids cut · shave · styling · color · ",
  "booking link · reviews · clients · staff · chairs · brand · ",
  "no-shows ↓ · waitlist · calendar sync · stripe · map · ",
];

function Chip({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <span className="mx-1.5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-neutral-800 shadow-sm ring-1 ring-black/[0.05] dark:bg-[#1a1a1d] dark:text-neutral-200 dark:ring-white/10">
      <Icon className="h-3.5 w-3.5 text-rose-500" />
      {label}
    </span>
  );
}

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const items = [...CHIP_ICONS, ...CHIP_ICONS];
  return (
    <div
      className="flex w-max"
      style={{
        animation: `marquee-x ${reverse ? "46s" : "38s"} linear infinite${reverse ? " reverse" : ""}`,
      }}
    >
      {items.map((c, i) => (
        <Chip key={i} icon={c.icon} label={c.label} />
      ))}
    </div>
  );
}

export function FeaturesBand() {
  return (
    <section id="features" className="relative overflow-hidden bg-[#fbf7ee] py-20 dark:bg-[#0c0c0e] sm:py-28">
      {/* faint barber-vocabulary backdrop, like the reference's multilingual text */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[36%] bottom-[8%] select-none overflow-hidden">
        {FAINT_WORDS.map((w, i) => (
          <p
            key={i}
            className="whitespace-nowrap text-center text-[15px] font-medium leading-[2.1] text-neutral-400/40 dark:text-neutral-600/40"
          >
            {(w + w).slice(0, 90)}
          </p>
        ))}
      </div>

      <div className="relative mx-auto max-w-5xl px-5 text-center">
        <Reveal>
          <Tag>Everything in one app</Tag>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            One app.
            <br />
            <Em className="text-neutral-400 dark:text-neutral-500">Every chair filled.</Em>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Agenda, clients, payments and your own booking page — the tools that used to
            cost a front desk, now in your pocket.
          </p>
        </Reveal>

        {/* tilted photo cards + frosted logo card */}
        <Reveal delay={0.15} className="relative mx-auto mt-12 h-[220px] max-w-xl sm:h-[260px]">
          <motion.img
            src="/landing/barber-portrait.jpg"
            alt="A barber in his shop"
            whileHover={{ rotate: -3, scale: 1.03 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute left-[8%] top-0 h-full w-[46%] rotate-[-7deg] rounded-3xl object-cover shadow-2xl"
          />
          <motion.img
            src="/landing/shop-interior.jpg"
            alt="Inside a barbershop"
            whileHover={{ rotate: 3, scale: 1.03 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute right-[8%] top-0 h-full w-[46%] rotate-[7deg] rounded-3xl object-cover shadow-2xl"
          />
          <div className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[26px] bg-white/60 shadow-xl ring-1 ring-white/60 backdrop-blur-xl dark:bg-white/10 dark:ring-white/20 sm:h-28 sm:w-28">
            <div className="text-center">
              <img src="/cutzioo-logo.webp" alt="" className="mx-auto h-10 w-10 rounded-xl" />
              <p className="mt-1 text-[11px] font-bold tracking-tight text-neutral-800 dark:text-white">
                cutzioo
              </p>
            </div>
          </div>
        </Reveal>

        {/* feature chips marquee */}
        <Reveal delay={0.1} className="relative mt-14 space-y-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#fbf7ee] to-transparent dark:from-[#0c0c0e]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#fbf7ee] to-transparent dark:from-[#0c0c0e]" />
          <div className="overflow-hidden">
            <MarqueeRow />
          </div>
          <div className="overflow-hidden">
            <MarqueeRow reverse />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <PillButton href="/auth">Explore the app</PillButton>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================ Mission ================================== */
export function Mission() {
  return (
    <section id="mission" className="bg-white py-20 dark:bg-[#0a0a0c] sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal>
          <Tag>Our Mission</Tag>
        </Reveal>
        <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal delay={0.05}>
            <h2 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Why we <Em>built Cutzioo</Em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400 md:text-right">
              Barbers run on skill and reputation — but the software was built for salons
              and spreadsheets. Cutzioo changes that.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {/* tall photo card */}
          <Reveal className="md:row-span-2">
            <div className="group relative h-full min-h-[380px] overflow-hidden rounded-3xl">
              <img
                src="/landing/barber-hands.jpg"
                alt="Barber trimming a fade"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 p-6 text-left">
                <p className="text-xl font-bold text-white">
                  Master <Em>your craft</Em>
                </p>
                <p className="mt-1 max-w-[240px] text-[13px] text-white/75">
                  Less admin, more cutting. Your book fills itself while you focus on the fade.
                </p>
              </div>
            </div>
          </Reveal>

          {/* card: booked while you cut */}
          <Reveal delay={0.05}>
            <div className="rounded-3xl bg-neutral-50 p-6 text-left ring-1 ring-black/[0.04] dark:bg-[#141416] dark:ring-white/[0.06]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500 text-white">
                <Globe className="h-5 w-5" />
              </span>
              <p className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">
                Booked <Em>while you cut</Em>
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your link works in any browser — clients book, pay and get reminded. No DMs, no phone tag.
              </p>
            </div>
          </Reveal>

          {/* card: brand */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-neutral-50 p-6 text-left ring-1 ring-black/[0.04] dark:bg-[#141416] dark:ring-white/[0.06]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <Palette className="h-5 w-5" />
              </span>
              <p className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">
                Your brand, <Em>front and center</Em>
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your colors, your services, your page — clients book you, not a marketplace.
              </p>
            </div>
          </Reveal>

          {/* wide card: built for barbers */}
          <Reveal delay={0.15} className="md:col-span-2">
            <div className="relative overflow-hidden rounded-3xl bg-neutral-900 p-6 text-left dark:bg-[#141416] dark:ring-1 dark:ring-white/[0.06]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,rgba(255,255,255,0.9)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:radial-gradient(60%_90%_at_70%_50%,black,transparent)]"
              />
              <div className="relative">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500 text-white">
                  <Scissors className="h-5 w-5" />
                </span>
                <p className="mt-4 text-lg font-bold text-white">
                  Built for barbers, <Em className="text-white/80">finally</Em>
                </p>
                <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-white/60">
                  Walk-ins, waitlists, chair swaps, no-show protection — shaped around how a
                  shop actually runs, not how a salon chain does.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ==================== How it works + feature trio ========================== */
const STEPS = [
  {
    n: "01",
    title: "Claim your link",
    em: "in two minutes",
    desc: "Add your services, prices and photos. Your booking page goes live instantly.",
    scene: <BookingScene />,
  },
  {
    n: "02",
    title: "Clients book",
    em: "themselves",
    desc: "They pick a service and a time — deposits and reminders are handled for you.",
    scene: <AgendaScene />,
  },
  {
    n: "03",
    title: "Get found",
    em: "& get paid",
    desc: "Show up on the map, collect reviews and get paid straight to your bank.",
    scene: <ExploreScene />,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#fbf7ee] py-20 dark:bg-[#0c0c0e] sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal className="text-center">
          <Tag>How it works</Tag>
        </Reveal>
        <Reveal delay={0.05} className="text-center">
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            Your simplest path to <br className="hidden sm:block" />
            <Em className="text-neutral-400 dark:text-neutral-500">a full book.</Em>
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="text-center">
          <p className="mx-auto mt-4 max-w-md text-[15px] text-neutral-500 dark:text-neutral-400">
            From sign-up to a full agenda in one afternoon — no setup calls, no training.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="group overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.05] transition-shadow hover:shadow-xl dark:bg-[#141416] dark:ring-white/[0.07]">
                <div className="relative flex h-[240px] items-end justify-center overflow-hidden bg-gradient-to-b from-[#eef3f8] to-[#dde7f0] dark:from-[#151a26] dark:to-[#0f1420]">
                  <span className="absolute left-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-neutral-700 backdrop-blur dark:bg-white/10 dark:text-neutral-300">
                    {s.n}
                  </span>
                  <div className="translate-y-6 scale-[0.62] transition-transform duration-500 group-hover:translate-y-4">
                    <PhoneFrame className="w-[200px] pointer-events-none">
                      {s.scene}
                    </PhoneFrame>
                  </div>
                </div>
                <div className="p-5 text-left">
                  <p className="text-[17px] font-bold text-neutral-900 dark:text-white">
                    {s.title} <Em className="text-neutral-400">{s.em}</Em>
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {s.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
