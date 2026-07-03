import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  animate,
} from "framer-motion";
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
  Clock,
  Zap,
  QrCode,
  Bell,
  Globe,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  CalendarCheck,
  Link2,
  TrendingUp,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";

const features = [
  {
    icon: Calendar,
    title: "Smart Agenda",
    desc: "Drag, drop and never double-book. Your whole day at a glance.",
    className: "md:col-span-2",
    accent: "from-blue-500/20 to-blue-600/5",
  },
  {
    icon: Users,
    title: "Client CRM",
    desc: "Every haircut, preference and birthday — remembered automatically.",
    className: "",
    accent: "from-indigo-500/20 to-indigo-600/5",
  },
  {
    icon: BarChart3,
    title: "Real Insights",
    desc: "Revenue, retention and peak hours in charts that actually help.",
    className: "",
    accent: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    icon: Smartphone,
    title: "Online Booking",
    desc: "A branded page your clients love. One link, full chairs.",
    className: "md:col-span-2",
    accent: "from-violet-500/20 to-violet-600/5",
  },
  {
    icon: Scissors,
    title: "Custom Services",
    desc: "Build your menu, set durations and prices in seconds.",
    className: "",
    accent: "from-amber-500/20 to-amber-600/5",
  },
  {
    icon: Sparkles,
    title: "Auto Reminders",
    desc: "Confirmations and reminders sent for you. Fewer no-shows.",
    className: "",
    accent: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: QrCode,
    title: "QR Flyers",
    desc: "Print a scannable code for mirrors and counters. Walk-ins book instantly.",
    className: "",
    accent: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    icon: Globe,
    title: "Branded Microsite",
    desc: "Your own mini-website with services, gallery and reviews built in.",
    className: "md:col-span-2",
    accent: "from-fuchsia-500/20 to-fuchsia-600/5",
  },
  {
    icon: MessageSquare,
    title: "Reviews Engine",
    desc: "Automatic review requests after every visit. Build your reputation on autopilot.",
    className: "md:col-span-2",
    accent: "from-yellow-500/20 to-yellow-600/5",
  },
  {
    icon: ShieldCheck,
    title: "Waitlist Recovery",
    desc: "Cancellation? The next client in line claims the slot automatically.",
    className: "",
    accent: "from-teal-500/20 to-teal-600/5",
  },
];

const howItWorks = [
  {
    icon: Link2,
    step: "01",
    title: "Claim your link",
    desc: "Pick a custom slug like cutzioo.com/book/your-shop in under a minute.",
  },
  {
    icon: Scissors,
    step: "02",
    title: "Build your menu",
    desc: "Add services, prices and durations. Set your hours and team.",
  },
  {
    icon: CalendarCheck,
    step: "03",
    title: "Share & get booked",
    desc: "Drop the link in your bio. Clients book 24/7 — synced to your agenda.",
  },
  {
    icon: TrendingUp,
    step: "04",
    title: "Watch it grow",
    desc: "Reminders cut no-shows, reviews roll in, and analytics show what works.",
  },
];

