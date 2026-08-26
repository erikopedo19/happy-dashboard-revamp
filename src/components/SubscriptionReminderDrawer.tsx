import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Lock, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@heroui/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";

const LOCKED_FEATURES = [
  { label: "Map listing & discoverability", icon: "Map" },
  { label: "Unlimited appointments", icon: "Calendar" },
  { label: "Revenue reports & analytics", icon: "BarChart3" },
  { label: "Automatic review requests", icon: "Mail" },
  { label: "Priority customer support", icon: "Headphones" },
  { label: "Custom branding & themes", icon: "Sparkles" },
];

const DISMISS_KEY = "subscription_reminder_dismissed";
const LAST_SHOWN_KEY = "subscription_reminder_last_shown";

interface SubscriptionReminderDrawerProps {
  forceOpen?: boolean;
}

export function SubscriptionReminderDrawer({ forceOpen }: SubscriptionReminderDrawerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      
      const { data } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_end")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setSubscribed(!!data?.subscribed);
      setEndDate(data?.subscription_end ?? null);
      
      if (data?.subscription_end) {
        const end = new Date(data.subscription_end);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays);
      }
      
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading || !subscribed || !endDate || daysRemaining === null) return;

    // Show if expiring within 7 days or already expired
    if (daysRemaining > 7) return;
    
    // Check if dismissed recently (within 3 days)
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
      const now = Date.now();
      
      if (dismissed && now - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;
      if (lastShown && now - Number(lastShown) < 24 * 60 * 60 * 1000) return;
    } catch { /* ignore */ }
    
    // Auto-show after a delay
    const timer = setTimeout(() => {
      setOpen(true);
      try {
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      } catch { /* ignore */ }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [loading, subscribed, endDate, daysRemaining]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setOpen(false);
  };

  const handleManage = () => {
    if (STRIPE_PORTAL_LINK) {
      window.open(STRIPE_PORTAL_LINK, "_blank", "noopener,noreferrer");
    } else {
      navigate("/pricing");
    }
    setOpen(false);
  };

  if (loading || !subscribed || !endDate || daysRemaining === null || daysRemaining > 7) return null;

  const isExpired = daysRemaining <= 0;
  const isUrgent = isExpired || daysRemaining <= 3;
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-6 pb-8 pt-2">
          {/* Warning Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={cn(
              "mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px]",
              isUrgent 
                ? "bg-gradient-to-br from-rose-400 to-orange-500 shadow-lg shadow-rose-900/30" 
                : "bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-900/30"
            )}
          >
            <AlertCircle className="h-8 w-8 text-white" />
          </motion.div>

          {/* Title */}
          <h2 className="text-center text-[22px] font-bold tracking-tight text-[#1C1C1E] dark:text-white">
            {isExpired ? "Your subscription has ended" : isUrgent ? "Subscription ending soon" : "Subscription expiring"}
          </h2>
          
          {/* Date Info */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4 text-[#8E8E93] dark:text-white/50" />
            <p className="text-center text-[15px] font-medium text-[#1C1C1E] dark:text-white">
              {formattedDate}
            </p>
          </div>
          
          {/* Days remaining badge */}
          <div className="mt-2 flex justify-center">
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold",
              isUrgent
                ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {isExpired ? "Ended" : daysRemaining === 0 ? "Expires today" : daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`}
            </span>
          </div>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-[280px] text-center text-[13px] text-[#8E8E93] dark:text-white/50">
            {isExpired
              ? "Your Pro features are now locked. Renew to restore full access instantly."
              : isUrgent
              ? "Your Pro features will be locked soon. Renew to keep everything running smoothly."
              : "Your Pro subscription is ending. Don't lose access to your premium features."
            }
          </p>

          {/* Locked Features */}
          <div className="mt-6 space-y-2">
            <p className="text-[12px] font-semibold text-[#8E8E93] dark:text-white/40 uppercase tracking-wider">
              {isExpired ? "Locked features" : "Features you'll lose"}
            </p>
            {LOCKED_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-black/[0.02] dark:border-white/[0.06] dark:bg-white/[0.03] px-4 py-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <span className="text-[14px] text-[#1C1C1E]/70 dark:text-white/70">{feature.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <Button
            onPress={handleManage}
            className={cn(
              "mt-6 h-14 w-full rounded-full text-white text-[16px] font-semibold shadow-lg",
              isUrgent 
                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/25" 
                : "bg-[#0A84FF] hover:bg-[#0066d6] shadow-blue-500/25"
            )}
          >
            <Crown className="h-4 w-4 mr-2" />
            {isUrgent ? "Renew now" : "Manage subscription"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          <Button
            variant="light"
            onPress={handleDismiss}
            className="mt-3 w-full text-center text-[13px] font-medium text-[#8E8E93] dark:text-white/40 h-auto py-2"
          >
            Remind me later
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default SubscriptionReminderDrawer;
