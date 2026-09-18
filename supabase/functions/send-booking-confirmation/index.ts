/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const SENDER_EMAIL = "booking@cutzioo.com";
const SENDER_FALLBACK_NAME = "Cutzio";
const APP_URL = "https://cutzioo.com";

function render(t: string, v: Record<string, any>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (v[k] == null ? "" : String(v[k])));
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

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

// Build a minimal ICS calendar file (VEVENT).
function buildIcs(opts: {
  uid: string;
  summary: string;
  description: string;
  location?: string | null;
  startIso: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
  timeZone?: string | null;
}) {
  const start = localToUtc(opts.startIso, opts.startTime, opts.timeZone);
  const end = new Date(start.getTime() + opts.durationMinutes * 60000);
  const fmt = (dt: Date) =>
    dt.getUTCFullYear().toString().padStart(4, "0") +
    (dt.getUTCMonth() + 1).toString().padStart(2, "0") +
    dt.getUTCDate().toString().padStart(2, "0") + "T" +
    dt.getUTCHours().toString().padStart(2, "0") +
    dt.getUTCMinutes().toString().padStart(2, "0") + "00Z";
  const esc = (s: string) => (s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cutzioo//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@cutzioo.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.summary)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function googleCalUrl(opts: {
  summary: string;
  details: string;
  location?: string | null;
  startIso: string;
  startTime: string;
  durationMinutes: number;
  timeZone?: string | null;
}) {
  const start = localToUtc(opts.startIso, opts.startTime, opts.timeZone);
  const end = new Date(start.getTime() + opts.durationMinutes * 60000);
  const fmt = (dt: Date) =>
    dt.getUTCFullYear().toString().padStart(4, "0") +
    (dt.getUTCMonth() + 1).toString().padStart(2, "0") +
    dt.getUTCDate().toString().padStart(2, "0") + "T" +
    dt.getUTCHours().toString().padStart(2, "0") +
    dt.getUTCMinutes().toString().padStart(2, "0") + "00Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.summary,
    details: opts.details,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

type LocaleKey = "en" | "el" | "es" | "nl" | "pl";
const EMAIL_STRINGS: Record<LocaleKey, Record<string, string>> = {
  en: { confirmed: "Booking confirmed", hi: "Hi", bookedFor: "you're booked for", date: "Date", time: "Time", service: "Service", price: "Price", stylist: "Your stylist", location: "Location", note: "Note", openMaps: "Open in Maps →", reschedule: "Reschedule", addCal: "Add to Calendar", cancel: "Cancel", icsHint: "An .ics invite is attached — tap it to add to your calendar.", min: "min", subject: "Your booking at {{businessName}} is confirmed" },
  el: { confirmed: "Η κράτηση επιβεβαιώθηκε", hi: "Γεια σου", bookedFor: "έκλεισες ραντεβού για", date: "Ημερομηνία", time: "Ώρα", service: "Υπηρεσία", price: "Τιμή", stylist: "Ο stylist σου", location: "Τοποθεσία", note: "Σημείωση", openMaps: "Άνοιγμα στους Χάρτες →", reschedule: "Αλλαγή ώρας", addCal: "Προσθήκη στο ημερολόγιο", cancel: "Ακύρωση", icsHint: "Επισυνάπτεται αρχείο .ics για το ημερολόγιό σου.", min: "λεπτά", subject: "Η κράτησή σου στο {{businessName}} επιβεβαιώθηκε" },
  es: { confirmed: "Reserva confirmada", hi: "Hola", bookedFor: "tu cita es para", date: "Fecha", time: "Hora", service: "Servicio", price: "Precio", stylist: "Tu estilista", location: "Ubicación", note: "Nota", openMaps: "Abrir en Maps →", reschedule: "Reprogramar", addCal: "Añadir al calendario", cancel: "Cancelar", icsHint: "Se adjunta un archivo .ics para tu calendario.", min: "min", subject: "Tu reserva en {{businessName}} está confirmada" },
  nl: { confirmed: "Afspraak bevestigd", hi: "Hoi", bookedFor: "je afspraak is voor", date: "Datum", time: "Tijd", service: "Dienst", price: "Prijs", stylist: "Jouw stylist", location: "Locatie", note: "Notitie", openMaps: "Openen in Maps →", reschedule: "Verzetten", addCal: "Aan agenda toevoegen", cancel: "Annuleren", icsHint: "Er is een .ics-uitnodiging bijgevoegd voor je agenda.", min: "min", subject: "Je afspraak bij {{businessName}} is bevestigd" },
  pl: { confirmed: "Rezerwacja potwierdzona", hi: "Cześć", bookedFor: "masz rezerwację na", date: "Data", time: "Godzina", service: "Usługa", price: "Cena", stylist: "Twój stylista", location: "Lokalizacja", note: "Notatka", openMaps: "Otwórz w Mapach →", reschedule: "Zmień termin", addCal: "Dodaj do kalendarza", cancel: "Anuluj", icsHint: "Plik .ics jest w załączniku — dodaj go do kalendarza.", min: "min", subject: "Twoja rezerwacja w {{businessName}} jest potwierdzona" },
};
const INTL_LOCALE: Record<LocaleKey, string> = { en: "en-US", el: "el-GR", es: "es-ES", nl: "nl-NL", pl: "pl-PL" };

function buildHtml(opts: {
  businessName: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  price?: number | string | null;
  notes?: string | null;
  manageUrl?: string | null;
  accent: string;
  bookingId?: string;
  address?: string | null;
  stylistName?: string | null;
  stylistAvatar?: string | null;
  gcalUrl: string;
  locale?: LocaleKey;
}) {
  const {
    businessName, customerName, serviceName, appointmentDate, appointmentTime,
    durationMinutes, price, notes, manageUrl, accent, bookingId,
    address, stylistName, stylistAvatar, gcalUrl,
  } = opts;
  const T = EMAIL_STRINGS[opts.locale || "en"] || EMAIL_STRINGS.en;

  const cancelUrl = manageUrl ? `${manageUrl}` : "";
  const rescheduleUrl = manageUrl ? `${manageUrl}` : "";
  const mapUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  const row = (label: string, value: string, accentColor?: string) => `
    <tr><td style="padding:0 0 6px;font-size:12px;color:#8c8c92;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">${escapeHtml(label)}</td></tr>
    <tr><td style="padding:0 0 16px;font-size:16px;font-weight:600;color:${accentColor || "#121214"};">${value}</td></tr>`;

  const stylistBlock = stylistName ? `
    <tr>
      <td style="padding:18px 22px 4px;">
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              ${stylistAvatar
                ? `<img src="${escapeHtml(stylistAvatar)}" width="36" height="36" style="border-radius:50%;display:block;border:1px solid #eee;" alt="">`
                : `<div style="width:36px;height:36px;border-radius:50%;background:${accent};opacity:0.85;"></div>`}
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:11px;color:#8c8c92;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">${escapeHtml(T.stylist)}</div>
              <div style="font-size:15px;font-weight:650;color:#121214;">${escapeHtml(stylistName)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html lang="${opts.locale || "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1c;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e8e8ec;">

        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="display:inline-block;width:40px;height:40px;border-radius:12px;background:${accent};opacity:0.9;"></div>
        </td></tr>

        <tr><td style="padding:18px 32px 0;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:#8c8c92;">${escapeHtml(T.confirmed)}</p>
          <h1 style="margin:0;font-size:26px;font-weight:650;letter-spacing:-0.02em;line-height:1.2;color:#121214;">${escapeHtml(businessName)}</h1>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0;font-size:15px;line-height:1.55;color:#4a4a50;text-align:center;">
            ${escapeHtml(T.hi)} ${escapeHtml(customerName || "")}, ${escapeHtml(T.bookedFor)} <strong style="color:#121214;">${escapeHtml(serviceName)}</strong>.
          </p>
        </td></tr>

        <!-- Appointment card -->
        <tr><td style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafb;border-radius:20px;border:1px solid #eeeff2;">
            <tr><td style="padding:22px 22px 6px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${row(T.date, escapeHtml(appointmentDate))}
                ${row(T.time, `${escapeHtml(appointmentTime)}  <span style="color:#8c8c92;font-weight:500;font-size:14px;">· ${durationMinutes} ${escapeHtml(T.min)}</span>`)}
                ${row(T.service, escapeHtml(serviceName))}
                ${price != null ? row(T.price, `€${escapeHtml(String(price))}`, accent) : ""}
              </table>
            </td></tr>
            ${stylistBlock}
            ${address ? `
            <tr><td style="padding:14px 22px 20px;">
              <div style="font-size:11px;color:#8c8c92;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:6px;">${escapeHtml(T.location)}</div>
              <div style="font-size:14px;color:#3a3a3f;line-height:1.5;">${escapeHtml(address)}</div>
              <a href="${escapeHtml(mapUrl)}" style="display:inline-block;margin-top:8px;font-size:13px;color:${accent};text-decoration:none;font-weight:600;">${escapeHtml(T.openMaps)}</a>
            </td></tr>` : ""}
            ${notes ? `
            <tr><td style="padding:0 22px 20px;">
              <div style="font-size:11px;color:#8c8c92;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:6px;">${escapeHtml(T.note)}</div>
              <div style="font-size:14px;color:#3a3a3f;line-height:1.5;">${escapeHtml(notes)}</div>
            </td></tr>` : ""}
          </table>
        </td></tr>

        <!-- Actions -->
        ${manageUrl ? `<tr><td style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 8px;">
              <a href="${escapeHtml(rescheduleUrl)}" style="display:block;text-align:center;background:#121214;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 0;border-radius:14px;">${escapeHtml(T.reschedule)}</a>
            </td></tr>
            <tr><td style="padding:0 0 8px;">
              <a href="${escapeHtml(gcalUrl)}" style="display:block;text-align:center;background:#ffffff;color:#121214;text-decoration:none;font-weight:600;font-size:15px;padding:14px 0;border-radius:14px;border:1px solid #e8e8ec;">${escapeHtml(T.addCal)}</a>
            </td></tr>
            <tr><td>
              <a href="${escapeHtml(cancelUrl)}" style="display:block;text-align:center;background:#ffffff;color:#ff3b30;text-decoration:none;font-weight:600;font-size:15px;padding:14px 0;border-radius:14px;border:1px solid #e8e8ec;">${escapeHtml(T.cancel)}</a>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#8c8c92;">${escapeHtml(T.icsHint)}</p>
        </td></tr>` : ""}

        <tr><td style="padding:28px 32px 32px;text-align:center;">
          <div style="height:1px;background:#eeeff2;margin-bottom:22px;"></div>
          ${bookingId ? `<div style="font-size:11px;color:#9a9aa2;font-family:'SF Mono',SFMono-Regular,monospace;letter-spacing:0.04em;margin-bottom:10px;">REF · ${escapeHtml(String(bookingId).slice(0, 8))}</div>` : ""}
          <a href="${APP_URL}" style="text-decoration:none;font-size:11px;color:#8c8c92;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Powered by <span style="color:${accent};font-weight:700;">Cutzioo</span></a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const functionSecret = Deno.env.get("FUNCTION_SECRET");
  const providedSecret = req.headers.get("x-functions-secret") ?? "";
  if (functionSecret && providedSecret !== functionSecret) {
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Brevo connector not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 });
    }

    const body = await req.json();
    const { cancelToken, accentColor } = body as { cancelToken?: string; accentColor?: string };

    if (!cancelToken) {
      return new Response(JSON.stringify({ success: false, error: "cancelToken required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfigured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: apptRow, error: apptErr } = await supabase
      .from("appointments")
      .select("id, user_id, stylist_id, appointment_date, appointment_time, price, notes, customer_id, service_id, created_at")
      .eq("cancel_token", cancelToken)
      .maybeSingle();

    if (apptErr || !apptRow) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const createdMs = new Date(apptRow.created_at as string).getTime();
    if (Date.now() - createdMs > 15 * 60 * 1000) {
      return new Response(JSON.stringify({ success: false, error: "Token expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const [{ data: customer }, { data: service }, { data: profile }, stylistRes] = await Promise.all([
      supabase.from("customers").select("name, email, phone").eq("id", apptRow.customer_id).maybeSingle(),
      supabase.from("services").select("name, price, duration").eq("id", apptRow.service_id).maybeSingle(),
      supabase.from("profiles").select("business_name, full_name, brand_color, sender_email, sender_name, address, timezone, booking_locale").eq("id", apptRow.user_id).maybeSingle(),
      apptRow.stylist_id
        ? supabase.from("stylists").select("name, avatar_url").eq("id", apptRow.stylist_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const stylist = (stylistRes as any)?.data ?? null;

    const userId = apptRow.user_id;
    const customerEmail = customer?.email ?? null;
    const customerName = customer?.name ?? "there";
    const customerPhone = customer?.phone ?? null;
    const businessName = profile?.business_name || profile?.full_name || "Cutzioo";
    const serviceName = service?.name || "Service";
    const durationMinutes = service?.duration ?? 30;
    const price = apptRow.price ?? service?.price ?? null;
    const notes = apptRow.notes ?? null;
    const address = profile?.address ?? null;
    const bookingId = String(apptRow.id).slice(0, 8);
    const startIso = String(apptRow.appointment_date);
    const startTime = String(apptRow.appointment_time).slice(0, 5);
    const tz = profile?.timezone || "UTC";
    const rawLocale = String((profile as any)?.booking_locale || "en");
    const locale = (["en", "el", "es", "nl", "pl"].includes(rawLocale) ? rawLocale : "en") as LocaleKey;
    const L = EMAIL_STRINGS[locale];
    const appointmentDate = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
      timeZone: tz,
    }).format(localToUtc(startIso, startTime, tz));
    const appointmentTime = startTime;

    let template: any = null;
    const { data: tplData } = await supabase.from("message_templates").select("*").eq("user_id", userId).maybeSingle();
    template = tplData;

    if (template?.enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accent = template?.accent_color || accentColor || profile?.brand_color || "#e0c4a8";
    const finalManageUrl = `${APP_URL}/manage/${cancelToken}`;

    const vars = { customerName, customerEmail, customerPhone, businessName, serviceName, appointmentDate, appointmentTime, price };
    const subject = render(template?.email_subject || L.subject, vars);
    const smsText = render(
      template?.sms_body || "{{businessName}}: {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} confirmed.",
      vars
    ) + ` Manage: ${finalManageUrl}`;

    const gcalUrl = googleCalUrl({
      summary: `${businessName} — ${serviceName}`,
      details: `Booking at ${businessName}${notes ? `\n\nNote: ${notes}` : ""}\n\nManage: ${finalManageUrl}`,
      location: address,
      startIso, startTime, durationMinutes,
      timeZone: profile?.timezone || "UTC",
    });

    const html = buildHtml({
      businessName, customerName, serviceName,
      appointmentDate, appointmentTime, durationMinutes,
      price, notes, manageUrl: finalManageUrl, accent, bookingId,
      address, stylistName: stylist?.name ?? null, stylistAvatar: stylist?.avatar_url ?? null,
      gcalUrl, locale,
    });

    const textBody = `${subject}\n\nHi ${customerName || "there"},\n\n${serviceName} on ${appointmentDate} at ${appointmentTime} (${durationMinutes} min)${price != null ? ` · €${price}` : ""}${address ? `\n${address}` : ""}${stylist?.name ? `\nStylist: ${stylist.name}` : ""}\n\n${finalManageUrl ? `Manage your booking: ${finalManageUrl}\n\n` : ""}Powered by Cutzioo — https://cutzioo.com`;

    const ics = buildIcs({
      uid: String(apptRow.id),
      summary: `${businessName} — ${serviceName}`,
      description: `Booking at ${businessName}${notes ? `\n\nNote: ${notes}` : ""}\n\nManage: ${finalManageUrl}`,
      location: address,
      startIso, startTime, durationMinutes,
      timeZone: profile?.timezone || "UTC",
    });
    // base64 encode
    const icsB64 = btoa(unescape(encodeURIComponent(ics)));

    const results: any = {};

    if (customerEmail) {
      const emailRes = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: businessName || SENDER_FALLBACK_NAME, email: SENDER_EMAIL },
          replyTo: { email: SENDER_EMAIL, name: businessName || SENDER_FALLBACK_NAME },
          to: [{ email: customerEmail, name: customerName || customerEmail }],
          subject,
          htmlContent: html,
          textContent: textBody,
          attachment: [{ name: "booking.ics", content: icsB64 }],
        }),
      });
      const data = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.error("Brevo email failed:", emailRes.status, data);
        results.email = { error: data, status: emailRes.status };
      } else results.email = data;
    }

    if (customerPhone) {
      const smsRes = await fetch(`${GATEWAY_URL}/transactionalSMS/sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: (businessName || "Booking").substring(0, 11),
          recipient: customerPhone,
          content: smsText,
          type: "transactional",
        }),
      });
      const data = await smsRes.json().catch(() => ({}));
      if (!smsRes.ok) results.sms = { error: data, status: smsRes.status };
      else results.sms = data;
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
