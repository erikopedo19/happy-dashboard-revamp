
-- Stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  music_track_id text,
  music_title text,
  music_artist text,
  music_preview_url text,
  music_artwork_url text,
  duration_seconds int DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 days')
);

GRANT SELECT ON public.stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Barbers can insert their own stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Barbers can delete their own stories"
  ON public.stories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX stories_user_active_idx ON public.stories(user_id, expires_at DESC);

-- Storage policies for stories bucket (owner-owned folder: {user_id}/*)
CREATE POLICY "Anyone can read story media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Barbers upload their own story media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Barbers delete their own story media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- List active stories with barber info
CREATE OR REPLACE FUNCTION public.list_active_stories()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(t ORDER BY t.latest DESC), '[]'::jsonb)
  FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.business_name, p.full_name) AS name,
      p.avatar_url,
      p.booking_link,
      MAX(s.created_at) AS latest,
      jsonb_agg(jsonb_build_object(
        'id', s.id,
        'media_path', s.media_path,
        'media_type', s.media_type,
        'music_title', s.music_title,
        'music_artist', s.music_artist,
        'music_preview_url', s.music_preview_url,
        'music_artwork_url', s.music_artwork_url,
        'duration_seconds', s.duration_seconds,
        'created_at', s.created_at,
        'expires_at', s.expires_at
      ) ORDER BY s.created_at) AS stories
    FROM public.stories s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.expires_at > now()
    GROUP BY p.id, p.business_name, p.full_name, p.avatar_url, p.booking_link
  ) t;
$$;

-- Cleanup expired stories (rows only; storage cleanup done by edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.stories WHERE expires_at < now();
$$;

-- Schedule daily cleanup at 03:15 UTC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories') THEN
    PERFORM cron.schedule(
      'cleanup-expired-stories',
      '15 3 * * *',
      $c$
        SELECT net.http_post(
          url := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/cleanup-expired-stories',
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := '{}'::jsonb
        );
      $c$
    );
  END IF;
END $$;

-- Extend booking email trigger with stylist info, address, duration
CREATE OR REPLACE FUNCTION public.trigger_send_booking_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_customer RECORD;
  v_service RECORD;
  v_profile RECORD;
  v_stylist RECORD;
  v_app_url text := 'https://cutzioo.com';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/send-booking-confirmation';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_date_long text;
BEGIN
  SELECT name, email, phone INTO v_customer FROM public.customers WHERE id = NEW.customer_id;
  SELECT name, price, duration INTO v_service FROM public.services WHERE id = NEW.service_id;
  SELECT full_name, business_name, brand_color, sender_email, sender_name, address, timezone
    INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.stylist_id IS NOT NULL THEN
    SELECT name, avatar_url INTO v_stylist FROM public.stylists WHERE id = NEW.stylist_id;
  END IF;

  IF v_customer.email IS NULL AND v_customer.phone IS NULL THEN
    RETURN NEW;
  END IF;

  v_date_long := to_char(NEW.appointment_date, 'FMDay, FMMonth FMDD, YYYY');

  PERFORM net.http_post(
    url := v_fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'customerEmail', v_customer.email,
      'customerName', COALESCE(v_customer.name, 'there'),
      'customerPhone', v_customer.phone,
      'businessName', COALESCE(v_profile.business_name, v_profile.full_name, 'Your appointment'),
      'serviceName', COALESCE(v_service.name, 'Service'),
      'durationMinutes', COALESCE(v_service.duration, 30),
      'appointmentDate', v_date_long,
      'appointmentDateIso', to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      'appointmentTime', to_char(NEW.appointment_time, 'HH24:MI'),
      'timezone', COALESCE(v_profile.timezone, 'UTC'),
      'price', COALESCE(NEW.price, v_service.price),
      'notes', NEW.notes,
      'address', v_profile.address,
      'stylistName', v_stylist.name,
      'stylistAvatar', v_stylist.avatar_url,
      'bookingId', substring(NEW.id::text, 1, 8),
      'cancelToken', NEW.cancel_token,
      'manageUrl', v_app_url || '/manage/' || NEW.cancel_token,
      'accentColor', COALESCE(v_profile.brand_color, '#e0c4a8'),
      'senderEmail', COALESCE(v_profile.sender_email, 'noreply@cutzioo.com'),
      'senderName', COALESCE(v_profile.sender_name, v_profile.business_name, v_profile.full_name, 'Cutzioo')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.email_logs(recipient_email, status, error_message, email_type)
  VALUES (COALESCE(v_customer.email,'unknown'), 'trigger_error', SQLERRM, 'booking_confirmation');
  RETURN NEW;
END;
$function$;
