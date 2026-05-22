-- ============================================================
-- reviews table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating         integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  reviewer_name  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owner can view their reviews"
  ON public.reviews FOR SELECT
  USING (business_id = auth.uid());

-- ============================================================
-- Trigger: keep profiles.rating + profiles.rating_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_business_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _bid uuid;
BEGIN
  _bid := COALESCE(NEW.business_id, OLD.business_id);
  UPDATE public.profiles
  SET
    rating       = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE business_id = _bid),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE business_id = _bid)
  WHERE id = _bid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_rating ON public.reviews;
CREATE TRIGGER trg_recalculate_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_rating();

-- ============================================================
-- RPC: submit_review (public – authenticated via cancel_token)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_review(
  _cancel_token uuid,
  _rating       integer,
  _comment      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
  v_business_id    uuid;
  v_reviewer_name  text;
  v_status         text;
BEGIN
  SELECT a.id, a.user_id, COALESCE(a.status, 'scheduled'), c.name
    INTO v_appointment_id, v_business_id, v_status, v_reviewer_name
    FROM public.appointments a
    JOIN public.customers c ON c.id = a.customer_id
   WHERE a.cancel_token = _cancel_token
   LIMIT 1;

  IF v_appointment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  INSERT INTO public.reviews (appointment_id, business_id, rating, comment, reviewer_name)
  VALUES (v_appointment_id, v_business_id, _rating, _comment, v_reviewer_name)
  ON CONFLICT (appointment_id) DO UPDATE
    SET rating  = EXCLUDED.rating,
        comment = EXCLUDED.comment;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_review(uuid, integer, text) TO anon, authenticated;

-- ============================================================
-- RPC: get_reviews_for_business (public)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_reviews_for_business(_business_id uuid)
RETURNS TABLE(
  id            uuid,
  rating        integer,
  comment       text,
  reviewer_name text,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.rating, r.comment, r.reviewer_name, r.created_at
    FROM public.reviews r
   WHERE r.business_id = _business_id
   ORDER BY r.created_at DESC
   LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_reviews_for_business(uuid) TO anon, authenticated;

-- ============================================================
-- Update get_my_bookings: add cancel_token, has_review, booking_link
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE(
  id               uuid,
  appointment_date date,
  appointment_time time without time zone,
  status           text,
  service_name     text,
  barber_id        uuid,
  barber_name      text,
  cancel_token     uuid,
  has_review       boolean,
  booking_link     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    COALESCE(a.status, 'scheduled')                                       AS status,
    s.name                                                                AS service_name,
    a.user_id                                                             AS barber_id,
    COALESCE(p.business_name, p.full_name)                               AS barber_name,
    a.cancel_token,
    EXISTS(SELECT 1 FROM public.reviews rv WHERE rv.appointment_id = a.id) AS has_review,
    p.booking_link
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
  ORDER BY a.appointment_date DESC, a.appointment_time DESC
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_bookings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;
