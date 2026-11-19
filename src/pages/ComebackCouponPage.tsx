import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CalendarCheck, Gift, Repeat } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Wordmark } from "@/components/Wordmark";
import { ComebackCoupon } from "@/components/comeback/ComebackCoupon";
import { comebackRule, fetchPublicOffer } from "@/lib/comeback";
import { publicBookingUrl } from "@/lib/bookingUrl";

/** Public coupon page: cutzioo.com/c/<slug>. */
export default function ComebackCouponPage() {
  const { slug = "" } = useParams();
  const { data: offer, isLoading } = useQuery({
    queryKey: ["comeback-public", slug],
    queryFn: () => fetchPublicOffer({ slug }),
    staleTime: 60_000,
  });

  const shop = offer?.business.name || "this barber";
  const bookingPath = offer?.business.booking_link ? new URL(publicBookingUrl(offer.business.booking_link)).pathname : null;
  const steps = offer ? [
    { Icon: CalendarCheck, title: "Book online", text: `Every completed visit at ${shop} adds a stamp.` },
    { Icon: Repeat, title: comebackRule(offer), text: offer.period_days ? "Visits older than that drop off." : "Take as long as you need, stamps don't expire." },
    { Icon: Gift, title: offer.reward, text: "Use the same phone or email each time and it's applied at the shop." },
  ] : [];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0A0A0C] text-white">
      <Seo
        title={offer ? `${offer.reward} at ${shop} | Cutzioo` : "Comeback coupon | Cutzioo"}
        description={offer ? `${comebackRule(offer)} at ${shop} and get: ${offer.reward}.` : "Book again and earn a reward."}
        path={`/c/${slug}`}
        noindex={!offer}
      />
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <main className="mx-auto flex min-h-full w-full max-w-[460px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(env(safe-area-inset-top)+28px)]">
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-[26px] bg-white/[0.05]" />
          ) : !offer ? (
            <div className="my-auto text-center">
              <h1 className="text-[26px] font-bold tracking-tight">This coupon isn't active</h1>
              <p className="mt-2 text-[15px] text-white/55">The shop may have paused it or changed the link.</p>
              <a href="https://cutzioo.com" className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-black">Find a barber</a>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3">
                {offer.business.avatar_url
                  ? <img src={offer.business.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[15px] font-semibold">{shop.slice(0, 1).toUpperCase()}</span>}
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{shop}</p>
                  <p className="text-[13px] text-white/50">Comeback coupon</p>
                </div>
              </header>

              <h1 className="mt-7 text-[30px] font-bold leading-[1.1] tracking-[-0.02em]">Keep coming back, get rewarded.</h1>
              <ComebackCoupon offer={offer} shopName={shop} className="mt-5" />

              <ol className="mt-6 space-y-4">
                {steps.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/80"><Icon className="h-[18px] w-[18px]" strokeWidth={2.1} /></span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{title}</p>
                      <p className="text-[13.5px] leading-snug text-white/55">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {bookingPath && (
                <Link to={bookingPath}
                  className="mt-8 flex h-[54px] items-center justify-center rounded-[18px] bg-[#FF2D46] text-[16px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]">
                  Book now
                </Link>
              )}
            </>
          )}
          <a href="https://cutzioo.com" target="_blank" rel="noreferrer" className="mx-auto mt-auto flex w-fit items-center gap-1.5 pt-10 text-[12px] text-white/35 transition-colors duration-150 hover:text-white/60">
            Made with <span className="font-semibold text-white/70"><Wordmark /></span>
          </a>
        </main>
      </div>
    </div>
  );
}
