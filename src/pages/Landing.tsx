import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, Globe, Bell, MapPin, CreditCard, ChevronRight } from "lucide-react";
import { Seo } from "@/components/Seo";

const features = [
  { icon: Calendar, title: "Smart agenda", text: "Drag, swap and manage every booking.", tint: "bg-[hsl(211_100%_52%)]" },
  { icon: Globe, title: "Booking link", text: "Clients book you in two taps.", tint: "bg-primary" },
  { icon: Users, title: "Clients", text: "History, notes and reminders.", tint: "bg-[hsl(135_64%_50%)]" },
  { icon: Bell, title: "Notifications", text: "Instant alerts for new bookings.", tint: "bg-[hsl(35_100%_52%)]" },
  { icon: MapPin, title: "On the map", text: "Get found by clients nearby.", tint: "bg-[hsl(280_68%_60%)]" },
  { icon: CreditCard, title: "Card payments", text: "Get paid straight to your bank.", tint: "bg-[hsl(195_85%_50%)]" },
];

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Cutzioo — Barbershop Booking & Management for Modern Barbers"
        description="Run your chair like a premium app. Publish a booking page, manage your agenda, and grow your barbershop with Cutzioo."
        path="/"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", name: "Cutzioo", url: "https://cutzioo.com/" }}
      />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/cutzioo-logo.webp" alt="" className="h-7 w-7 rounded-lg" />
            Cutzioo
          </Link>
          <Link to="/auth" className="text-sm font-medium text-primary">Sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="pt-20 pb-16 text-center">
          <motion.img {...fade()} src="/cutzioo-logo.webp" alt="Cutzioo" className="mx-auto mb-8 h-20 w-20 rounded-[22px] shadow-2xl" />
          <motion.h1 {...fade(0.05)} className="text-[40px] font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Your barbershop.<br /><span className="text-muted-foreground">Beautifully simple.</span>
          </motion.h1>
          <motion.p {...fade(0.1)} className="mx-auto mt-5 max-w-md text-[17px] text-muted-foreground">
            Agenda, clients and online bookings — in one app that feels like it belongs on your iPhone.
          </motion.p>
          <motion.div {...fade(0.15)} className="mx-auto mt-9 flex max-w-xs flex-col gap-3">
            <Link to="/auth" className="flex h-[52px] items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform">
              Start free
            </Link>
            <Link to="/find-barber" className="flex h-[52px] items-center justify-center rounded-2xl bg-secondary text-[17px] font-semibold text-secondary-foreground active:scale-[0.98] transition-transform">
              Find a barber
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">First month free · No card needed</p>
        </section>

        <section className="pb-16">
          <motion.h2 {...fade()} className="mb-3 px-4 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">Everything you need</motion.h2>
          <motion.div {...fade(0.05)} className="overflow-hidden rounded-2xl bg-card">
            {features.map((f, i) => (
              <div key={f.title} className="flex items-center gap-3.5 px-4 py-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${f.tint}`}>
                  <f.icon className="h-[18px] w-[18px] text-primary-foreground" />
                </div>
                <div className={`flex flex-1 items-center gap-2 py-0.5 ${i ? "" : ""}`}>
                  <div className="flex-1">
                    <p className="text-[16px] font-medium">{f.title}</p>
                    <p className="text-[13px] text-muted-foreground">{f.text}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="pb-20 text-center">
          <motion.div {...fade()} className="rounded-3xl bg-card px-6 py-12">
            <h2 className="text-3xl font-bold tracking-tight">Ready when you are.</h2>
            <p className="mt-3 text-muted-foreground">Set up your shop in under two minutes.</p>
            <Link to="/auth" className="mx-auto mt-7 flex h-[52px] max-w-xs items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground">
              Get started
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        <div className="flex justify-center gap-5">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Cutzioo</p>
      </footer>
    </div>
  );
}
