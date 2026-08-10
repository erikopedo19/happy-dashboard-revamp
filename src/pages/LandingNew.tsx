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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function LandingNew() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const handleMainCTA = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Cutzioo | Barber Booking Software"
        description="Cutzioo gives barbers a single place for booking links, customizable forms, agenda management, and automatic email confirmations."
      />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-background/50">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-500/5 via-background to-background" />
        
        <div className="container relative z-10 px-4 py-20 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Badge className="px-4 py-1.5 text-sm font-medium bg-rose-500/10 text-rose-500 border-rose-500/20">
                ✨ The all-in-one barber platform
              </Badge>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70"
            >
              Book More. Stress Less.
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Cutzioo gives barbers a single place for booking links, customizable forms, agenda management, and automatic email confirmations.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                className="px-8 py-6 text-lg bg-gradient-to-r from-rose-500 to-blue-500 hover:from-rose-600 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-rose-500/25"
                onClick={handleMainCTA}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-white/10 hover:bg-white/5 rounded-full"
                asChild
              >
                <Link to="/find-barber">
                  Find a Barber
                </Link>
              </Button>
            </motion.div>
            
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    <CountUpValue value={stat.value} />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <FloatingCard className="top-1/4 left-[10%]" delay={0.5}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">New Booking</div>
              <div className="text-xs text-muted-foreground">Just now</div>
            </div>
          </div>
        </FloatingCard>
        
        <FloatingCard className="top-1/3 right-[10%]" delay={1}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Today's Agenda</div>
              <div className="text-xs text-muted-foreground">12 appointments</div>
            </div>
          </div>
        </FloatingCard>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From booking to billing, Cutzioo handles it all so you can focus on what you do best.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ delay: index * 0.1 }}
                className={cn("relative", feature.className)}
              >
                <Card className={`h-full bg-gradient-to-br ${feature.accent} border-white/10 hover:border-white/20 transition-all duration-300`}>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.desc}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes, not hours
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                {...fadeUp}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-white/10 mb-4">{step.step}</div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500 to-blue-500 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by barbers everywhere</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of barbers who've transformed their business
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                {...fadeUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-12 h-12 bg-gradient-to-br from-rose-500 to-blue-500">
                        <span className="text-white font-semibold">{testimonial.initials}</span>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground">"{testimonial.quote}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you're ready
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative ${plan.highlight ? 'border-rose-500/50 bg-gradient-to-br from-rose-500/10 to-blue-500/10' : 'bg-white/5 border-white/10'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-rose-500 to-blue-500 text-white px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.suffix && <span className="text-muted-foreground ml-1">{plan.suffix}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full ${plan.highlight ? 'bg-gradient-to-r from-rose-500 to-blue-500 hover:from-rose-600 hover:to-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                      size="lg"
                      onClick={handleMainCTA}
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently asked questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know
            </p>
          </motion.div>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-white/10">
                <AccordionTrigger className="text-left hover:text-white">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-background/50">
        <div className="container mx-auto">
          <motion.div
            {...fadeUp}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to grow your business?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of barbers who've already transformed their booking experience
            </p>
            <Button
              size="lg"
              className="px-8 py-6 text-lg bg-gradient-to-r from-rose-500 to-blue-500 hover:from-rose-600 hover:to-blue-600 text-white font-semibold rounded-full shadow-lg shadow-rose-500/25"
              onClick={handleMainCTA}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-blue-500">
              Cutzioo
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <a href="mailto:support@cutzioo.com" className="hover:text-white transition-colors">Support</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Cutzioo. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}