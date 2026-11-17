import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, MessageCircle, MessageSquare, Pencil, Share2, Target, UserRoundCheck } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { toast } from "@/hooks/use-toast";
import { publicBookingUrl } from "@/lib/bookingUrl";
import { openExternal, shareLink } from "@/lib/share";
import { money, moneySymbol } from "@/components/reports/money";
import { initialsOf, isLost } from "@/components/reports/reportsData";

const db = supabase as any;
const CARD = "rounded-[24px] border border-white/[0.08] bg-[#121215] p-5 md:p-6";
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Monthly revenue target, kept on this device per account. */
export function RevenueGoalCard({ userId, className }: { userId?: string; className?: string }) {
  const storageKey = `cutzioo:revenue-goal:${userId ?? "anon"}`;
  const [goal, setGoal] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try { setGoal(Number(localStorage.getItem(storageKey)) || 0); } catch { /* private mode */ }
  }, [storageKey]);

  const now = new Date();
  const monthStart = dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = dayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

  const { data: earned = 0 } = useQuery<number>({
    queryKey: ["reports-month-revenue", userId, monthStart],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await db.from("appointments").select("price, status")
        .eq("user_id", userId).gte("appointment_date", monthStart).lte("appointment_date", monthEnd);
      return ((data || []) as { price: number | null; status: string | null }[])
        .reduce((s, r) => s + (isLost(r.status) ? 0 : r.price || 0), 0);
    },
  });

  const save = () => {
    const next = Math.max(0, Math.round(Number(draft.replace(",", ".")) || 0));
    setGoal(next);
    setEditing(false);
    try { next ? localStorage.setItem(storageKey, String(next)) : localStorage.removeItem(storageKey); } catch { /* private mode */ }
    haptic("light");
  };

  const pct = goal ? Math.min(100, Math.round((earned / goal) * 100)) : 0;
  const left = Math.max(0, goal - earned);

  return (
    <div className={cn(CARD, className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#30D158]/15 text-[#30D158]"><Target className="h-4 w-4" strokeWidth={2.3} /></span>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-white">{format(now, "MMMM")} goal</p>
            <p className="text-[12px] text-white/45">Booked revenue this month</p>
          </div>
        </div>
        {goal > 0 && !editing && (
          <button type="button" aria-label="Change goal" onClick={() => { setDraft(String(goal)); setEditing(true); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.94]">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.3} />
          </button>
        )}
      </div>

      {editing || !goal ? (
        <form className="mt-4 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3.5 focus-within:border-white/25">
            <span className="text-[15px] text-white/40">{moneySymbol()}</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} inputMode="numeric" placeholder="Set a monthly target"
              aria-label="Monthly revenue goal" autoFocus={editing}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-medium tabular-nums text-white outline-none placeholder:text-white/30" />
          </label>
          <button type="submit" aria-label="Save goal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-black transition-transform duration-150 ease-out active:scale-[0.95]">
            <Check className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </form>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-[28px] font-bold leading-none tracking-tight text-white tabular-nums">{money(earned)}</p>
            <p className="text-[13px] text-white/45 tabular-nums">of {money(goal)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="rp-fill-x h-full rounded-full bg-[#30D158]" style={{ "--v": pct } as React.CSSProperties} />
          </div>
          <p className="mt-2.5 text-[12.5px] text-white/50">
            {left === 0
              ? "Goal reached. Raise it for next month."
              : `${money(left)} to go, about ${money(left / daysLeft)} a day for the ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`}
          </p>
        </>
      )}
    </div>
  );
}

interface LapsedClient { id: string; name: string; phone: string | null; lastVisit: string; visits: number }

/** Clients with no visit in 30+ days and nothing booked, each with a one-tap message. */
export function WinBackCard({ userId, shopName, bookingLink, className, limit = 5 }: {
  userId?: string; shopName?: string | null; bookingLink?: string | null; className?: string; limit?: number;
}) {
  const { data: clients = [], isLoading } = useQuery<LapsedClient[]>({
    queryKey: ["reports-winback", userId, limit],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = dayKey(new Date());
      const since = new Date();
      since.setDate(since.getDate() - 180);
      const { data: rows } = await db.from("appointments").select("customer_id, appointment_date, status")
        .eq("user_id", userId).gte("appointment_date", dayKey(since)).not("customer_id", "is", null);
      const seen = new Map<string, { last: string; visits: number; upcoming: boolean }>();
      for (const r of (rows || []) as { customer_id: string; appointment_date: string; status: string | null }[]) {
        if (isLost(r.status)) continue;
        const c = seen.get(r.customer_id) || { last: "", visits: 0, upcoming: false };
        if (r.appointment_date > today) c.upcoming = true;
        else { c.visits += 1; if (r.appointment_date > c.last) c.last = r.appointment_date; }
        seen.set(r.customer_id, c);
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cut = dayKey(cutoff);
      const lapsed = Array.from(seen.entries())
        .filter(([, c]) => !c.upcoming && c.last && c.last <= cut)
        .sort((a, b) => b[1].visits - a[1].visits || b[1].last.localeCompare(a[1].last))
        .slice(0, limit);
      if (!lapsed.length) return [];
      const { data: people } = await db.from("customers").select("id, name, phone").in("id", lapsed.map(([id]) => id));
      const byId = new Map(((people || []) as { id: string; name: string | null; phone: string | null }[]).map((p) => [p.id, p]));
      return lapsed.flatMap(([id, c]) => {
        const p = byId.get(id);
        return p ? [{ id, name: p.name || "Client", phone: p.phone, lastVisit: c.last, visits: c.visits }] : [];
      });
    },
  });

  const url = useMemo(() => publicBookingUrl(bookingLink), [bookingLink]);
  const messageFor = (c: LapsedClient) => {
    const first = c.name.trim().split(/\s+/)[0];
    return `Hi ${first}, it's been a while! Your next cut${shopName ? ` at ${shopName}` : ""} is one tap away${url ? `: ${url}` : "."}`;
  };
  const send = async (c: LapsedClient, via: "whatsapp" | "sms" | "share") => {
    haptic("light");
    const text = messageFor(c);
    const digits = (c.phone || "").replace(/[^\d+]/g, "");
    if (via === "whatsapp") return openExternal(`https://wa.me/${digits.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`);
    if (via === "sms") return openExternal(`sms:${digits}?&body=${encodeURIComponent(text)}`);
    const result = await shareLink({ text, url: url || text });
    if (result === "copied") toast({ title: "Message copied", description: `Paste it to ${c.name}.` });
  };

  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/75 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.94]";

  return (
    <div className={cn(CARD, className)}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#0A84FF]/15 text-[#0A84FF]"><UserRoundCheck className="h-4 w-4" strokeWidth={2.3} /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-white">Win back clients</p>
          <p className="text-[12px] text-white/45">No visit in 30+ days and nothing booked</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[14px] bg-white/[0.05]" />)}</div>
      ) : clients.length === 0 ? (
        <p className="mt-4 rounded-[14px] bg-white/[0.04] px-4 py-5 text-[13px] text-white/50">Everyone who visited recently is back or booked. Nothing to chase.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-[16px] bg-white/[0.04]">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-semibold text-white/70">{initialsOf(c.name) || "?"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white">{c.name}</p>
                <p className="truncate text-[12px] text-white/45">
                  {formatDistanceToNowStrict(new Date(`${c.lastVisit}T00:00:00`))} ago · {c.visits} {c.visits === 1 ? "visit" : "visits"}
                </p>
              </div>
              {c.phone ? (
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" className={iconBtn} aria-label={`WhatsApp ${c.name}`} onClick={() => send(c, "whatsapp")}><MessageCircle className="h-4 w-4" strokeWidth={2.2} /></button>
                  <button type="button" className={iconBtn} aria-label={`Text ${c.name}`} onClick={() => send(c, "sms")}><MessageSquare className="h-4 w-4" strokeWidth={2.2} /></button>
                </div>
              ) : (
                <button type="button" className={iconBtn} aria-label={`Share a message for ${c.name}`} onClick={() => send(c, "share")}><Share2 className="h-4 w-4" strokeWidth={2.2} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!bookingLink && (
        <p className="mt-3 text-[12px] text-white/45">
          <Link to="/booking-page" className="font-semibold text-white underline-offset-2 hover:underline">Set your booking link</Link> so messages include it.
        </p>
      )}
    </div>
  );
}
