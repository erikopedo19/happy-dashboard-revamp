import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MicrositeEditorPanel } from "@/pages/MicrositeEditor";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe,
  Share2,
  QrCode,
  Link2,
  LayoutTemplate,
  Scissors,
  CalendarCheck,
  Printer,
  Wifi,
  BatteryFull,
  Signal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const springSoft = { type: "spring" as const, stiffness: 350, damping: 32 };

const TABS = [
  { value: "link", label: "Booking Link", icon: Link2 },
  { value: "site", label: "Microsite", icon: LayoutTemplate },
] as const;

const StatTile = ({
  icon: Icon,
  label,
  value,
  tint,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string;
  tint: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, ...springSoft }}
    whileTap={{ scale: 0.97 }}
    className="rounded-[16px] bg-[#15151A] border border-white/[0.08] p-4"
  >
    <div
      className="w-9 h-9 rounded-[12px] flex items-center justify-center mb-3"
      style={{ backgroundColor: `${tint}22` }}
    >
      <Icon className="w-4 h-4" strokeWidth={2.3} style={{ color: tint }} />
    </div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">{label}</p>
    <p className="text-[15px] font-bold text-white mt-1 tracking-tight">{value}</p>
  </motion.div>
);

function PhonePreview({ slug, name }: { slug: string | null; name: string | null }) {
  const displaySlug = slug || "your-shop";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, ...springSoft }}
      className="relative mx-auto w-[250px]"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-[38px] border border-white/[0.12] bg-[#0A0A0C] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="rounded-[30px] overflow-hidden bg-[#111114] border border-white/[0.06]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <span className="text-[10px] font-semibold text-white tabular-nums">9:41</span>
            <div className="flex items-center gap-1 text-white">
              <Signal className="w-2.5 h-2.5" />
              <Wifi className="w-2.5 h-2.5" />
              <BatteryFull className="w-3 h-3" />
            </div>
          </div>
          {/* URL pill */}
          <div className="mx-4 mt-1 mb-3 h-7 rounded-full bg-white/[0.07] border border-white/[0.06] flex items-center justify-center px-3">
            <span className="text-[9px] text-[#8E8E93] font-mono truncate">
              cutzioo.com/book/{displaySlug}
            </span>
          </div>
          {/* Booking page preview */}
          <div className="px-4 pb-5 space-y-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#FF2D6F] to-[#5E5CE6] flex items-center justify-center shadow-[0_8px_24px_rgba(255,45,111,0.4)]">
                <Scissors className="w-5 h-5 text-white" strokeWidth={2.3} />
              </div>
              <p className="text-[13px] font-bold text-white mt-2 tracking-tight">
                {name || "Your Shop"}
              </p>
              <p className="text-[9px] text-[#8E8E93]">Book your appointment</p>
            </div>
            {["Skin Fade — $35", "Beard Trim — $20", "Cut + Beard — $50"].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, ...springSoft }}
                className="flex items-center justify-between rounded-[12px] bg-white/[0.06] border border-white/[0.05] px-3 py-2.5"
              >
                <span className="text-[10px] font-semibold text-white">{s.split(" — ")[0]}</span>
                <span className="text-[10px] font-bold text-[#FF6B95] tabular-nums">
                  {s.split(" — ")[1]}
                </span>
              </motion.div>
            ))}
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="h-9 rounded-full bg-[#FF2D6F] flex items-center justify-center shadow-[0_8px_20px_rgba(255,45,111,0.4)]"
            >
              <span className="text-[11px] font-bold text-white">Book now</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
      {/* Glow */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,45,111,0.3) 0%, transparent 70%)" }}
      />
    </motion.div>
  );
}

const STEPS = [
  { icon: Link2, title: "Claim your slug", desc: "Pick a short URL that fits your brand." },
  { icon: Printer, title: "Print the QR flyer", desc: "Scannable code for mirrors and counters." },
  { icon: Share2, title: "Share everywhere", desc: "Bio links, stories, WhatsApp — one tap." },
  { icon: CalendarCheck, title: "Get booked 24/7", desc: "Auto-synced straight to your agenda." },
];

const BookingPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("link");

  const { data: profile } = useQuery({
    queryKey: ["booking-page-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("booking_link, full_name")
        .eq("id", user.id)
        .single();
      return data as { booking_link: string | null; full_name: string | null } | null;
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-geist">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springSoft}
          className="max-w-md w-full text-center rounded-[24px] bg-[#15151A] border border-white/[0.08] p-8"
        >
          <div className="w-12 h-12 rounded-[16px] mx-auto mb-4 flex items-center justify-center bg-[#FF2D6F] shadow-[0_8px_24px_rgba(255,45,111,0.4)]">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Sign in required</h2>
          <p className="text-sm text-[#8E8E93]">Log in to manage your booking page.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0A0A0C] font-geist relative overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,45,111,0.4) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(94,92,230,0.4) 0%, transparent 70%)" }}
        />

        <AppSidebar />

        <main className="flex-1 pb-24 overflow-y-auto relative z-10">
          {/* iOS large-title header */}
          <div className="sticky top-0 z-30 bg-[#0A0A0C]/90 backdrop-blur-2xl border-b border-white/[0.08]">
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SidebarTrigger className="lg:hidden text-white" />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springSoft}
                  className="min-w-0"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
                    Share & grow
                  </p>
                  <h1 className="text-[34px] md:text-[40px] font-bold text-white tracking-[-0.03em] leading-none">
                    Booking
                  </h1>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springSoft}
                className="shrink-0 inline-flex items-center gap-2 rounded-[12px] h-10 px-4 bg-[#30D158]/12 text-[#30D158] text-[13px] font-semibold border border-[#30D158]/20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30D158] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30D158]" />
                </span>
                Live
              </motion.div>
            </div>

            {/* iOS segmented control */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 pb-4">
              <div className="inline-flex w-full sm:w-auto p-1 rounded-[12px] bg-white/[0.06] gap-0.5">
                {TABS.map((t) => {
                  const active = tab === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTab(t.value)}
                      className={cn(
                        "relative flex-1 sm:flex-none h-9 px-5 rounded-[11px] text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-2",
                        active ? "text-white" : "text-[#8E8E93] hover:text-white/80"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="bookingTabPill"
                          className="absolute inset-0 rounded-[10px] bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                      <t.icon className="relative w-4 h-4" strokeWidth={2.3} />
                      <span className="relative">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Link2} label="Custom" value="Slug Link" tint="#FF2D6F" delay={0.05} />
              <StatTile icon={QrCode} label="Instant" value="QR Flyer" tint="#0A84FF" delay={0.1} />
              <StatTile icon={Share2} label="Share" value="Anywhere" tint="#30D158" delay={0.15} />
              <StatTile icon={LayoutTemplate} label="Branded" value="Microsite" tint="#5E5CE6" delay={0.2} />
            </div>

            {/* Main content: editor + live phone preview */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={springSoft}
                  className="rounded-[24px] bg-[#15151A] border border-white/[0.08] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
                >
                  <div className="p-4 sm:p-6 md:p-8">
                    {tab === "link" ? <BookingLinkGenerator /> : <MicrositeEditorPanel />}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Live preview */}
              <div className="hidden lg:block sticky top-40">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93] text-center mb-4">
                  Live preview
                </p>
                <PhonePreview slug={profile?.booking_link ?? null} name={profile?.full_name ?? null} />
              </div>
            </div>

            {/* How it works — iOS grouped list */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={springSoft}
              className="rounded-[24px] bg-[#15151A] border border-white/[0.08] overflow-hidden"
            >
              <div className="px-5 md:px-6 pt-5 pb-2">
                <h3 className="text-[17px] font-bold text-white tracking-tight">How it works</h3>
                <p className="text-[12px] text-[#8E8E93] mt-1">Four steps to a full chair.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-white/[0.06]">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, ...springSoft }}
                    className="flex items-start gap-3.5 p-5"
                  >
                    <div className="h-10 w-10 rounded-[12px] bg-[#FF2D6F]/15 border border-[#FF2D6F]/20 flex items-center justify-center shrink-0">
                      <s.icon className="h-4.5 w-4.5 text-[#FF6B95]" strokeWidth={2.3} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[14px] text-white">{s.title}</p>
                      <p className="text-[12px] text-[#8E8E93] mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BookingPage;
