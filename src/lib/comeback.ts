import { supabase } from "@/integrations/supabase/client";
import { shareOrigin } from "@/lib/bookingUrl";

const db = supabase as any;

export const COMEBACK_TRIAL_DAYS = 5;
export const COMEBACK_PERIODS: { value: number | null; label: string }[] = [
  { value: null, label: "No time limit" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
];

export interface ComebackOffer {
  slug: string;
  bookings_required: number;
  period_days: number | null;
  reward: string;
}
export interface ComebackProgram extends ComebackOffer {
  user_id: string;
  enabled: boolean;
  trial_started_at: string | null;
}
export interface PublicComebackOffer extends ComebackOffer {
  business: { id: string; name: string | null; avatar_url: string | null; booking_link: string | null };
}
export interface ComebackClient { customer_id: string; name: string | null; phone: string | null; completed: number; last_visit: string | null }

const periodPhrase = (days: number | null) => {
  if (!days) return "";
  const known = COMEBACK_PERIODS.find((p) => p.value === days);
  return ` within ${known ? known.label : `${days} days`}`;
};
/** "Book 5 times within 60 days" */
export const comebackRule = (o: Pick<ComebackOffer, "bookings_required" | "period_days">) =>
  `Book ${o.bookings_required} times${periodPhrase(o.period_days)}`;

export const cleanSlug = (raw: string) =>
  raw.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 48);
export const isValidSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{1,47}$/.test(slug);

export const comebackUrl = (slug: string) => (slug ? `${shareOrigin()}/c/${slug}` : "");
export const comebackDisplayUrl = (slug: string) => (slug ? `Cutzioo.com/c/${slug}` : "");

/** Whole days of the free trial that remain; null before the coupon was ever switched on. */
export function trialDaysLeft(trialStartedAt: string | null, now = Date.now()) {
  if (!trialStartedAt) return null;
  const end = new Date(trialStartedAt).getTime() + COMEBACK_TRIAL_DAYS * 86_400_000;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

export async function fetchPublicOffer(by: { slug?: string; businessId?: string }): Promise<PublicComebackOffer | null> {
  const { data, error } = await db.rpc("get_comeback_program", { _slug: by.slug ?? null, _business_id: by.businessId ?? null });
  return error ? null : ((data as PublicComebackOffer | null) ?? null);
}

export async function fetchProgressByToken(token: string): Promise<(ComebackOffer & { completed: number }) | null> {
  const { data, error } = await db.rpc("get_comeback_progress_by_token", { _token: token });
  return error ? null : (data ?? null);
}
