import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

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
    <Card className="rounded-3xl border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Your plan</p>
              <Badge variant={subscribed ? "default" : "secondary"} className="rounded-full text-[11px]">
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
          onClick={() => navigate("/pricing")}
          className="rounded-full h-10 px-5 shrink-0"
          variant={subscribed ? "outline" : "default"}
        >
          {subscribed ? "Manage" : "Upgrade"}
        </Button>
      </CardContent>
    </Card>
  );
}
