import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Scissors,
  Users,
  BarChart3,
  Smartphone,
  Sparkles,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import Aurora from "@/components/Aurora";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Calendar,
    title: "Smart Agenda",
    desc: "Drag, drop and never double-book. Your day at a glance, synced everywhere.",
  },
  {
    icon: Users,
    title: "Client CRM",
    desc: "Remember every haircut, every preference, every birthday — automatically.",
  },
  {
    icon: Scissors,
    title: "Custom Services",
    desc: "Build your menu, set durations, prices and let clients book in seconds.",
  },
  {
    icon: BarChart3,
    title: "Real Insights",
    desc: "Revenue, retention and busiest hours — beautiful charts that actually help.",
  },
  {
    icon: Smartphone,
    title: "Online Booking",
    desc: "A branded booking page your clients will love. Share one link, fill your chair.",
  },
  {
    icon: Sparkles,
    title: "Reminders & Email",
    desc: "Confirmations and reminders sent automatically. No more no-shows.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    desc: "For solo barbers getting started.",
    features: ["1 stylist", "Online booking page", "Up to 50 bookings / mo", "Email reminders"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    suffix: "/mo",
    desc: "For busy chairs and growing shops.",
    features: ["Unlimited stylists", "Unlimited bookings", "Advanced analytics", "Custom branding", "Priority support"],
    cta: "Go Pro",
    highlight: true,
  },
];

const testimonials = [
  {
    name: "Marco R.",
    role: "Owner · Lisbon",
    quote: "Cutzioo replaced three apps. My agenda fills itself now.",
  },
  {
    name: "Sofia L.",
    role: "Stylist · Porto",
    quote: "The booking page is gorgeous. Clients tell me they love it.",
  },
  {
    name: "Daniel K.",
    role: "Barber · Madrid",
    quote: "Reminders alone saved me 12 no-shows last month. Worth every cent.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <Aurora
          colorStops={["#0f172a", "#1f2937", "#334155"]}
          blend={0.32}
          amplitude={0.55}
          speed={0.5}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/75 to-background" />

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/65 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold tracking-tight text-lg">Cutzioo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm text-muted-foreground">
            <a href="#features" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-foreground transition">Features</a>
            <a href="#pricing" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-foreground transition">Pricing</a>
            <a href="#testimonials" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-foreground transition">Loved by</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90" onClick={() => navigate("/auth")}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-32 md:pt-32 md:pb-44">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New · Smart no-show reminders &amp; email templates
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]"
          >
            The booking platform <br className="hidden md:block" />
            built like{" "}
            <span className="bg-gradient-to-r from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
              a premium app.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 mx-auto max-w-2xl text-base md:text-lg text-muted-foreground"
          >
            A dark, calm workspace for agenda, clients, bookings and analytics.
            Faster workflows, softer corners, zero visual noise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center"
          >
            <Button size="lg" className="rounded-full bg-white px-8 h-12 text-black hover:bg-white/90" onClick={() => navigate("/auth")}>
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full px-8 h-12"
              onClick={() => navigate("/find-barber")}
            >
              I'm a client
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 flex items-center justify-center gap-1 text-sm text-muted-foreground"
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-white text-white" />
            ))}
            <span className="ml-2">Loved by 1,200+ barbers</span>
          </motion.div>

          {/* Hero brand image */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.85 }}
            className="mt-16 mx-auto max-w-2xl"
          >
            <div className="rounded-[36px] overflow-hidden border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
              <img src="/Frame 316.png" alt="Cutzioo" className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Everything your shop needs.
              <span className="text-muted-foreground"> Nothing it doesn't.</span>
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-md p-6 hover:bg-white/[0.075] transition-all"
              >
                <div className="h-11 w-11 rounded-[18px] bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md p-8 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-25">
            <Aurora colorStops={["#334155", "#111827", "#020617"]} blend={0.4} amplitude={0.45} speed={0.35} />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Your chair, on autopilot.
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-muted-foreground">
            From the first tap to the last clip — Cutzioo handles the boring stuff so
            you can focus on the craft.
          </p>
          <Button size="lg" className="mt-8 rounded-full bg-white px-8 h-12 text-black hover:bg-white/90" onClick={() => navigate("/auth")}>
            Try it free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Simple pricing.</h2>
            <p className="mt-4 text-muted-foreground">Start free. Upgrade when your chair is full.</p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl border p-8 backdrop-blur-md transition-all ${
                  p.highlight
                    ? "border-white/20 bg-gradient-to-br from-white/[0.09] to-transparent"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium text-black">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
                  {p.suffix && <span className="text-muted-foreground">{p.suffix}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full rounded-full"
                  variant={p.highlight ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-center">
            Loved by barbers everywhere.
          </h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-white text-white" />
                  ))}
                </div>
                <p className="text-foreground/90 leading-relaxed">"{t.quote}"</p>
                <div className="mt-6">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl md:text-6xl font-semibold tracking-tight">
            Ready to fill your chair?
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Join the barbers running their day with Cutzioo.
          </p>
          <Button size="lg" className="mt-10 rounded-full bg-white px-10 h-14 text-base text-black hover:bg-white/90" onClick={() => navigate("/auth")}>
            Start free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-6 w-6 rounded-md" />
            <span>© {new Date().getFullYear()} Cutzioo. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://cutzioo.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">
              cutzioo.com
            </a>
            <Link to="/auth" className="hover:text-foreground transition">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
