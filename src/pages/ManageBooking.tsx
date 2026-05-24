import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Phone, Loader2, CheckCircle2, XCircle, ArrowLeft, Star } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "@/hooks/use-toast";

type Booking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service: { id: string; name: string; duration: number; price: number | null };
  business: {
    id: string;
    name: string;
    brand_color: string;
    avatar_url: string | null;
    banner_url: string | null;
    address: string | null;
    phone: string | null;
  };
  customer: { name: string; email: string; phone: string | null };
};

export default function ManageBooking() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  const fetchBooking = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_appointment_by_token", { _token: token });
    if (error || !data) {
      setBooking(null);
    } else {
      setBooking(data as Booking);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBooking(); /* eslint-disable-next-line */ }, [token]);

  // Load booked slots for selected date when in reschedule mode
  useEffect(() => {
    const run = async () => {
      if (!booking || mode !== "reschedule") return;
      const { data } = await (supabase as any).rpc("get_booked_slots", {
        _business_id: booking.business.id,
        _date: format(selectedDate, "yyyy-MM-dd"),
      });
      setBookedTimes((data || []).map((r: any) => r.appointment_time?.slice(0, 5)));
    };
    run();
  }, [booking, mode, selectedDate]);

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 30]) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, []);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)), []);

  const handleCancel = async () => {
    if (!token) return;
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("cancel_appointment_by_token", { _token: token });
    setBusy(false);
    if (error || !data?.success) {
      toast({ title: "Could not cancel", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booking cancelled" });
    fetchBooking();
  };

  const handleReschedule = async () => {
    if (!token || !selectedTime) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("reschedule_appointment_by_token", {
      _token: token,
      _new_date: format(selectedDate, "yyyy-MM-dd"),
      _new_time: selectedTime,
    });
    setBusy(false);
    if (error || !data?.success) {
      toast({ title: "Could not reschedule", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Booking rescheduled!" });
    setMode("view");
    setSelectedTime("");
    fetchBooking();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-6 text-center">
        <div>
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Booking not found</h1>
          <p className="text-white/60 mb-6">This link is invalid or has expired.</p>
          <Link to="/" className="text-amber-400 underline underline-offset-4">Back home</Link>
        </div>
      </div>
    );
  }

  const cancelled = booking.status === "cancelled";
  const accent = booking.business.brand_color;
  const date = new Date(`${booking.appointment_date}T${booking.appointment_time}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0B] to-[#1A1A1C] text-white">
      {/* Banner */}
      <div className="relative h-44 sm:h-56 overflow-hidden">
        {booking.business.banner_url ? (
          <img src={booking.business.banner_url} alt="" className="w-full h-full object-cover opacity-70" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1c)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent" />
      </div>

      <div className="max-w-xl mx-auto px-5 -mt-16 relative pb-32">
        <div className="flex items-center gap-4 mb-6">
          {booking.business.avatar_url ? (
            <img src={booking.business.avatar_url} alt="" className="w-20 h-20 rounded-3xl object-cover ring-4 ring-[#0A0A0B]" />
          ) : (
            <div className="w-20 h-20 rounded-3xl ring-4 ring-[#0A0A0B] flex items-center justify-center text-2xl font-bold" style={{ background: accent }}>
              {booking.business.name.charAt(0)}
            </div>
          )}
          <div className="pt-8">
            <h1 className="text-2xl font-bold leading-tight">{booking.business.name}</h1>
            <p className="text-white/50 text-sm">Booking management</p>
          </div>
        </div>

        {cancelled && (
          <Card className="rounded-3xl border-[#e11d48]/20 bg-[#e11d48]/10 mb-5">
            <CardContent className="p-5 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-[#fb7185]" />
              <div>
                <div className="font-semibold text-[#fb7185]">Cancelled</div>
                <div className="text-sm text-[#fb7185]/70">This appointment was cancelled.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "view" ? (
          <>
            <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur mb-5">
              <CardContent className="p-6 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Service</div>
                  <div className="text-lg font-semibold">{booking.service.name}</div>
                  {booking.service.price != null && (
                    <div className="text-sm text-white/60">€{Number(booking.service.price).toFixed(2)} · {booking.service.duration} min</div>
                  )}
                </div>
                <div className="h-px bg-white/10" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5" style={{ color: accent }} />
                    <div>
                      <div className="text-xs text-white/40">Date</div>
                      <div className="font-medium">{format(date, "EEE, MMM d")}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5" style={{ color: accent }} />
                    <div>
                      <div className="text-xs text-white/40">Time</div>
                      <div className="font-medium">{booking.appointment_time.slice(0, 5)}</div>
                    </div>
                  </div>
                </div>
                {(booking.business.address || booking.business.phone) && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="space-y-2">
                      {booking.business.address && (
                        <div className="flex items-center gap-3 text-sm text-white/70">
                          <MapPin className="w-4 h-4" /> {booking.business.address}
                        </div>
                      )}
                      {booking.business.phone && (
                        <div className="flex items-center gap-3 text-sm text-white/70">
                          <Phone className="w-4 h-4" /> {booking.business.phone}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {!cancelled && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setMode("reschedule")}
                  className="h-14 rounded-2xl text-base font-semibold border-0"
                  style={{ background: accent, color: "#0A0A0B" }}
                >
                  Reschedule
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={busy}
                  variant="outline"
                  className="h-14 rounded-2xl text-base font-semibold border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel booking"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur">
            <CardContent className="p-5 space-y-5">
              <button onClick={() => setMode("view")} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div>
                <div className="text-xs uppercase tracking-wider text-white/40 mb-3">Pick a new date</div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                  {dates.map((d) => {
                    const active = format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                        className={`shrink-0 snap-start w-16 py-3 rounded-2xl border text-center transition ${
                          active ? "text-[#0A0A0B] border-transparent" : "border-white/10 text-white/80 hover:bg-white/5"
                        }`}
                        style={active ? { background: accent } : {}}
                      >
                        <div className="text-[10px] uppercase opacity-70">{format(d, "EEE")}</div>
                        <div className="text-lg font-bold">{format(d, "d")}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-white/40 mb-3">Pick a time</div>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const taken = bookedTimes.includes(s);
                    const active = s === selectedTime;
                    return (
                      <button
                        key={s}
                        disabled={taken}
                        onClick={() => setSelectedTime(s)}
                        className={`py-3 rounded-xl text-sm font-medium border transition ${
                          active ? "text-[#0A0A0B] border-transparent" :
                          taken ? "border-white/5 text-white/20 line-through cursor-not-allowed" :
                          "border-white/10 text-white/80 hover:bg-white/5"
                        }`}
                        style={active ? { background: accent } : {}}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleReschedule}
                disabled={!selectedTime || busy}
                className="w-full h-14 rounded-2xl text-base font-semibold border-0"
                style={{ background: accent, color: "#0A0A0B" }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Confirm new time</span>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review CTA for completed bookings */}
        {booking.status === "completed" && token && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 text-center">
            <p className="text-sm text-white/70 mb-3">
              How was your experience at <span className="text-white font-semibold">{booking.business.name}</span>?
            </p>
            <a
              href={`/review/${token}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
              style={{ background: accent, color: "#0A0A0B" }}
            >
              <Star className="w-4 h-4" /> Leave a review
            </a>
          </div>
        )}

        <div className="mt-10 text-center text-xs text-white/30">
          Powered by <span className="text-white/60 font-semibold">cutzioo.com</span>
        </div>
      </div>
    </div>
  );
}
