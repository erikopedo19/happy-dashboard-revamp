
-- Profile toggles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS accepts_waitlist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_cancellation_alerts boolean DEFAULT true;

-- Waitlist table
CREATE TABLE IF NOT EXISTS public.cancellation_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL,
  client_user_id uuid,
  client_email text NOT NULL,
  client_name text,
  status text NOT NULL DEFAULT 'waiting', -- waiting | offered | claimed | expired | cancelled
  offered_at timestamptz,
  offer_expires_at timestamptz,
  offered_appointment_id uuid,
  claim_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_barber_status ON public.cancellation_waitlist(barber_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_token ON public.cancellation_waitlist(claim_token);

ALTER TABLE public.cancellation_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "barbers view own waitlist" ON public.cancellation_waitlist
  FOR SELECT USING (auth.uid() = barber_id);

CREATE POLICY "clients view own waitlist entries" ON public.cancellation_waitlist
  FOR SELECT USING (auth.uid() = client_user_id OR lower(client_email) = lower(coalesce(auth.jwt() ->> 'email','')));

CREATE POLICY "anyone authenticated can join waitlist" ON public.cancellation_waitlist
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users can cancel own waitlist" ON public.cancellation_waitlist
  FOR UPDATE USING (auth.uid() = client_user_id OR auth.uid() = barber_id);

CREATE POLICY "users can delete own waitlist" ON public.cancellation_waitlist
  FOR DELETE USING (auth.uid() = client_user_id OR auth.uid() = barber_id);

-- Join waitlist RPC
CREATE OR REPLACE FUNCTION public.join_cancellation_waitlist(_barber_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_name text := auth.jwt() -> 'user_metadata' ->> 'full_name';
  v_id uuid;
  v_accepts boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(accepts_waitlist, false) INTO v_accepts FROM profiles WHERE id = _barber_id;
  IF NOT v_accepts THEN
    RETURN jsonb_build_object('success', false, 'error', 'This barber is not accepting waitlist requests');
  END IF;

  -- prevent duplicate active entry
  IF EXISTS (SELECT 1 FROM cancellation_waitlist 
             WHERE barber_id = _barber_id AND client_user_id = v_user_id 
               AND status IN ('waiting','offered') AND expires_at > now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already on the waitlist for this barber');
  END IF;

  INSERT INTO cancellation_waitlist (barber_id, client_user_id, client_email, client_name)
  VALUES (_barber_id, v_user_id, v_email, v_name)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- Claim by token
CREATE OR REPLACE FUNCTION public.claim_waitlist_offer(_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT * INTO v_row FROM cancellation_waitlist WHERE claim_token = _token;
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid offer');
  END IF;
  IF v_row.status <> 'offered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer available');
  END IF;
  IF v_row.offer_expires_at < now() THEN
    UPDATE cancellation_waitlist SET status='expired', updated_at=now() WHERE id=v_row.id;
    RETURN jsonb_build_object('success', false, 'error', 'Offer expired');
  END IF;

  UPDATE cancellation_waitlist SET status='claimed', updated_at=now() WHERE id=v_row.id;

  RETURN jsonb_build_object(
    'success', true, 
    'barber_id', v_row.barber_id,
    'appointment_id', v_row.offered_appointment_id
  );
END;
$$;

-- Trigger on appointment cancel: offer slot to next in queue
CREATE OR REPLACE FUNCTION public.trigger_offer_waitlist_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net, extensions AS $$
DECLARE
  v_next RECORD;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/waitlist-offer';
BEGIN
  -- only act on transition to cancelled
  IF NEW.status <> 'cancelled' OR COALESCE(OLD.status,'') = 'cancelled' THEN
    RETURN NEW;
  END IF;
  -- only future appts
  IF NEW.appointment_date < CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- pick next waiting client for this barber
  SELECT * INTO v_next FROM cancellation_waitlist
   WHERE barber_id = NEW.user_id
     AND status = 'waiting'
     AND expires_at > now()
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_next IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE cancellation_waitlist
     SET status='offered', offered_at=now(), 
         offer_expires_at = now() + interval '5 minutes',
         offered_appointment_id = NEW.id,
         updated_at = now()
   WHERE id = v_next.id;

  -- in-app notification
  IF v_next.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, appointment_id)
    VALUES (v_next.client_user_id, 'waitlist_offer', 'A slot just opened up!',
      'A cancellation freed ' || to_char(NEW.appointment_date,'Mon DD') || ' at ' || to_char(NEW.appointment_time,'HH24:MI') || '. You have 5 minutes to claim it.',
      NEW.id);
  END IF;

  -- email via edge function (fire and forget)
  BEGIN
    PERFORM net.http_post(
      url := v_fn_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon,'apikey', v_anon),
      body := jsonb_build_object('waitlistId', v_next.id, 'claimToken', v_next.claim_token)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_cancel_waitlist ON public.appointments;
CREATE TRIGGER on_appointment_cancel_waitlist
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_offer_waitlist_on_cancel();

-- Expire offers after 5 min and roll to next
CREATE OR REPLACE FUNCTION public.expire_waitlist_offers()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net, extensions AS $$
DECLARE
  v_expired RECORD;
  v_next RECORD;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2lmcmh6bG14Y2RpaHpkdG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI3NjgsImV4cCI6MjA3OTQ4ODc2OH0.D2aMLYk9XJbBJNeoTv1bh_btt6L5OFosAMqNms_-TWg';
  v_fn_url text := 'https://idcifrhzlmxcdihzdtmn.supabase.co/functions/v1/waitlist-offer';
BEGIN
  FOR v_expired IN 
    SELECT * FROM cancellation_waitlist 
    WHERE status='offered' AND offer_expires_at < now()
  LOOP
    UPDATE cancellation_waitlist SET status='expired', updated_at=now() WHERE id=v_expired.id;

    SELECT * INTO v_next FROM cancellation_waitlist
     WHERE barber_id = v_expired.barber_id
       AND status='waiting' AND expires_at > now()
     ORDER BY created_at ASC LIMIT 1;

    IF v_next IS NOT NULL THEN
      UPDATE cancellation_waitlist
        SET status='offered', offered_at=now(),
            offer_expires_at = now() + interval '5 minutes',
            offered_appointment_id = v_expired.offered_appointment_id,
            updated_at = now()
        WHERE id = v_next.id;

      IF v_next.client_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, body, appointment_id)
        VALUES (v_next.client_user_id, 'waitlist_offer', 'A slot just opened up!',
          'You are next in line for a cancellation. 5 minutes to claim it.',
          v_expired.offered_appointment_id);
      END IF;

      BEGIN
        PERFORM net.http_post(
          url := v_fn_url,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon,'apikey', v_anon),
          body := jsonb_build_object('waitlistId', v_next.id, 'claimToken', v_next.claim_token)
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$$;
