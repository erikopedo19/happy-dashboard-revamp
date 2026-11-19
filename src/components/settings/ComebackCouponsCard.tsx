import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Gift, Loader2, Minus, Plus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { copyText, shareLink } from "@/lib/share";
import { ComebackCoupon } from "@/components/comeback/ComebackCoupon";
import {
  COMEBACK_PERIODS, COMEBACK_TRIAL_DAYS, cleanSlug, comebackRule, comebackUrl, isValidSlug, trialDaysLeft,
  type ComebackClient, type ComebackProgram,
} from "@/lib/comeback";

const db = supabase as any;
type Draft = Pick<ComebackProgram, "slug" | "enabled" | "bookings_required" | "period_days" | "reward">;
const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST202"]);

const label = "text-[12px] font-semibold uppercase tracking-[0.08em] text-black/45 dark:text-white/45";
const field = "h-12 w-full rounded-[14px] border border-black/10 bg-black/[0.03] px-3.5 text-[16px] text-black outline-none transition-colors duration-150 placeholder:text-black/30 focus:border-black/30 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/30";

export function ComebackCouponsCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["comeback-program", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [program, profile] = await Promise.all([
        db.from("comeback_programs").select("user_id, slug, enabled, bookings_required, period_days, reward, trial_started_at").eq("user_id", uid).maybeSingle(),
        db.from("profiles").select("booking_link, business_name, full_name").eq("id", uid).maybeSingle(),
      ]);
      return {
        unavailable: !!program.error && MISSING_TABLE.has(program.error.code),
        program: (program.data ?? null) as ComebackProgram | null,
        shopName: (profile.data?.business_name || profile.data?.full_name || "") as string,
        bookingLink: (profile.data?.booking_link || "") as string,
      };
    },
  });

  const saved = useMemo<Draft>(() => ({
    slug: data?.program?.slug ?? cleanSlug(data?.bookingLink || data?.shopName || ""),
    enabled: data?.program?.enabled ?? false,
    bookings_required: data?.program?.bookings_required ?? 5,
    period_days: data?.program?.period_days ?? null,
    reward: data?.program?.reward ?? "Free haircut",
  }), [data]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [copied, setCopied] = useState(false);
  useEffect(() => setDraft(saved), [saved]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const daysLeft = trialDaysLeft(data?.program?.trial_started_at ?? null);
  const trialOver = !isPremium && !premiumLoading && daysLeft === 0;
  const live = !!data?.program?.enabled && !trialOver;
  const slugOk = isValidSlug(draft.slug);
  const rewardOk = draft.reward.trim().length > 0;
  const dirty = !data?.program || (Object.keys(saved) as (keyof Draft)[]).some((k) => saved[k] !== draft[k]);

  const save = useMutation({
    mutationFn: async (next: Draft) => {
      const { error } = await db.from("comeback_programs").upsert({ user_id: uid, ...next, reward: next.reward.trim() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      haptic("light");
      qc.invalidateQueries({ queryKey: ["comeback-program", uid] });
      qc.invalidateQueries({ queryKey: ["comeback-clients", uid] });
      toast({ title: "Coupon saved" });
    },
    onError: (e: { code?: string; message?: string }) => {
      const taken = e.code === "23505";
      toast({ title: taken ? "That link is taken" : "Couldn't save", description: taken ? "Pick a different link for your coupon." : e.message, variant: "destructive" });
    },
  });

  const { data: clients = [] } = useQuery<ComebackClient[]>({
    queryKey: ["comeback-clients", uid],
    enabled: !!uid && !!data?.program,
    queryFn: async () => ((await db.rpc("list_comeback_progress")).data || []) as ComebackClient[],
  });
  const redeem = useMutation({
    mutationFn: async (customerId: string) => {
      const { data: res, error } = await db.rpc("redeem_comeback_reward", { _customer_id: customerId });
      if (error || !res?.success) throw new Error(res?.error || error?.message || "Couldn't mark it used");
    },
    onSuccess: () => {
      haptic("light");
      qc.invalidateQueries({ queryKey: ["comeback-clients", uid] });
      toast({ title: "Reward marked as used", description: "Their count starts again from the next visit." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const url = comebackUrl(data?.program?.slug ?? "");
  const copy = async () => {
    if (!(await copyText(url))) return;
    haptic("light");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const share = async () => {
    const text = `${comebackRule(saved)} at ${data?.shopName || "our shop"} and get: ${saved.reward}`;
    if ((await shareLink({ title: "Comeback coupon", text, url })) === "copied") toast({ title: "Link copied" });
  };

  const shell = cn("[--coupon-notch:#fff] dark:[--coupon-notch:#1C1C1E] rounded-3xl border border-[#C6C6C8] bg-white p-5 text-black dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-white md:p-6", className);
  if (isLoading || !data) return <div className={cn(shell, "h-64 animate-pulse")} />;
  if (data.unavailable) {
    return (
      <div className={shell}>
        <p className="text-[17px] font-semibold">Comeback coupons</p>
        <p className="mt-1.5 text-[14px] text-black/55 dark:text-white/55">Coupons aren't available on this workspace yet. They switch on with the next database update.</p>
      </div>
    );
  }

  const earned = clients.filter((c) => c.completed >= saved.bookings_required);
  const close = clients.filter((c) => c.completed < saved.bookings_required).slice(0, 5);

  return (
    <section className={shell}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#FF2D46]/12 text-[#FF2D46]"><Gift className="h-5 w-5" strokeWidth={2.2} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold leading-tight">Comeback coupons</h3>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isPremium ? "bg-[#30D158]/15 text-[#1E9E44] dark:text-[#30D158]" : trialOver ? "bg-[#FF2D46]/12 text-[#FF2D46]" : "bg-[#FF9F0A]/15 text-[#B36B00] dark:text-[#FF9F0A]")}>
                {isPremium ? "Included in Pro" : trialOver ? "Trial ended" : daysLeft == null ? `${COMEBACK_TRIAL_DAYS} days free` : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left of trial`}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-black/55 dark:text-white/55">Clients who book enough times get something free. Visits count once they're completed.</p>
          </div>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label="Turn comeback coupons on" />
      </header>

      {trialOver && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[#FF2D46]/[0.08] px-4 py-3">
          <p className="text-[13.5px] text-black/75 dark:text-white/75">Your free trial is over, so clients no longer see the coupon. Your settings and their visits are kept.</p>
          <button type="button" onClick={() => navigate("/pricing")}
            className="h-10 shrink-0 rounded-full bg-[#FF2D46] px-4 text-[13.5px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]">Upgrade to Pro</button>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className={cn(label, "mb-2")}>What clients see</p>
          <ComebackCoupon offer={draft} shopName={data.shopName} completed={Math.min(2, draft.bookings_required - 1)} />
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className={label}>Reward</span>
            <input className={cn(field, "mt-1.5")} value={draft.reward} maxLength={80} placeholder="Free haircut"
              onChange={(e) => set("reward", e.target.value)} />
          </label>

          <div>
            <span className={label}>Bookings needed</span>
            <div className="mt-1.5 flex items-center gap-3">
              <button type="button" aria-label="One less" disabled={draft.bookings_required <= 2} onClick={() => set("bookings_required", draft.bookings_required - 1)}
                className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-black/10 transition-transform duration-150 ease-out active:scale-[0.95] disabled:opacity-35 dark:border-white/10"><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center text-[24px] font-bold tabular-nums">{draft.bookings_required}</span>
              <button type="button" aria-label="One more" disabled={draft.bookings_required >= 30} onClick={() => set("bookings_required", draft.bookings_required + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-black/10 transition-transform duration-150 ease-out active:scale-[0.95] disabled:opacity-35 dark:border-white/10"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div>
            <span className={label}>Time window</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COMEBACK_PERIODS.map((p) => (
                <button key={p.label} type="button" aria-pressed={draft.period_days === p.value} onClick={() => set("period_days", p.value)}
                  className={cn("h-10 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-150",
                    draft.period_days === p.value ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/[0.05] text-black/70 hover:bg-black/[0.08] dark:bg-white/[0.07] dark:text-white/70 dark:hover:bg-white/[0.11]")}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className={label}>Coupon link</span>
            <span className={cn(field, "mt-1.5 flex items-center gap-0 focus-within:border-black/30 dark:focus-within:border-white/30", !slugOk && draft.slug && "border-[#FF2D46]/60")}>
              <span className="shrink-0 text-black/40 dark:text-white/40">cutzioo.com/c/</span>
              <input className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" value={draft.slug} placeholder="your-shop" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onChange={(e) => set("slug", cleanSlug(e.target.value))} />
            </span>
            {!slugOk && <span className="mt-1.5 block text-[12.5px] text-[#FF2D46]">Use 2 to 48 letters, numbers or dashes.</span>}
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={!dirty || !slugOk || !rewardOk || save.isPending} onClick={() => save.mutate(draft)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#FF2D46] px-5 text-[15px] font-semibold text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {!data.program ? (draft.enabled && !isPremium ? "Save and start free trial" : "Save coupon") : "Save changes"}
            </button>
            {data.program && (
              <>
                <button type="button" onClick={copy} aria-label="Copy coupon link"
                  className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-black/10 transition-transform duration-150 ease-out active:scale-[0.95] dark:border-white/10">
                  {copied ? <Check className="h-4 w-4 text-[#30D158]" /> : <Copy className="h-4 w-4" />}
                </button>
                <button type="button" onClick={share} aria-label="Share coupon link"
                  className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-black/10 transition-transform duration-150 ease-out active:scale-[0.95] dark:border-white/10">
                  <Share2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {data.program && <p className="text-[12.5px] text-black/45 dark:text-white/45">{live ? "Live: clients see it on your booking page and at the link above." : draft.enabled ? "Not visible to clients right now." : "Off: clients don't see it."}</p>}
        </div>
      </div>

      {data.program && (earned.length > 0 || close.length > 0) && (
        <div className="mt-6 border-t border-black/[0.07] pt-5 dark:border-white/[0.07]">
          <p className={label}>{earned.length > 0 ? `${earned.length} reward${earned.length === 1 ? "" : "s"} earned` : "Closest to a reward"}</p>
          <ul className="mt-2 divide-y divide-black/[0.06] dark:divide-white/[0.06]">
            {[...earned, ...close].map((c) => {
              const got = c.completed >= saved.bookings_required;
              return (
                <li key={c.customer_id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{c.name || "Client"}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]">
                      <div className="h-full origin-left rounded-full" style={{ transform: `scaleX(${Math.min(1, c.completed / saved.bookings_required)})`, backgroundColor: got ? "#30D158" : "#FF2D46" }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-black/55 dark:text-white/55">{Math.min(c.completed, saved.bookings_required)}/{saved.bookings_required}</span>
                  {got && (
                    <button type="button" disabled={redeem.isPending} onClick={() => redeem.mutate(c.customer_id)}
                      className="h-10 shrink-0 rounded-full bg-black px-3.5 text-[13px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50 dark:bg-white dark:text-black">Mark used</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
