import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { comebackDisplayUrl, comebackRule, type ComebackOffer } from "@/lib/comeback";

/**
 * The coupon as clients see it: a dark ticket with one stamp per booking and the reward on the stub.
 * `completed` fills stamps; leave it out to show the empty card.
 */
export function ComebackCoupon({ offer, shopName, completed, className }: {
  offer: ComebackOffer; shopName?: string | null; completed?: number; className?: string;
}) {
  const total = Math.max(2, Math.min(30, offer.bookings_required));
  const done = Math.max(0, Math.min(total, completed ?? 0));
  const earned = completed != null && done >= total;
  const url = comebackDisplayUrl(offer.slug);
  const [head, tail] = url ? [url.slice(0, 3), url.slice(4)] : ["", ""];

  return (
    <div className={cn("relative isolate overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0A0A0C] text-white", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 85%)",
        }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28"
        style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(255,45,70,0.34), transparent 70%)" }} />

      <div className="px-5 pb-5 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">{shopName || "Comeback coupon"}</p>
            <p className="mt-1.5 break-words text-[28px] leading-[1.05] tracking-[-0.01em] sm:text-[32px]" style={{ fontFamily: '"Cal Sans", system-ui, sans-serif' }}>
              {offer.reward || "Free haircut"}
            </p>
            <p className="mt-2 text-[13.5px] text-white/60">{comebackRule(offer)} and it's yours.</p>
          </div>
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", earned ? "bg-[#30D158] text-black" : "bg-[#FF2D46] text-white")}>
            {earned ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <Gift className="h-5 w-5" strokeWidth={2.2} />}
          </span>
        </div>

        <ol className="mt-5 flex flex-wrap gap-2" aria-label={`${done} of ${total} bookings`}>
          {Array.from({ length: total }, (_, i) => {
            const filled = i < done;
            const last = i === total - 1;
            return (
              <li key={i}
                className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                  filled ? "bg-white text-black" : last ? "border border-dashed border-[#FF2D46]/70 text-[#FF5A6E]" : "border border-white/15 text-white/35")}>
                {filled ? <Check className="h-4 w-4" strokeWidth={3} /> : last ? <Gift className="h-4 w-4" strokeWidth={2.2} /> : i + 1}
              </li>
            );
          })}
        </ol>
        {completed != null && (
          <p className="mt-3 text-[13px] font-medium text-white/70">
            {earned ? "Reward earned. Show this at your next visit." : `${done} of ${total} done, ${total - done} to go.`}
          </p>
        )}
      </div>

      {/* tear line with a notch on each edge */}
      <div className="relative">
        <div className="border-t border-dashed border-white/15" />
        <span aria-hidden className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-white/[0.09] bg-[var(--coupon-notch,#0A0A0C)]" />
        <span aria-hidden className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-white/[0.09] bg-[var(--coupon-notch,#0A0A0C)]" />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
        <p className="min-w-0 truncate text-[15px]" style={{ fontFamily: '"Cal Sans", system-ui, sans-serif' }}>
          {url ? (<><span className="text-white/55">{head}</span><span className="text-[#FF2D46]">z</span><span className="text-white/55">{tail.split("/c/")[0]}</span><span className="text-white">/c/{offer.slug}</span></>) : <span className="text-white/40">Cutzioo.com/c/your-link</span>}
        </p>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">{offer.period_days ? `${offer.period_days} days` : "No expiry"}</span>
      </div>
    </div>
  );
}
