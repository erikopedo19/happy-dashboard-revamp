import { Link, useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const features = [
  { icon: Calendar, title: "Smart Agenda", desc: "Drag, drop and never double-book. Your day at a glance." },
  { icon: Users, title: "Client CRM", desc: "Remember every haircut, preference and birthday automatically." },
  { icon: Scissors, title: "Custom Services", desc: "Build your menu, set durations and prices in seconds." },
  { icon: BarChart3, title: "Real Insights", desc: "Revenue, retention and busiest hours in clear charts." },
  { icon: Smartphone, title: "Online Booking", desc: "A branded booking page. Share one link, fill your chair." },
  { icon: Sparkles, title: "Reminders & Email", desc: "Confirmations and reminders sent automatically." },
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
  { name: "Marco R.", role: "Owner · Lisbon", quote: "Cutzioo replaced three apps. My agenda fills itself now." },
  { name: "Sofia L.", role: "Stylist · Porto", quote: "The booking page is gorgeous. Clients tell me they love it." },
  { name: "Daniel K.", role: "Barber · Madrid", quote: "Reminders alone saved me 12 no-shows last month." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-7 w-7 rounded-md" />
            <span className="font-semibold">Cutzioo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition">Reviews</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button size="sm" onClick={() => navigate("/auth")}>Get started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            Smart reminders &amp; email templates
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            The booking platform built for barbers
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
            Agenda, clients, bookings and analytics in one calm workspace.
            Faster workflows, zero visual noise.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/find-barber")}>
              I'm a client
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
            <span className="ml-2">Loved by 1,200+ barbers</span>
          </div>
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything your shop needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Nothing it doesn't. Six tools, one dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Upgrade when your chair is full.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <Card key={p.name} className={p.highlight ? "border-primary shadow-md" : ""}>
                <CardHeader>
                  {p.highlight && <Badge className="w-fit mb-2">Most popular</Badge>}
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.desc}</CardDescription>
                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-4xl font-bold">{p.price}</span>
                    {p.suffix && <span className="text-muted-foreground">{p.suffix}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={p.highlight ? "default" : "outline"} onClick={() => navigate("/auth")}>
                    {p.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Testimonials */}
      <section id="testimonials" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
            Loved by barbers everywhere
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <Card className="mx-auto max-w-2xl text-center">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl">Ready to fill your chair?</CardTitle>
            <CardDescription className="text-base">
              Join the barbers running their day with Cutzioo.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pb-6">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/cutzioo-logo.webp" alt="Cutzioo" className="h-5 w-5 rounded" />
            <span>© {new Date().getFullYear()} Cutzioo</span>
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
