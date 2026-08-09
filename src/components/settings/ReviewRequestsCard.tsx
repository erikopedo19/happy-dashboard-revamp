/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Star, Sparkles, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";


const delayOptions = [
  { value: 2, label: "2 hours after" },
  { value: 6, label: "6 hours after" },
  { value: 12, label: "12 hours after" },
  { value: 24, label: "1 day after (recommended)" },
  { value: 48, label: "2 days after" },
  { value: 72, label: "3 days after" },
];

export function ReviewRequestsCard() {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [enabled, setEnabled] = useState(false);
  const [delay, setDelay] = useState(24);
  const [showPublicReviews, setShowPublicReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("auto_review_emails, review_email_delay_hours, show_public_reviews")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(!!data.auto_review_emails);
        setDelay(data.review_email_delay_hours ?? 24);
        setShowPublicReviews(!!data.show_public_reviews);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async (patch: { auto_review_emails?: boolean; review_email_delay_hours?: number; show_public_reviews?: boolean }) => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update(patch).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const onToggle = async (v: boolean) => {
    if (!isPremium) {
      navigate("/pricing");
      return;
    }
    setEnabled(v);
    const ok = await save({ auto_review_emails: v });
    if (ok) {
      toast({
        title: v ? "Auto review requests on" : "Auto review requests off",
        description: v
          ? `Clients will get an email ${delay}h after their appointment.`
          : "No more automatic review emails will be sent.",
      });
    } else {
      setEnabled(!v);
    }
  };

  const onDelayChange = async (v: string) => {
    const n = Number(v);
    setDelay(n);
    await save({ review_email_delay_hours: n });
  };

  const onPublicReviewsToggle = async (v: boolean) => {
    if (!isPremium) {
      navigate("/pricing");
      return;
    }
    setShowPublicReviews(v);
    const ok = await save({ show_public_reviews: v });
    if (ok) {
      toast({
        title: v ? "Public reviews visible" : "Public reviews hidden",
        description: v
          ? "Your clients' review text and names are now shown on your public page."
          : "Only your overall rating and review count are shown publicly.",
      });
    } else {
      setShowPublicReviews(!v);
    }
  };

  return (
    <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <Star className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Reviews & notifications</CardTitle>
              {!isPremium && !premiumLoading && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  <Sparkles className="w-3 h-3" /> Premium
                </span>
              )}
            </div>
            <CardDescription className="text-[#8E8E93] dark:text-gray-500">
              Automatically email clients a review link after their appointment and get notified when new reviews come in. One email per booking.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">Send review email automatically</p>
            <p className="text-sm text-[#8E8E93] dark:text-gray-500">
              We check every hour and send to clients whose booking has an email address.
            </p>
          </div>
          <Switch
            checked={enabled && isPremium}
            onCheckedChange={onToggle}
            disabled={loading || saving || premiumLoading}
          />
        </div>

        <div className={enabled && isPremium ? "" : "opacity-50 pointer-events-none"}>
          <Label className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]/80 mb-2 block">
            When to send
          </Label>
          <Select value={String(delay)} onValueChange={onDelayChange}>
            <SelectTrigger className="h-12 rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {delayOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">
              Show detailed reviews publicly
              {!isPremium && !premiumLoading && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[9px] font-bold uppercase tracking-wide">
                  Premium
                </span>
              )}
            </p>
            <p className="text-sm text-[#8E8E93] dark:text-gray-500">
              When on, review text and reviewer names appear on your public page. Off shows only the overall rating.
            </p>
          </div>
          <Switch
            checked={showPublicReviews && isPremium}
            onCheckedChange={onPublicReviewsToggle}
            disabled={loading || saving || premiumLoading}
          />
        </div>


        {!isPremium && !premiumLoading && (
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 text-white font-semibold"
          >
            <Lock className="w-4 h-4 mr-2" /> Unlock with Premium
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
