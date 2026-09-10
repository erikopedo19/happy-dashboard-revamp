import { Gift, Check } from "lucide-react";
import { FREE_ACCESS_MONTHS, freeAccessUntilLabel } from "@/lib/free-access";

const PERKS = [
  "Unlimited bookings & clients",
  "Team members, stylists & map listing",
  "Reports, analytics & your website",
];

/**
 * Shown in place of the paid subscription panel while the app is gifting
 * free Pro access to everyone.
 */
export function GiftSubscriptionRow() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white dark:border-white/[0.07] dark:bg-[#1C1C1E]">
      <div className="flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white">
              {FREE_ACCESS_MONTHS} months free, on us
            </p>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
              Active
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-5 text-[#8E8E93]">
            We've unlocked everything for your account until {freeAccessUntilLabel()}. No payment
            needed and nothing to cancel.
          </p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <ul className="space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[14px] text-[#1C1C1E] dark:text-white/85">
              <Check className="h-4 w-4 shrink-0 text-rose-500" /> {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default GiftSubscriptionRow;
