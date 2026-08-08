import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";
import { cn } from "@/lib/utils";

export function SubscriptionCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);

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
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="rounded-3xl border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <CardContent className="p-5 flex items-center justify-between gap-4 relative">
        {/* Premium gradient background for subscribed users */}
        {subscribed && !loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-purple-500/5 pointer-events-none" />
        )}
        
        <div className="flex items-center gap-3 min-w-0 relative z-10">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all",
            subscribed && !loading
              ? "bg-gradient-to-br from-rose-500 to-purple-500 shadow-[0_4px_12px_rgba(244,63,94,0.3)]"
              : "bg-muted"
          )}>
            <Crown className={cn(
              "w-5 h-5 transition-colors",
              subscribed && !loading ? "text-white" : "text-foreground"
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Your plan</p>
              <Badge 
                variant={subscribed ? "default" : "secondary"} 
                className={cn(
                  "rounded-full text-[11px] font-semibold",
                  subscribed && !loading 
                    ? "bg-gradient-to-r from-rose-500 to-purple-500 text-white border-0" 
                    : ""
                )}
              >
                {loading ? "…" : subscribed ? "Pro" : "Free"}
              </Badge>
            </div>
            <p className="text-xs text-[#8E8E93] dark:text-gray-500 truncate mt-0.5">
              {loading
                ? "Loading…"
                : subscribed
                ? `Active${endDate ? ` until ${new Date(endDate).toLocaleDateString()}` : ""}`
                : "Upgrade to unlock map listing & unlimited bookings"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (subscribed && STRIPE_PORTAL_LINK) {
              window.open(STRIPE_PORTAL_LINK, "_blank", "noopener,noreferrer");
            } else {
              navigate("/pricing");
            }
          }}
          className={cn(
            "rounded-full h-10 px-5 shrink-0 transition-all",
            subscribed && !loading
              ? "bg-gradient-to-r from-rose-500 to-purple-500 text-white border-0 shadow-[0_4px_12px_rgba(244,63,94,0.3)] hover:shadow-[0_6px_16px_rgba(244,63,94,0.4)]"
              : ""
          )}
          variant={subscribed ? "default" : "default"}
        >
          {subscribed ? "Manage" : "Upgrade"}
        </Button>
      </CardContent>
    </Card>
  );
}


