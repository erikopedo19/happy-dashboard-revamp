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
  MapPin,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@heroui/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@heroui/react";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { ContainerTextFlip } from "@/components/aceternity/container-text-flip";
import { PinContainer } from "@/components/ui/3d-pin";
import { useIsMobile } from "@/hooks/use-mobile";

interface OrbitBarber {
  id: string;
  name: string;
  avatar_url: string | null;
  brand_color: string | null;
}

const ORBIT_FALLBACK: OrbitBarber[] = ["S", "M", "A", "D", "K", "R", "T", "V"].map((n, i) => ({
  id: `fb-${i}`,
  name: n,
  avatar_url: null,
  brand_color: ["#FF2D46", "#0A84FF", "#AF52DE", "#32ADE6"][i % 4],
}));

const Orb = ({ b }: { b: OrbitBarber }) => (
  <div
    title={b.name}
    className="h-full w-full overflow-hidden rounded-full border-2 border-white/15 bg-[#1C1C1E] shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
  >
    {b.avatar_url ? (
      <img src={b.avatar_url} alt={b.name} loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <div
        className="flex h-full w-full items-center justify-center text-[13px] font-bold text-white"
        style={{ background: b.brand_color || "#FF2D46" }}
      >
        {b.name.charAt(0)}
      </div>
    )}
  </div>
);

// Real barber avatars orbiting a "you" pin — the closest shops circle you.
function BarberOrbitVisual() {
  const isMobile = useIsMobile();
  const { data } = useQuery<OrbitBarber[]>({
    queryKey: ["landing-orbit-barbers"],
    staleTime: 300_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_public_profiles");
      if (error) return [];
      return (data || [])
        .filter((p: any) => p.avatar_url)
        .slice(0, 9)
        .map((p: any) => ({
          id: p.id,
          name: p.business_name || p.full_name || "Barber",
          avatar_url: p.avatar_url as string,
          brand_color: (p.brand_color as string) || null,
        }));
    },
  });
  const orbs = data && data.length > 0 ? data : ORBIT_FALLBACK;
  const inner = orbs.slice(0, 4);
  const outer = orbs.slice(4, 9);
  const outerR = isMobile ? 108 : 150;
  const innerR = isMobile ? 62 : 92;

  return (
    <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_44px_rgba(244,63,94,0.45)]">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">You</span>
        </div>
        <OrbitingCircles radius={innerR} duration={24} iconSize={isMobile ? 34 : 40}>
          {inner.map((b) => <Orb key={b.id} b={b} />)}
        </OrbitingCircles>
        {outer.length > 0 && (
          <OrbitingCircles radius={outerR} duration={40} reverse iconSize={isMobile ? 30 : 36}>
            {outer.map((b) => <Orb key={b.id} b={b} />)}
          </OrbitingCircles>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A0A0C] via-transparent to-transparent lg:from-card" />
    </div>
  );
}

// Real barbershops pinned on the map — each pin links to that shop's booking page.
interface PinBarber {
  id: string;
  name: string;
  booking_link: string | null;
  banner_url: string | null;
  brand_color: string | null;
  rating: number | null;
  rating_count: number | null;
  description: string | null;
}

const PIN_FALLBACK: PinBarber[] = [
  { id: "pin-1", name: "Northside Cuts", booking_link: null, banner_url: null, brand_color: "#FF2D46", rating: 4.9, rating_count: 214, description: "Fade specialist · 4 chairs" },
  { id: "pin-2", name: "Studio Fade", booking_link: null, banner_url: null, brand_color: "#0A84FF", rating: 4.8, rating_count: 167, description: "Walk-ins welcome" },
  { id: "pin-3", name: "The Corner Barber", booking_link: null, banner_url: null, brand_color: "#AF52DE", rating: 5.0, rating_count: 98, description: "Beard & hot towel" },
];

