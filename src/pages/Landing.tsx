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
import { Button } from "@heroui/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@heroui/react";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";

const features = [
  {
    icon: Calendar,
    title: "Smart Agenda",
    desc: "Drag, drop and never double-book. Your whole day at a glance.",
    className: "md:col-span-2",
    accent: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: Users,
    title: "Client CRM",
    desc: "Every haircut, preference and birthday — remembered automatically.",
    className: "",
    accent: "from-blue-500/20 to-blue-600/5",
  },
  {
    icon: BarChart3,
    title: "Real Insights",
    desc: "Revenue, retention and peak hours in charts that actually help.",
    className: "",
    accent: "from-purple-500/20 to-purple-600/5",
  },
  {
    icon: Smartphone,
    title: "Online Booking",
    desc: "A branded page your clients love. One link, full chairs.",
    className: "md:col-span-2",
    accent: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    icon: Scissors,
    title: "Custom Services",
    desc: "Build your menu, set durations and prices in seconds.",
    className: "",
    accent: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: Sparkles,
    title: "Auto Reminders",
    desc: "Confirmations and reminders sent for you. Fewer no-shows.",
    className: "",
    accent: "from-blue-500/20 to-blue-600/5",
  },
  {
    icon: QrCode,
    title: "QR Flyers",
    desc: "Print a scannable code for mirrors and counters. Walk-ins book instantly.",
    className: "",
    accent: "from-purple-500/20 to-purple-600/5",
  },
  {
    icon: Globe,
    title: "Branded Microsite",
    desc: "Your own mini-website with services, gallery and reviews built in.",
    className: "md:col-span-2",
    accent: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    icon: MessageSquare,
    title: "Reviews Engine",
    desc: "Automatic review requests after every visit. Build your reputation on autopilot.",
    className: "md:col-span-2",
    accent: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: ShieldCheck,
    title: "Waitlist Recovery",
    desc: "Cancellation? The next client in line claims the slot automatically.",
    className: "",
    accent: "from-blue-500/20 to-blue-600/5",
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
            <Button variant="light" size="sm" onPress={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button size="sm" className="rounded-full" onPress={() => navigate("/auth")}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="px-6 pt-20 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Run your barbershop like a{" "}
              <span className="text-rose-500">premium app</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Smart agenda, client management, and online bookings in one simple workspace.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="rounded-full h-12 px-8 bg-rose-500" onPress={() => navigate("/auth")}>
                Start free
              </Button>
              <Button size="lg" variant="bordered" className="rounded-full h-12 px-8 border-white/10 bg-white/[0.03]" onPress={() => navigate("/find-barber")}>
                Find a barber
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything your shop needs
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card className="h-full border-white/[0.08] bg-card/60 backdrop-blur-sm hover:border-white/[0.14] transition-all duration-300">
                  <CardHeader>
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center mb-2",
                      f.accent
                    )}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
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
