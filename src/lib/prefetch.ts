import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// Mirrors getRangeDates("last30days") from Reports — the default landing range.
const last30Range = () => {
  const start = new Date();
  const end = new Date();
  start.setDate(end.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const prefetchReports = (qc: QueryClient, userId: string) => {
  const { startDate, endDate } = last30Range();
  void qc.prefetchQuery({
    queryKey: ["reports-analytics", userId, "last30days", startDate, endDate],
    queryFn: async () => {
      const [appointmentsResult, stylistsResult, servicesResult] = await Promise.all([
        db.from("appointments").select(`id, appointment_date, appointment_time, price, status, stylist_id, service_id, customer_id, service:services(id, name, color, duration)`)
          .eq("user_id", userId).gte("appointment_date", startDate).lte("appointment_date", endDate)
          .order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true }),
        db.from("stylists").select("id, name, title, satisfaction, status, bookings_today").eq("user_id", userId).order("name"),
        db.from("services").select("id, name, color").eq("user_id", userId).is("deleted_at", null).order("name"),
      ]);
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (stylistsResult.error) throw stylistsResult.error;
      if (servicesResult.error) throw servicesResult.error;
      return {
        appointments: appointmentsResult.data || [],
        stylists: stylistsResult.data || [],
        services: servicesResult.data || [],
      };
    },
  });
  void qc.prefetchQuery({
    queryKey: ["reports-reviews", userId],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_reviews_for_business", { _business_id: userId });
      if (error) return [];
      return data || [];
    },
  });
  void qc.prefetchQuery({
    queryKey: ["reports-customers", userId],
    queryFn: async () => {
      const { data: rows } = await db
        .from("customers").select("id, name, email").eq("user_id", userId).order("name");
      return rows || [];
    },
  });
};

const prefetchBookingPage = (qc: QueryClient, userId: string) => {
  void qc.prefetchQuery({
    queryKey: ["booking-page-profile", userId],
    queryFn: async () => {
      const { data } = await db
        .from("profiles")
        .select("booking_link, full_name, business_name")
        .eq("id", userId)
        .single();
      return data ?? null;
    },
  });
  void qc.prefetchQuery({
    queryKey: ["profile-booking-link", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "booking_link, full_name, business_name, ask_phone, ask_notes, brand_color, booking_theme, booking_locale, avatar_url, banner_url, address, description, rating, rating_count, website_design_requested"
        )
        .eq("id", userId)
        .single();
      if (error?.code === "PGRST116") return null;
      if (error) throw error;
      return data;
    },
  });
  void qc.prefetchQuery({
    queryKey: ["services-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null);
      return count ?? 0;
    },
  });
};

const prefetchSettings = (qc: QueryClient, userId: string) => {
  void qc.prefetchQuery({
    queryKey: ["settings-page-data", userId],
    queryFn: async () => {
      const [agendaResult, profileResult] = await Promise.all([
        db.from("agenda_settings")
          .select("user_id, service_duration, start_hour, end_hour, working_days")
          .eq("user_id", userId)
          .maybeSingle(),
        db.from("profiles")
          .select("full_name, phone, dark_mode, business_name, address, latitude, longitude, google_maps_url, avatar_url, banner_url, description, years_experience, accepts_waitlist, notify_cancellation_alerts, loyalty_discount_enabled, loyalty_discount_percent, onboarding_completed, timezone")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (agendaResult.error && agendaResult.error.code !== "PGRST116") throw agendaResult.error;
      if (profileResult.error && profileResult.error.code !== "PGRST116") throw profileResult.error;
      return { agenda: agendaResult.data, profile: profileResult.data };
    },
  });
};

/**
 * Warms the React Query cache for a destination page so it renders with data
 * on first paint instead of waiting for fetches after navigation. Fired on
 * dock pointer-down/hover — the few hundred ms head start is usually enough.
 * Query keys and result shapes must stay in sync with the pages' own queries.
 */
export function prefetchRouteData(qc: QueryClient, path: string, userId?: string) {
  if (!userId) return;
  if (path === "/reports") prefetchReports(qc, userId);
  else if (path === "/booking-page") prefetchBookingPage(qc, userId);
  else if (path === "/settings") prefetchSettings(qc, userId);
}
