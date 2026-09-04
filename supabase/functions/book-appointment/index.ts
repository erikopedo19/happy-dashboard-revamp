/* eslint-disable */
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BookingPayload = {
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceIds: string[];
  stylistId?: string | null;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  notes?: string | null;
  accentColor?: string | null;
};

type AgendaSettings = {
  start_hour: string | null;
  end_hour: string | null;
  service_duration: number | null;
  working_days: number[] | null;
};

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseTimeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const isSameDateString = (dateStr: string, compare: Date) => {
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  if (!y || !m || !d) return false;
  return (
    compare.getFullYear() === y &&
    compare.getMonth() + 1 === m &&
    compare.getDate() === d
  );
};

function localToUtc(dateIso: string, time: string, timeZone?: string | null): Date {
  if (!timeZone || timeZone === "UTC") {
    const [y, m, d] = dateIso.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm));
  }
  const [y, mo, d] = dateIso.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  const wall = new Date(Date.UTC(y, mo - 1, d, h, m));
  const getParts = (dt: Date) => {
    const parts: Record<string, number> = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(dt).forEach((p) => {
      if (p.type !== "literal") parts[p.type] = Number(p.value);
    });
    return parts;
  };
  let current = wall;
  for (let i = 0; i < 4; i++) {
    const p = getParts(current);
    const tzLocal = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
    const diff = wall.getTime() - tzLocal.getTime();
    if (Math.abs(diff) < 1000) break;
    current = new Date(current.getTime() + diff);
  }
  return current;
}

const formatDateLong = (dateStr: string, time: string, timeZone?: string | null) => {
  if (!timeZone || timeZone === "UTC") {
    const [y, m, d] = dateStr.split("-").map((n) => Number(n));
    if (!y || !m || !d) return dateStr;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(dt);
  }
  const dt = localToUtc(dateStr, time, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone,
  }).format(dt);
};

