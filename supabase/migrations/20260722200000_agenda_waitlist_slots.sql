-- Optimizes and extends cancellation waitlist for the agenda UI.
-- Adds indexes, a helper to fetch active offers, and auto-claims offers when a slot is rebooked.

-- 1. Index for fast lookup of active waitlist offers in the agenda.
CREATE INDEX IF NOT EXISTS idx_waitlist_barber_status_offer
  ON public.cancellation_waitlist(barber_id, status, offered_appointment_id);

-- 2. Function: return active waitlist offers for a barber on a given date.
CREATE OR REPLACE FUNCTION public.get_waitlist_offers_for_agenda(
  p_barber_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  offered_appointment_id uuid,
  client_email text,
  client_name text,
  offer_expires_at timestamptz,
  seconds_left integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    w.id,
    w.offered_appointment_id,
    w.client_email,
    w.client_name,
    w.offer_expires_at,
    GREATEST(0, EXTRACT(EPOCH FROM (w.offer_expires_at - now()))::integer) AS seconds_left
  FROM public.cancellation_waitlist w
  WHERE w.barber_id = p_barber_id
    AND w.status = 'offered'
    AND w.offer_expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = w.offered_appointment_id
        AND a.user_id = p_barber_id
        AND a.appointment_date = p_date
        AND a.status = 'cancelled'
    )
  ORDER BY w.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_offers_for_agenda(uuid, date) TO authenticated;

-- 3a. Range variant for the calendar (fetch whole week at once).
CREATE OR REPLACE FUNCTION public.get_waitlist_offers_for_agenda_range(
  p_barber_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  id uuid,
  offered_appointment_id uuid,
  client_email text,
  client_name text,
  offer_expires_at timestamptz,
  seconds_left integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    w.id,
    w.offered_appointment_id,
    w.client_email,
    w.client_name,
    w.offer_expires_at,
    GREATEST(0, EXTRACT(EPOCH FROM (w.offer_expires_at - now()))::integer) AS seconds_left
  FROM public.cancellation_waitlist w
  WHERE w.barber_id = p_barber_id
    AND w.status = 'offered'
    AND w.offer_expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = w.offered_appointment_id
        AND a.user_id = p_barber_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
        AND a.status = 'cancelled'
    )
  ORDER BY w.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_offers_for_agenda_range(uuid, date, date) TO authenticated;

-- 4. Trigger: when a new appointment is created, claim any active waitlist offer
--    that was made for the same cancelled slot (same barber, date and time).
CREATE OR REPLACE FUNCTION public.claim_waitlist_when_slot_rebooked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only react to newly inserted scheduled appointments
  IF TG_OP = 'INSERT' AND NEW.status = 'scheduled' THEN
    UPDATE public.cancellation_waitlist w
       SET status = 'claimed', updated_at = now()
      FROM public.appointments a
     WHERE w.status = 'offered'
       AND w.barber_id = NEW.user_id
       AND a.user_id = NEW.user_id
       AND a.id = w.offered_appointment_id
       AND a.status = 'cancelled'
       AND a.appointment_date = NEW.appointment_date
       AND a.appointment_time = NEW.appointment_time;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_insert_claim_waitlist ON public.appointments;
CREATE TRIGGER on_appointment_insert_claim_waitlist
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_waitlist_when_slot_rebooked();
