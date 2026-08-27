import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Globe, CalendarClock, Lock } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { motion } from "framer-motion";
import { usePremium } from "@/hooks/use-premium";
import { haptic } from "@/lib/haptics";

const KEY = "agenda_upgrade_drawer_last_shown";
const FREE_BOOKINGS = 15;

/**
 * Shown at most once per day on the Agenda for free-tier users.
 */
export function AgendaUpgradeDrawer() {
  const navigate = useNavigate();
  const { loading, isPremium } = usePremium();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || isPremium) return;
    try {
      const last = localStorage.getItem(KEY);
      const today = new Date().toDateString();
      if (last === today) return;
      localStorage.setItem(KEY, today);
    } catch { /* ignore */ }
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [loading, isPremium]);

  if (loading || isPremium) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="bg-[#0F0F12] border-white/[0.06]">
        <div className="mx-auto w-full max-w-md px-6 pb-8 pt-4 text-center">
          {/* Illustration */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative mx-auto mb-6 h-32 w-full max-w-[220px]"
          >
            <div
              aria-hidden
              className="absolute inset-0 rounded-[28px] blur-[42px] opacity-60 animate-aurora-drift"
              style={{
                background:
                  "linear-gradient(120deg, #0A84FF, #5E5CE6 40%, #A855F7 65%, #FF4578)",
              }}
            />
            <div className="relative h-full w-full rounded-[26px] border border-white/10 bg-[#17171C] overflow-hidden flex items-center justify-center">
              <div
                aria-hidden
                className="absolute -top-10 right-[-20%] h-32 w-32 rounded-full blur-[38px] opacity-70"
                style={{ background: "radial-gradient(circle, rgba(10,132,255,0.8), transparent 70%)" }}
              />
              <div
                aria-hidden
                className="absolute -bottom-10 left-[-15%] h-28 w-28 rounded-full blur-[36px] opacity-60"
                style={{ background: "radial-gradient(circle, rgba(255,69,120,0.8), transparent 70%)" }}
              />
              <Globe className="relative h-12 w-12 text-white/90" strokeWidth={1.4} />
            </div>
          </motion.div>

          <h2 className="text-[24px] font-bold tracking-tight text-white">Unlock Cutzioo Pro</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-6 text-white/50">
            You're on the free plan — {FREE_BOOKINGS} bookings included. Upgrade for unlimited bookings
            and your own barbershop website.
          </p>

          <div className="mt-5 space-y-2 text-left">
            <Row icon={<CalendarClock className="h-4 w-4" />} label={`Only ${FREE_BOOKINGS} free bookings on this plan`} />
            <Row icon={<Globe className="h-4 w-4" />} label="Free personal website, built on request" />
            <Row icon={<Lock className="h-4 w-4" />} label="Reports, teams & map listing unlocked" />
          </div>

          <button
            onClick={() => {
              haptic("medium");
              setOpen(false);
              navigate("/pricing");
            }}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98] transition-transform"
          >
            Explore more
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setOpen(false)}
            className="mt-3 h-14 w-full rounded-full bg-white/[0.06] text-[16px] font-medium text-white/70 active:scale-[0.98] transition-transform"
          >
            Not now
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80">
        {icon}
      </span>
      <span className="text-[14px] text-white/75">{label}</span>
    </div>
  );
}

export default AgendaUpgradeDrawer;