const faqs = [
  {
    q: "Is Cutzioo really free to start?",
    a: "Yes. The Starter plan is free forever — 1 stylist, a booking page and up to 50 bookings per month. No credit card required.",
  },
  {
    q: "Can my clients book without creating an account?",
    a: "Absolutely. Clients book in seconds with just a name — phone and notes are optional fields you control.",
  },
  {
    q: "Does it work for teams and multi-chair shops?",
    a: "Yes. Pro supports unlimited stylists, per-stylist schedules and services, and team performance analytics.",
  },
  {
    q: "What happens when someone cancels?",
    a: "Your waitlist kicks in automatically. The next client gets a claim link and the slot fills itself — no texting required.",
  },
  {
    q: "Can I use my own branding?",
    a: "Pro lets you customize colors, logo, email themes and even publish a branded microsite on your own subdomain.",
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
  { name: "Marco R.", role: "Owner · Lisbon", quote: "Cutzioo replaced three apps. My agenda fills itself now.", initials: "MR" },
  { name: "Sofia L.", role: "Stylist · Porto", quote: "The booking page is gorgeous. Clients tell me they love it.", initials: "SL" },
  { name: "Daniel K.", role: "Barber · Madrid", quote: "Reminders alone saved me 12 no-shows last month.", initials: "DK" },
];

const stats = [
  { value: "1,200+", label: "Barbers" },
  { value: "50K+", label: "Bookings" },
  { value: "4.9", label: "Avg rating" },
  { value: "98%", label: "Uptime" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function CountUpValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
  const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
  const suffix = value.match(/[^0-9.]*$/)?.[0] ?? "";
  const decimals = value.includes(".") ? 1 : 0;
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView || isNaN(numeric)) return;
    const controls = animate(0, numeric, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")),
    });
    return () => controls.stop();
  }, [inView, numeric, decimals]);

  if (isNaN(numeric)) return <span>{value}</span>;
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  );
}