// --- Simple in-memory IP rate limiting: max 5 booking attempts per IP per hour ---
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return hits.length > RATE_LIMIT_MAX;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (req.method === "POST" && isRateLimited(clientIp)) {
    return json({ error: "Too many booking attempts. Please try again later." }, 429);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        { error: "Server misconfigured: missing Supabase credentials" },
        500,
      );
    }

    const payload = (await req.json()) as BookingPayload;

    if (
      !payload?.businessId ||
      !payload?.customerName ||
      !payload?.customerEmail ||
      !payload?.appointmentDate ||
      !payload?.appointmentTime ||
      !Array.isArray(payload?.serviceIds) ||
      payload.serviceIds.length === 0
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    // Fetch business profile for email details and validation
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, brand_color, timezone")
      .eq("id", payload.businessId)
      .single();

    if (profileError || !profile) {
      return json(
        {
          error: "Business not found",
          details: profileError?.message ?? "Invalid businessId",
        },
        404,
      );
    }

    // --- Free plan cap: max 20 appointments per calendar month ---
    {
      const { data: sub } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_end")
        .eq("user_id", payload.businessId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isPremium = !!sub?.subscribed &&
        (!sub?.subscription_end || new Date(sub.subscription_end) > new Date());

      if (!isPremium) {
        // Cap is per calendar month of the REQUESTED appointment date, and
        // cancelled / no-show appointments do not count against the limit.
        const [ry, rm] = payload.appointmentDate.split("-").map(Number);
        const monthStart = `${ry}-${String(rm).padStart(2, "0")}-01`;
        const monthEnd = new Date(Date.UTC(ry, rm, 1)).toISOString().slice(0, 10);

        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", payload.businessId)
          .gte("appointment_date", monthStart)
          .lt("appointment_date", monthEnd)
          .not("status", "in", "(cancelled,canceled,no_show,no-show)");

        if ((count ?? 0) >= 20) {
          return json(
            {
              error: "Booking limit reached",
              details:
                "This business has reached its monthly booking limit. Please contact them directly.",
            },
            402,
          );
        }
      }
    }


    // Fetch services and validate ownership
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, duration, price, user_id")
      .in("id", payload.serviceIds);

    if (servicesError || !services || services.length === 0) {
      return json(
        {
          error: "Invalid services selection",
          details: servicesError?.message,
        },
        400,
      );
    }

    const invalidService = services.find((s: any) =>
      s.user_id !== payload.businessId
    );
    if (invalidService) {
      return json({ error: "Service does not belong to business" }, 403);
    }

    const primaryService = services[0] as Service;

    // Fetch agenda settings for slot duration and working days
    const { data: settings } = await supabase
      .from("agenda_settings")
      .select("start_hour, end_hour, service_duration, working_days")
      .eq("user_id", payload.businessId)
      .maybeSingle();

    const effectiveSettings: AgendaSettings = settings ?? {
      start_hour: "08:00",
      end_hour: "18:00",
      service_duration: 30,
      working_days: [0, 1, 2, 3, 4, 5, 6],
    };

    // Validate working day
    const dateParts = payload.appointmentDate.split("-").map((n) => Number(n));
    const selectedDate = new Date(
      Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]),
    );
    const dayOfWeek = selectedDate.getUTCDay();
    if (
      Array.isArray(effectiveSettings.working_days) &&
      !effectiveSettings.working_days.includes(dayOfWeek)
    ) {
      return json({ error: "Selected date is not a working day" }, 400);
    }

    // Basic "past time" guard (UTC)
    const now = new Date();
    if (isSameDateString(payload.appointmentDate, now)) {
      const appointmentMinutes = parseTimeToMinutes(payload.appointmentTime);
      if (appointmentMinutes !== null) {
        const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        if (appointmentMinutes <= nowMinutes) {
          return json({ error: "Selected time is in the past" }, 400);
        }
      }
    }

    // Slot availability check
    const slotInterval = effectiveSettings.service_duration ?? 30;
    const totalDuration = services.reduce(
      (sum: number, s: { duration?: number | null }) => sum + (s?.duration || 0),
      0,
    );
    const slotsNeeded = Math.ceil(totalDuration / slotInterval);

    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("appointment_time, stylist_id, service:services(duration)")
      .eq("user_id", payload.businessId)
      .eq("appointment_date", payload.appointmentDate);

    const isSlotTaken = (existingAppointments || []).some((apt: any) => {
      const aptTime = apt.appointment_time?.substring(0, 5);
      const aptDuration = apt.service?.duration || 0;
      const aptSlots = Math.ceil(aptDuration / slotInterval);

      const aptStart = parseTimeToMinutes(aptTime);
      const reqStart = parseTimeToMinutes(payload.appointmentTime);
      if (aptStart === null || reqStart === null) return false;

      const aptEnd = aptStart + aptSlots * slotInterval;
      const reqEnd = reqStart + slotsNeeded * slotInterval;

      // If stylist specified, only consider conflicts with same stylist
      if (payload.stylistId) {
        if (apt.stylist_id !== payload.stylistId) return false;
      }

      // Overlap test
      return reqStart < aptEnd && reqEnd > aptStart;
    });

    if (isSlotTaken) {
      return json(
        { error: "Time slot unavailable", code: "SLOT_TAKEN" },
        409,
      );
    }

    // Find or create customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("user_id", payload.businessId)
      .eq("email", payload.customerEmail)
      .maybeSingle();

    let customerId = existingCustomer?.id;

    if (!customerId) {
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from("customers")
        .insert({
          name: payload.customerName,
          email: payload.customerEmail,
          phone: payload.customerPhone ?? null,
          user_id: payload.businessId,
        })
        .select("id")
        .single();

      if (createCustomerError || !newCustomer) {
        return json(
          {
            error: "Failed to create customer",
            details: createCustomerError?.message,
          },
          500,
        );
      }
      customerId = newCustomer.id;
    } else {
      const updates: Record<string, string | null> = {};
      if (payload.customerName && payload.customerName !== existingCustomer.name) {
        updates.name = payload.customerName;
      }
      if (
        payload.customerPhone !== undefined &&
        payload.customerPhone !== existingCustomer.phone
      ) {
        updates.phone = payload.customerPhone ?? null;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("customers").update(updates).eq("id", customerId);
      }
    }

    // Build notes with additional services
    const additionalServiceNames = services
      .slice(1)
      .map((s: { name?: string | null }) => s?.name)
      .filter(Boolean);
    let notesText = payload.notes ?? "";
    if (additionalServiceNames.length > 0) {
      notesText = notesText
        ? `${notesText} | Additional: ${additionalServiceNames.join(", ")}`
        : `Additional services: ${additionalServiceNames.join(", ")}`;
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        customer_id: customerId,
        service_id: primaryService.id,
        appointment_date: payload.appointmentDate,
        appointment_time: payload.appointmentTime,
        price: services.reduce(
          (sum: number, s: { price?: number | null }) => sum + (s?.price || 0),
          0,
        ),
        notes: notesText || null,
        status: "scheduled",
        user_id: payload.businessId,
        stylist_id: payload.stylistId ?? null,
      })
      .select()
      .single();

    if (appointmentError || !appointment) {
      return json(
        {
          error: "Failed to create appointment",
          details: appointmentError?.message,
        },
        500,
      );
    }

    // In-app + push notification for the business
    try {
      const serviceNames = services.map((s: { name?: string | null }) => s?.name).filter(Boolean).join(", ");
      await supabase.from("notifications").insert({
        user_id: payload.businessId,
        type: "booking_created",
        title: "New booking",
        body: `${payload.customerName} booked ${serviceNames || "a service"} on ${formatDateLong(payload.appointmentDate, payload.appointmentTime, profile.timezone)} at ${payload.appointmentTime}`,
        appointment_id: appointment.id,
      });
    } catch (notifErr) {
      console.error("Booking notification insert failed:", notifErr);
    }

    // Fetch stylist details if present
    let stylistName: string | undefined;
    let stylistTitle: string | undefined;
    if (payload.stylistId) {
      const { data: stylist } = await supabase
        .from("stylists")
        .select("name, title")
        .eq("id", payload.stylistId)
        .maybeSingle();
      stylistName = stylist?.name ?? undefined;
      stylistTitle = stylist?.title ?? undefined;
    }

    // Fetch sender configuration
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("sender_email, sender_name, business_name, full_name")
      .eq("id", payload.businessId)
      .maybeSingle();

    // Fire-and-forget confirmation email + SMS
    try {
      const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") || "";
      await fetch(
        `${SUPABASE_URL}/functions/v1/send-booking-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-functions-secret": FUNCTION_SECRET,
          },
          body: JSON.stringify({
            cancelToken: appointment.cancel_token,
            accentColor: payload.accentColor || profile.brand_color || "#2563eb",
          }),
        },
      );
    } catch (err) {
      console.error("Notification dispatch failed:", err);
    }

    return json({ success: true, appointment }, 200);
  } catch (error: any) {
    return json(
      { error: error?.message || "Unexpected server error" },
      500,
    );
  }
});
