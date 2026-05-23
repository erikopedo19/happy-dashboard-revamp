import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const db = supabase as any;

type AppointmentInfo = {
  service: { name: string; price: number | null; duration: number };
  business: {
    id: string;
    name: string;
    brand_color: string;
    avatar_url: string | null;
    banner_url: string | null;
  };
  customer: { name: string };
  appointment_date: string;
  appointment_time: string;
  status: string;
};

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: booking, isLoading, isError } = useQuery<AppointmentInfo | null>({
    queryKey: ["review-booking", token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await db.rpc("get_appointment_by_token", { _token: token });
      if (error || !data) return null;
      return data as AppointmentInfo;
    },
  });

  const accent = booking?.business.brand_color || "#007AFF";
  const date = booking
    ? new Date(`${booking.appointment_date}T${booking.appointment_time}`)
    : null;

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a rating."); return; }
    if (!token) return;
    setError(null);
    setSubmitting(true);
    const { data, error: rpcErr } = await db.rpc("submit_review", {
      _cancel_token: token,
      _rating: rating,
      _comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (rpcErr || !data?.success) {
      setError(data?.error || rpcErr?.message || "Could not submit review.");
      return;
    }
    setSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-6 text-center">
        <div>
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link not found</h1>
          <p className="text-white/60 mb-6">This review link is invalid or has expired.</p>
          <Link to="/" className="text-amber-400 underline underline-offset-4">Back home</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A0B] to-[#1A1A1C] flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div
            className="w-20 h-20 rounded-[28px] mx-auto mb-6 flex items-center justify-center"
            style={{ background: accent }}
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Thank you!</h1>
          <p className="text-white/60 mb-2">
            Your {rating}-star review for{" "}
            <span className="text-white font-semibold">{booking.business.name}</span> has been
            saved.
          </p>
          <div className="flex justify-center gap-1 my-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn("w-7 h-7", s <= rating ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/20")}
              />
            ))}
          </div>
          <Link
            to="/find-barber"
            className="inline-block mt-4 px-6 py-3 rounded-2xl text-sm font-semibold text-white/80 border border-white/15 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Cutzio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0B] to-[#1A1A1C] text-white">
      {/* Banner */}
      <div className="relative h-40 sm:h-52 overflow-hidden">
        {booking.business.banner_url ? (
          <img src={booking.business.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1c)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent" />
      </div>

      <div className="max-w-md mx-auto px-5 -mt-14 relative pb-20">
        {/* Business info */}
        <div className="flex items-center gap-4 mb-8">
          {booking.business.avatar_url ? (
            <img
              src={booking.business.avatar_url}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-[#0A0A0B] shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl ring-4 ring-[#0A0A0B] flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: accent }}
            >
              {booking.business.name.charAt(0)}
            </div>
          )}
          <div className="pt-6">
            <p className="text-xs text-white/50 uppercase tracking-wide">Leave a review for</p>
            <h1 className="text-xl font-bold leading-tight">{booking.business.name}</h1>
          </div>
        </div>

        {/* Appointment summary */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 mb-6 flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold">{booking.service.name}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {date ? format(date, "EEE, MMM d · HH:mm") : "—"}
              {booking.customer.name ? ` · ${booking.customer.name}` : ""}
            </p>
          </div>
          {booking.service.price != null && (
            <p className="font-semibold text-right shrink-0 ml-3">
              €{Number(booking.service.price).toFixed(0)}
            </p>
          )}
        </div>

        {/* Star selector */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50 mb-3">Your rating</p>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((s) => {
                const filled = s <= (hovered || rating);
                return (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110 active:scale-95"
                    aria-label={`${s} star`}
                  >
                    <Star
                      className={cn(
                        "w-9 h-9 transition-colors",
                        filled ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/25"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs text-white/50 mt-2">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
              Comment <span className="normal-case text-white/30">(optional)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you love? Anything to improve?"
              maxLength={500}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30 transition"
            />
            <p className="text-right text-[10px] text-white/30 mt-1">{comment.length}/500</p>
          </div>

          {error && (
            <p className="text-sm text-[#fb7185] bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full h-14 rounded-2xl text-base font-semibold border-0 text-[#0A0A0B]"
            style={{ background: accent }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Submit review
              </span>
            )}
          </Button>
        </div>

        <p className="text-center text-[11px] text-white/25 mt-8">
          Powered by <span className="text-white/50 font-semibold">cutzioo.com</span>
        </p>
      </div>
    </div>
  );
}
