import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EASE, Em, Reveal, Tag } from "./ui";

/* =============================== Audience ================================== */
const AUDIENCE = [
  {
    img: "/landing/aud-solo.jpg",
    title: "Independent",
    em: "barbers",
    desc: "Your link, your prices, your rules. Get booked without a front desk.",
  },
  {
    img: "/landing/aud-owner.jpg",
    title: "Shop",
    em: "owners",
    desc: "See every chair, every booking, every euro — from one screen.",
  },
  {
    img: "/landing/aud-mobile.jpg",
    title: "Mobile",
    em: "barbers",
    desc: "Take your kit anywhere. Clients pick the time — you pick the place.",
  },
  {
    img: "/landing/aud-team.jpg",
    title: "Shop",
    em: "teams",
    desc: "One agenda per chair. Walk-ins, waitlists and swaps, handled.",
  },
  {
    img: "/landing/aud-apprentice.jpg",
    title: "New",
    em: "barbers",
    desc: "Look pro from day one — a booking page clients actually trust.",
  },
  {
    img: "/landing/aud-clients.jpg",
    title: "Their",
    em: "clients",
    desc: "Book in two taps, get reminded, never wait in line again.",
  },
];

export function Audience() {
  return (
    <section id="who" className="bg-white py-20 dark:bg-[#0a0a0c] sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal>
          <Tag>Built for you</Tag>
        </Reveal>
        <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal delay={0.05}>
            <h2 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Who is <Em>Cutzioo</Em> for?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400 md:text-right">
              Whether you rent a chair, own the shop or just want a cut without the wait —
              Cutzioo fits.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCE.map((a, i) => (
            <Reveal key={a.title + a.em} delay={(i % 3) * 0.07}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="group overflow-hidden rounded-3xl bg-neutral-50 ring-1 ring-black/[0.04] dark:bg-[#141416] dark:ring-white/[0.07]"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={a.img}
                    alt={`${a.title} ${a.em}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 text-left">
                  <p className="text-[17px] font-bold text-neutral-900 dark:text-white">
                    {a.title} <Em className="text-neutral-400">{a.em}</Em>
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {a.desc}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== Testimonial ================================ */
const QUOTES = [
  {
    img: "/landing/testimonial.jpg",
    name: "Marco Duarte",
    role: "Owner, Fade Club · Porto",
    quote:
      "I stopped losing bookings to DMs and missed calls. My week fills itself — clients tap the link, pay the deposit and show up. Cutzioo paid for itself in the first weekend.",
  },
  {
    img: "/landing/barber-portrait.jpg",
    name: "Sofia Ramos",
    role: "Independent barber · Lisbon",
    quote:
      "I rent one chair and work alone — but my booking page looks like a full salon. Clients book while I'm mid-fade and I haven't had a no-show in two months.",
  },
];

export function Testimonial() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  return (
    <section className="bg-white pb-20 pt-4 dark:bg-[#0a0a0c] sm:pb-28">
      <div className="mx-auto max-w-4xl px-5">
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <Reveal>
            <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Real <Em className="text-neutral-400">Barbers</Em>
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl md:text-right">
              Real <Em className="text-neutral-400">Results</Em>
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative mt-10">
          <div className="flex flex-col items-center">
            {/* stacked photo cards */}
            <div className="relative h-[260px] w-[210px]">
              {QUOTES.map((t, idx) => (
                <motion.img
                  key={t.name}
                  src={t.img}
                  alt={t.name}
                  animate={{
                    rotate: idx === i ? 0 : idx < i ? -8 : 8,
                    scale: idx === i ? 1 : 0.92,
                    opacity: idx === i ? 1 : 0.55,
                    y: idx === i ? 0 : 12,
                  }}
                  transition={{ duration: 0.45, ease: EASE }}
                  style={{ zIndex: idx === i ? 2 : 1 }}
                  className="absolute inset-0 h-full w-full rounded-[28px] object-cover shadow-2xl"
                />
              ))}
              <div className="absolute -bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-center shadow-xl ring-1 ring-black/5 dark:bg-[#1c1c1f] dark:ring-white/10">
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{q.name}</p>
                <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400">{q.role}</p>
              </div>
            </div>

            <div className="relative mt-12 w-full max-w-lg text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300"
                >
                  “{q.quote}”
                </motion.p>
              </AnimatePresence>
              <div className="mt-4 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>

            {/* controls */}
            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => setI((i + QUOTES.length - 1) % QUOTES.length)}
                className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-black/10 transition hover:bg-neutral-100 dark:ring-white/15 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {QUOTES.map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      idx === i ? "w-5 bg-neutral-900 dark:bg-white" : "w-1.5 bg-neutral-300 dark:bg-neutral-600"
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => setI((i + 1) % QUOTES.length)}
                className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-black/10 transition hover:bg-neutral-100 dark:ring-white/15 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================== FAQ ==================================== */
const FAQS = [
  {
    q: "Is Cutzioo free to start?",
    a: "Yes — your first month is free, no card needed. Claim your booking link, add your services and you're live in minutes.",
  },
  {
    q: "Do my clients need to download an app?",
    a: "No. Your booking link works in any browser — clients pick a service and a time, and get automatic reminders before their slot.",
  },
  {
    q: "Can I take card payments?",
    a: "Yes. Connect Stripe and take deposits or full payment at booking — paid straight to your bank.",
  },
  {
    q: "Does it work for a whole barbershop?",
    a: "Add your team — every barber gets their own chair, agenda and bookings under one shop page. Owners see everything.",
  },
  {
    q: "What about no-shows?",
    a: "Deposits plus automatic reminders cut no-shows dramatically. A built-in waitlist helps backfill last-minute gaps.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-white pb-24 dark:bg-[#0a0a0c] sm:pb-32">
      <div className="mx-auto max-w-2xl px-5">
        <Reveal className="text-center">
          <Tag>FAQs</Tag>
        </Reveal>
        <Reveal delay={0.05} className="text-center">
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            You've got questions.
            <br />
            <Em className="text-neutral-400 dark:text-neutral-500">We've got answers.</Em>
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="text-center">
          <p className="mt-4 text-[14px] text-neutral-500 dark:text-neutral-400">
            Quick answers to help you get the most out of your shop.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <Accordion type="single" collapsible defaultValue="item-0" className="mt-10">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="border-b border-neutral-200 dark:border-white/10"
              >
                <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-neutral-800 hover:no-underline dark:text-neutral-100">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================ Footer CTA + footer ========================== */
const FOOT_LINKS = [
  { label: "How it works", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "FAQs", href: "#faq" },
];

export function FooterCta() {
  return (
    <footer className="relative overflow-hidden">
      <img
        src="/landing/footer-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c] via-black/45 to-black/80" />

      <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-24 text-center sm:pt-32">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Start <Em>your journey</Em>
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-white/70">
            Set up your shop in under two minutes — your first month is on us.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8">
            <Link
              to="/auth"
              className="inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-neutral-900 shadow-2xl transition-transform hover:scale-[1.04] active:scale-[0.97]"
            >
              Start taking bookings
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-14 font-serif text-2xl italic text-white/80 sm:text-3xl">
            Every great cut starts with a booking.
          </p>
        </Reveal>

        <nav className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] font-medium text-white/70">
          {FOOT_LINKS.map((l) =>
            l.href.startsWith("/") ? (
              <Link key={l.label} to={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="transition hover:text-white">
                {l.label}
              </a>
            )
          )}
        </nav>

        {/* giant wordmark, like the reference footer */}
        <div aria-hidden className="pointer-events-none mt-6 select-none overflow-hidden">
          <p className="text-[22vw] font-black leading-[0.85] tracking-tighter sm:text-[180px]">
            <span className="bg-gradient-to-b from-white/90 via-white/40 to-transparent bg-clip-text text-transparent">
              cut
            </span>
            <span className="bg-gradient-to-b from-rose-400 via-rose-500/50 to-transparent bg-clip-text text-transparent">
              z
            </span>
            <span className="bg-gradient-to-b from-white/90 via-white/40 to-transparent bg-clip-text text-transparent">
              ioo
            </span>
          </p>
        </div>
        <p className="pb-4 text-[11px] text-white/50">© {new Date().getFullYear()} Cutzioo</p>
      </div>
    </footer>
  );
}
