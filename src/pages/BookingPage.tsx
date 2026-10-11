import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { useIsMobile } from "@/hooks/use-mobile";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { BookingQR } from "@/components/BookingQR";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Share2,
  QrCode,
  Link2,
  ExternalLink,
  Pencil,
  CalendarCheck,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const springSoft = { type: "spring" as const, stiffness: 350, damping: 32 };

const cleanSlug = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const TABS = [
  { value: "link", label: "Booking Link", shortLabel: "Link", icon: Link2 },
  { value: "qr", label: "QR Flyer", shortLabel: "QR", icon: QrCode },
  { value: "site", label: "Website", shortLabel: "Website", icon: Globe },
] as const;

const STEPS = [
  { icon: Link2, title: "Claim your slug", desc: "Pick a short URL that fits your brand." },
  { icon: Printer, title: "Print the QR flyer", desc: "Scannable code for mirrors and counters." },
  { icon: Share2, title: "Share everywhere", desc: "Bio links, stories, WhatsApp. One tap." },
  { icon: CalendarCheck, title: "Get booked 24/7", desc: "Auto-synced straight to your agenda." },
];

const MicrositePanel = ({ slug }: { slug: string }) => {
  const navigate = useNavigate();
  const siteUrl = slug ? `${window.location.origin}/site/${slug}` : "";
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-[14px] bg-[#FF2D46]/15 border border-[#FF2D46]/20 flex items-center justify-center shrink-0">
          <Globe className="h-5 w-5 text-[#FF6B95]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold text-white tracking-tight">Your website</h3>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">A one-page microsite generated from your profile.</p>
        </div>
      </div>
      {siteUrl && (
        <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-[13px] text-[#8E8E93] truncate font-mono">
          {siteUrl}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={() => navigate("/microsite")}
          className="flex-1 h-11 rounded-[12px] bg-[#FF2D46] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#ff4784] active:scale-[0.98] transition"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.3} />
          Customise website
        </button>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 h-11 rounded-[12px] bg-white/[0.06] border border-white/[0.08] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-white/[0.1] active:scale-[0.98] transition"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.3} />
            View live
          </a>
        )}
      </div>
    </div>
  );
};

const BookingPage = () => {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const isMobile = useIsMobile() ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = rawTab === "qr" || rawTab === "site" ? rawTab : "link";
  const setTab = (value: (typeof TABS)[number]["value"]) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  const visibleTabs = isPremium ? TABS : TABS.filter((t) => t.value === "link");

  const { data: profile } = useQuery({
    queryKey: ["booking-page-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("booking_link, full_name, business_name")
        .eq("id", user.id)
        .single();
      return data as { booking_link: string | null; full_name: string | null; business_name: string | null } | null;
    },
  });

  const fallbackSlug = cleanSlug((profile?.business_name || profile?.full_name || "").trim());

  const bookingUrl = (profile?.booking_link || fallbackSlug)
    ? `${window.location.origin}/book/${profile?.booking_link || fallbackSlug}`
    : "";

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-geist">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springSoft}
          className="max-w-md w-full text-center rounded-[24px] bg-[#15151A] border border-white/[0.08] p-8"
        >
          <div className="w-12 h-12 rounded-[16px] mx-auto mb-4 flex items-center justify-center bg-[#FF2D46] shadow-[0_8px_24px_rgba(255,45,111,0.4)]">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Sign in required</h2>
          <p className="text-sm text-[#8E8E93]">Log in to manage your booking page.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#0A0A0C] font-geist relative overflow-hidden">
        <AppSidebar />

        <main className="flex-1 overflow-y-auto relative z-10">
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
                  <h1 className="text-[28px] md:text-[40px] font-bold text-white tracking-[-0.03em] leading-none">
                    Booking
                  </h1>
                </motion.div>
              </div>
            </div>

            {/* iOS segmented control */}
            <div className="max-w-2xl mx-auto px-4 md:px-8 pb-4">
              <div className="inline-flex w-full sm:w-auto p-1 rounded-[14px] bg-white/[0.06] gap-0.5">
                {visibleTabs.map((t) => {
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
                      <span className="relative sm:hidden">{t.shortLabel}</span>
                      <span className="relative hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-10 space-y-5">
            {/* Main content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={springSoft}
                className="md:rounded-[28px] md:bg-[#15151A] md:border md:border-white/[0.08] md:overflow-hidden"
              >
                <div className="p-0 md:p-8">
                  {tab === "site" ? (
                    <MicrositePanel slug={profile?.booking_link || fallbackSlug} />
                  ) : tab === "qr" ? (
                    <BookingQR
                      url={bookingUrl}
                      businessName={profile?.business_name || profile?.full_name}
                      isPremium={isPremium}
                    />
                  ) : (
                    <BookingLinkGenerator />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* How it works — iOS grouped list */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={springSoft}
              className="md:rounded-[28px] md:bg-[#15151A] md:border md:border-white/[0.08] md:overflow-hidden"
            >
              <div className="px-4 md:px-6 pt-5 pb-2">
                <h3 className="text-[17px] font-bold text-white tracking-tight">How it works</h3>
                <p className="text-[12px] text-[#8E8E93] mt-1">Four steps to a full chair.</p>
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-0 sm:overflow-visible sm:pb-0 sm:snap-none sm:divide-y sm:divide-y-0 sm:divide-white/[0.06]">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, ...springSoft }}
                    className="snap-start shrink-0 w-[72%] rounded-2xl bg-[#15151A] border border-white/[0.08] p-4 flex items-start gap-3.5 sm:w-auto sm:shrink sm:rounded-none sm:bg-transparent sm:border-0 sm:p-5"
                  >
                    <div className="h-10 w-10 rounded-[12px] bg-[#FF2D46]/15 border border-[#FF2D46]/20 flex items-center justify-center shrink-0">
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
