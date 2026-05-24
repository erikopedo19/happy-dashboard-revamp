import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = 'https://cutzioo.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { waitlistId, claimToken } = body;
    if (!waitlistId || !claimToken) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: entry, error } = await supabase
      .from('cancellation_waitlist')
      .select('id, client_email, client_name, barber_id, offered_appointment_id, offer_expires_at')
      .eq('id', waitlistId)
      .maybeSingle();

    if (error || !entry) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up barber + check client opt-in
    const { data: client } = await supabase
      .from('profiles')
      .select('notify_cancellation_alerts')
      .eq('id', entry.barber_id) // not used for client; we check via email instead
      .maybeSingle();

    const { data: barber } = await supabase
      .from('profiles')
      .select('business_name, full_name, brand_color')
      .eq('id', entry.barber_id)
      .maybeSingle();

    const { data: appt } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time')
      .eq('id', entry.offered_appointment_id)
      .maybeSingle();

    const claimUrl = `${APP_URL}/waitlist/claim/${claimToken}`;
    const barberName = barber?.business_name || barber?.full_name || 'Your barber';
    const accent = barber?.brand_color || '#e0c4a8';
    const when = appt
      ? `${appt.appointment_date} at ${String(appt.appointment_time).slice(0, 5)}`
      : 'soon';

    if (RESEND_API_KEY && entry.client_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Cutzioo <noreply@cutzioo.com>',
          to: [entry.client_email],
          subject: `A slot just opened with ${barberName}!`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;border-radius:16px;">
              <div style="height:6px;border-radius:6px;background:${accent};margin-bottom:20px;"></div>
              <h1 style="font-size:22px;margin:0 0 8px;color:#111;">🎉 A slot just opened!</h1>
              <p style="color:#444;line-height:1.5;">Hi ${entry.client_name || 'there'}, a cancellation just freed a slot with <b>${barberName}</b> on <b>${when}</b>.</p>
              <p style="color:#444;line-height:1.5;">You're first in line — you have <b>5 minutes</b> to claim it before it rolls to the next person.</p>
              <a href="${claimUrl}" style="display:inline-block;background:${accent};color:#fff;font-weight:600;padding:14px 24px;border-radius:12px;text-decoration:none;margin-top:12px;">Claim this slot</a>
              <p style="color:#999;font-size:12px;margin-top:24px;">Offer expires at ${new Date(entry.offer_expires_at).toLocaleTimeString()}.</p>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