function BarberPins() {
  const { data } = useQuery<PinBarber[]>({
    queryKey: ["landing-pin-barbers"],
    staleTime: 300_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_public_profiles");
      if (error) return [];
      return (data || [])
        .filter((p: any) => p.booking_link)
        .slice(0, 3)
        .map((p: any) => ({
          id: p.id,
          name: p.business_name || p.full_name || "Barber",
          booking_link: p.booking_link as string,
          banner_url: (p.banner_url as string) || null,
          brand_color: (p.brand_color as string) || null,
          rating: p.rating ?? null,
          rating_count: p.rating_count ?? null,
          description: (p.description as string) || null,
        }));
    },
  });
  const pins = data && data.length > 0 ? data : PIN_FALLBACK;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center">
      {pins.map((b) => (
        <div key={b.id} className="h-[22rem] w-full lg:w-[24rem] flex items-center justify-center">
          <PinContainer
            title={b.booking_link ? `/${b.booking_link}` : "/find-barber"}
            href={b.booking_link ? `/book/${b.booking_link}` : "/find-barber"}
          >
            <div className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 w-[19rem] h-[18rem]">
              <h3 className="max-w-xs !pb-1 !m-0 font-bold text-base text-slate-100 truncate">
                {b.name}
              </h3>
              <div className="text-base !m-0 !p-0 font-normal">
                <span className="text-slate-500 flex items-center gap-1.5 text-sm">
                  {b.rating != null && (
                    <span className="inline-flex items-center gap-1 text-[#FFCC00] text-xs font-semibold shrink-0">
                      <Star className="h-3 w-3 fill-[#FFCC00]" />
                      {Number(b.rating).toFixed(1)}
                    </span>
                  )}
                  <span className="truncate">{b.description || "Open for bookings"}</span>
                </span>
              </div>
              <div className="relative flex-1 w-full rounded-lg mt-4 overflow-hidden">
                {b.banner_url ? (
                  <img src={b.banner_url} alt={b.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${b.brand_color || "#FF2D46"}, ${b.brand_color || "#FF2D46"}55 55%, transparent)` }}
                  />
                )}
              </div>
            </div>
          </PinContainer>
        </div>
      ))}
    </div>
  );
}

// Faded slot-rail visual for the availability card.
const AvailabilityVisual = () => (
  <div className="absolute inset-0 p-6 [mask-image:linear-gradient(to_bottom,black_45%,transparent_92%)]">
    <div className="flex flex-wrap gap-2">
      {["09:00", "09:30", "10:00", "10:30", "11:00", "12:30", "13:00", "14:30", "15:00", "16:00", "16:30", "17:00"].map((t, i) => (
        <span
          key={t}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-semibold",
            i % 3 === 0
              ? "border-white/10 text-white/25 line-through"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          )}
        >
          {t}
        </span>
      ))}
    </div>
  </div>
);

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
    price: "$9",
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
              <span className="block mt-3 sm:mt-4">
                <ContainerTextFlip
                  words={["premium app", "modern brand", "top studio", "pro tool"]}
                  interval={2600}
                  className="text-3xl sm:text-5xl lg:text-6xl rounded-2xl px-2"
                />
              </span>
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

      {/* Barbers near you — orbiting avatars bento */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Barbers near you, <span className="text-rose-500">ready when you are</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Real shops with live chairs — find the closest cut without a single phone call.
            </p>
          </motion.div>

          <BentoGrid className="auto-rows-[21rem] lg:auto-rows-[24rem]">
            <BentoCard
              name="The closest barbershops orbit you"
              className="lg:col-span-2"
              background={<BarberOrbitVisual />}
              Icon={MapPin}
              description="Live shops circle around your location — tap one, pick a slot, done."
              href="/find-barber"
              cta="Open the map"
            />
            <BentoCard
              name="Live availability"
              className="lg:col-span-1"
              background={<AvailabilityVisual />}
              Icon={Clock}
              description="Open slots update in real time — what you see is what you get."
              href="/find-barber"
              cta="See open slots"
            />
            <BentoCard
              name="Book in two taps"
              className="lg:col-span-3"
              background={
                <div className="absolute inset-0">
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-rose-500/15 blur-3xl" />
                  <Zap className="absolute right-16 top-1/2 -translate-y-1/2 h-24 w-24 text-rose-500/20 -rotate-12" />
                </div>
              }
              Icon={Zap}
              description="Pick a time, get a confirmation — no accounts, no phone tag, no waiting."
              href="/find-barber"
              cta="Book now"
            />
          </BentoGrid>

          <motion.div {...fadeUp} className="mt-14">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Pinned near you
            </p>
            <BarberPins />
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

          <Tabs defaultValue="management" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="booking">Booking</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
            </TabsList>

            <TabsContent value="management" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.slice(0, 4).map((f, i) => (
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
            </TabsContent>

            <TabsContent value="booking" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.slice(4, 8).map((f, i) => (
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
            </TabsContent>

            <TabsContent value="growth" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.slice(8).map((f, i) => (
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
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-16 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Live in 4 steps</h2>
            <p className="mt-4 text-muted-foreground">From zero to fully booked — no tech skills needed.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <Card className="h-full border-white/[0.08] bg-card/60 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-rose-500" />
                      </div>
                      <span className="text-3xl font-bold text-white/[0.07] tracking-tight tabular-nums select-none">
                        {s.step}
                      </span>
                    </div>
                    <p className="font-semibold text-base">{s.title}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="mt-4 text-muted-foreground">Start free. Upgrade when your chair is full.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    ? "border-rose-500/50 bg-gradient-to-b from-rose-500/10 to-card"
                    : "border-white/[0.08] bg-card/60"
                )}>
                  {p.highlight && (
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                  )}
                  <CardHeader>
                    {p.highlight && (
                      <Badge className="w-fit mb-2 rounded-full bg-rose-500">Most popular</Badge>
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
                          <div className="h-5 w-5 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-rose-500" />
                          </div>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full rounded-full h-11"
                      variant={p.highlight ? "solid" : "bordered"}
                      color={p.highlight ? "danger" : "default"}
                      onPress={() => navigate("/auth")}
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
      <section id="reviews" className="px-6 py-16 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Loved by barbers everywhere
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <Star key={j} className="h-4 w-4 fill-rose-500 text-rose-500" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <Avatar
                        name={t.initials}
                        className="h-9 w-9"
                      />
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
      <section id="faq" className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Questions, answered</h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-sm px-5 data-[state=open]:border-rose-500/25 transition-colors"
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
      <section className="px-6 py-16 bg-white/[0.02]">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl">
          <Card className="relative overflow-hidden border-white/[0.1] bg-gradient-to-br from-rose-500/15 via-card to-card text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--rose)/0.15),transparent_60%)]" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to fill your chair?
              </CardTitle>
              <CardDescription className="text-base mt-3 max-w-md mx-auto">
                Join thousands of barbers who run their day with Cutzioo. Free to start, no credit card needed.
              </CardDescription>
            </CardHeader>
            <CardFooter className="relative justify-center pb-8 pt-4">
              <Button size="lg" className="rounded-full h-12 px-8 bg-rose-500" onPress={() => navigate("/auth")}>
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
