import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { motion } from "framer-motion";
import { usePremium, PREMIUM_LIMITS } from "@/hooks/use-premium";
import { haptic } from "@/lib/haptics";

const KEY = "agenda_upgrade_drawer_last_shown";
const FREE_BOOKINGS = PREMIUM_LIMITS.freeBookingsPerMonth;

/**
 * Shown at most once per day on the Agenda for free-tier users.
 */
export function AgendaUpgradeDrawer({ suppress = false }: { suppress?: boolean }) {
  const navigate = useNavigate();
  const { loading, isPremium } = usePremium();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (suppress) setOpen(false);
  }, [suppress]);

  useEffect(() => {
    if (loading || isPremium || suppress) return;
    try {
      const last = localStorage.getItem(KEY);
      const today = new Date().toDateString();
      if (last === today) return;
      localStorage.setItem(KEY, today);
    } catch { /* ignore */ }
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [loading, isPremium, suppress]);

  if (loading || isPremium) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="border-border bg-background text-foreground">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="mx-auto w-full max-w-md px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5"
        >
          <p className="text-[13px] font-semibold text-primary">Cutzioo Pro</p>
          <h2 className="mt-1 text-[28px] font-bold leading-[1.1] tracking-tight">Your agenda, unlimited.</h2>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            The free plan includes {FREE_BOOKINGS} bookings a month.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              "Unlimited bookings",
              "Reports, teams and map listing",
              "Your own barbershop website",
            ].map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-[15px]">
                <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              haptic("medium");
              setOpen(false);
              navigate("/pricing");
            }}
            className="mt-7 h-14 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            See Pro
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 h-11 w-full text-[14px] font-medium text-muted-foreground"
          >
            Not now
          </button>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}

export default AgendaUpgradeDrawer;
