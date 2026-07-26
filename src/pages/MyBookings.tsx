import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Calendar, Clock, Scissors, Loader2, ChevronRight, Star, Settings2 } from "lucide-react";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_name: string | null;
  barber_id: string;
  barber_name: string | null;
  cancel_token: string | null;
  has_review: boolean;
  booking_link: string | null;
}

const statusColor = (s: string) => {
  switch (s) {
    case "completed":
      return "bg-[#34C759]/15 text-[#34C759]";
    case "cancelled":
      return "bg-[#FF3B30]/15 text-[#FF3B30]";
    default:
      return "bg-[#007AFF]/15 text-[#007AFF]";
  }
};

const MyBookings = () => {
  const { user, loading } = useAuth();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_bookings");
      if (error) throw error;
      return (data || []) as Booking[];
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: "/my-bookings" }} />;

  const upcoming = (bookings || []).filter(
    (b) => new Date(`${b.appointment_date}T${b.appointment_time}`) >= new Date() && b.status !== "cancelled"
  );
  const past = (bookings || []).filter(
    (b) => !upcoming.includes(b)
  );

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-28">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
          <h1 className="text-[28px] leading-tight font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
            Bookings
          </h1>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Your appointments at a glance</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-white/60 dark:bg-[#1C1C1E]/60 animate-pulse" />
            ))}
          </div>
        ) : (bookings || []).length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section title="Upcoming" items={upcoming} upcoming />
            <Section title="Past" items={past} />
          </>
        )}
      </div>

      <ClientMobileDock />
    </div>
  );
};

function Section({ title, items, upcoming }: { title: string; items: Booking[]; upcoming?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="text-[13px] uppercase tracking-wide text-[#8E8E93] font-semibold px-1 mb-2">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((b, i) => {
          const isPast = !upcoming;
          // Allow reviews any time after the appointment has ended (day-after and later).
          const canReview = isPast && b.status !== "cancelled" && !b.has_review && !!b.cancel_token;
          const canManage = upcoming && !!b.cancel_token && b.status !== "cancelled";


          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 30 }}
              className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 overflow-hidden"
            >
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shrink-0">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                    {b.service_name || "Service"}
                  </p>
                  <p className="text-[12px] text-[#8E8E93] truncate">
                    with {b.barber_name || "Barber"}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#8E8E93]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(b.appointment_date), "MMM d")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {b.appointment_time?.substring(0, 5)}
                    </span>
                  </div>
                </div>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0", statusColor(b.status))}>
                  {b.status}
                </span>
              </div>

              {/* Action row */}
              {(canManage || canReview || (isPast && b.has_review)) && (
                <div className="px-4 pb-4 flex gap-2">
                  {canManage && (
                    <Link
                      to={`/manage/${b.cancel_token}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] text-[13px] font-semibold active:scale-95 transition-transform"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  )}
                  {canReview && (
                    <Link
                      to={`/review/${b.cancel_token}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-2xl bg-[#FFCC00]/15 text-[#B8860B] dark:text-[#FFCC00] text-[13px] font-semibold active:scale-95 transition-transform"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Rate your barber
                    </Link>
                  )}
                  {isPast && b.has_review && (
                    <div className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-2xl bg-[#34C759]/10 text-[#34C759] text-[13px] font-semibold">
                      <Star className="w-3.5 h-3.5 fill-[#34C759]" />
                      Reviewed
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-[#8E8E93]" />
      </div>
      <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">No bookings yet</p>
      <p className="text-[13px] text-[#8E8E93] mt-1 mb-5">Book your first appointment to see it here</p>
      <Link
        to="/find-barber"
        className="inline-flex items-center gap-1 px-5 h-11 rounded-2xl bg-[#007AFF] text-white font-semibold text-[14px] active:scale-95 transition-transform"
      >
        Find a barber <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default MyBookings;