function FloatingCard({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      className={cn("absolute z-10 hidden lg:block", className)}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
        className="rounded-2xl border border-white/[0.1] bg-[#1C1C1E]/90 backdrop-blur-xl px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const mockupScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Seo
        title="Cutzioo — Barbershop Booking & Management for Modern Barbers"
        description="Run your chair like a premium app. Publish a booking page, manage your agenda, and grow your barbershop with Cutzioo."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Cutzioo",
          url: "https://cutzioo.com/",
        }}
      />
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-[hsl(var(--rose)/0.08)] blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/cutzioo-logo.webp" alt="Cutzioo Booking" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-lg tracking-tight">Cutzioo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm">
            {[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#pricing", label: "Pricing" },
              { href: "#reviews", label: "Reviews" },
              { href: "#faq", label: "FAQ" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 border border-white/[0.08] bg-white/[0.05]">
              <Zap className="h-3 w-3 mr-1.5 text-primary" />
              Built for modern barbershops
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.08]">
              Run your chair like a{" "}
              <span
                className="bg-gradient-to-r from-primary via-rose-400 to-violet-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_5s_ease_infinite]"
                style={{ backgroundSize: "200% auto" }}
              >
                premium app
              </span>
            </h1>

            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Agenda, clients, bookings and analytics in one calm workspace.
              Less admin, more time behind the chair.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="rounded-full h-12 px-7" onClick={() => navigate("/auth")}>
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-7 border-white/10 bg-white/[0.03]" onClick={() => navigate("/find-barber")}>
                I'm a client
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["MR", "SL", "DK", "AL"].map((initials) => (
                  <Avatar key={initials} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Trusted by 1,200+ barbers</p>
              </div>
            </div>
          </motion.div>

          {/* App preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ y: mockupY, scale: mockupScale }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />

            <FloatingCard className="-top-8 -left-10" delay={0.6}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold">New booking</p>
                  <p className="text-[10px] text-muted-foreground">James M. · Fade + Beard</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="-bottom-6 -right-8" delay={0.85}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold">5-star review</p>
                  <p className="text-[10px] text-muted-foreground">"Best cut in town"</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="top-1/3 -right-14" delay={1.1}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold">+$45.00</p>
                  <p className="text-[10px] text-muted-foreground">Paid via booking</p>
                </div>
              </div>
            </FloatingCard>
            <Card className="relative border-white/[0.08] bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Cutzioo · Today</span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue", value: "$1,240", color: "text-primary" },
                    { label: "Bookings", value: "18", color: "text-foreground" },
                    { label: "Clients", value: "12", color: "text-foreground" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={cn("text-lg font-bold mt-0.5 tabular-nums", s.color)}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Today's agenda</p>
                    <Badge variant="secondary" className="text-[10px] h-5">Live</Badge>
                  </div>
                  {[
                    { time: "9:00", name: "James M.", service: "Fade + Beard", color: "bg-primary" },
                    { time: "10:30", name: "Carlos R.", service: "Classic cut", color: "bg-indigo-500" },
                    { time: "12:00", name: "Alex T.", service: "Buzz cut", color: "bg-emerald-500" },
                  ].map((apt) => (
                    <div key={apt.time} className="flex items-center gap-3">
                      <div className={cn("w-1 h-8 rounded-full shrink-0", apt.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{apt.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.service}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <motion.div
          {...fadeUp}
          className="mx-auto max-w-4xl"
        >
          <Card className="border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
            <CardContent className="py-6 px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
                      <CountUpValue value={s.value} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="max-w-2xl mb-14">
            <Badge variant="outline" className="mb-4 rounded-full border-white/10">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything your shop needs.
              <span className="text-muted-foreground"> Nothing it doesn't.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={f.className}
              >
                <Card className="h-full border-white/[0.08] bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:border-white/[0.14] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition-all duration-300 group">
                  <CardHeader>
                    <div className={cn(
                      "h-11 w-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-primary mb-1 border border-white/[0.06] group-hover:scale-110 transition-transform duration-300",
                      f.accent
                    )}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full border-white/10">How it works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Live in 4 steps</h2>
            <p className="mt-4 text-muted-foreground text-lg">From zero to fully booked — no tech skills needed.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {howItWorks.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <Card className="h-full border-white/[0.08] bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-4xl font-bold text-white/[0.07] tracking-tight tabular-nums select-none">
                        {s.step}
                      </span>
                    </div>
                    <p className="font-semibold text-base">{s.title}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-4 h-px bg-gradient-to-r from-white/20 to-transparent z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full border-white/10">Pricing</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="mt-4 text-muted-foreground text-lg">Start free. Upgrade when your chair is full.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className={cn(
                  "h-full relative overflow-hidden transition-all duration-300",
                  p.highlight
                    ? "border-primary/50 bg-gradient-to-b from-primary/10 to-card shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]"
                    : "border-white/[0.08] bg-card/60"
                )}>
                  {p.highlight && (
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}
                  <CardHeader>
                    {p.highlight && (
                      <Badge className="w-fit mb-2 rounded-full">Most popular</Badge>
                    )}
                    <CardTitle className="text-xl">{p.name}</CardTitle>
                    <CardDescription>{p.desc}</CardDescription>
                    <div className="flex items-baseline gap-1 pt-3">
                      <span className="text-5xl font-bold tracking-tight">{p.price}</span>
                      {p.suffix && <span className="text-muted-foreground">{p.suffix}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2.5 text-sm">
                          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full rounded-full h-11"
                      variant={p.highlight ? "default" : "outline"}
                      onClick={() => navigate("/auth")}
                    >
                      {p.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Badge variant="outline" className="mb-4 rounded-full border-white/10">Reviews</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Loved by barbers everywhere
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="h-full border-white/[0.08] bg-card/60 backdrop-blur-sm hover:border-white/[0.12] transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs font-semibold bg-primary/15 text-primary">
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <Badge variant="outline" className="mb-4 rounded-full border-white/10">FAQ</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Questions, answered</h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-sm px-5 data-[state=open]:border-primary/25 transition-colors"
                >
                  <AccordionTrigger className="text-left text-[15px] font-semibold hover:no-underline py-5">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 md:py-28">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl">
          <Card className="relative overflow-hidden border-white/[0.1] bg-gradient-to-br from-primary/15 via-card to-card text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to fill your chair?
              </CardTitle>
              <CardDescription className="text-base mt-3 max-w-md mx-auto">
                Join thousands of barbers who run their day with Cutzioo. Free to start, no credit card needed.
              </CardDescription>
            </CardHeader>
            <CardFooter className="relative justify-center pb-8 pt-4">
              <Button size="lg" className="rounded-full h-12 px-8" onClick={() => navigate("/auth")}>
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <img src="/cutzioo-logo.webp" alt="Cutzioo Booking" className="h-6 w-6 rounded-md" />
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
