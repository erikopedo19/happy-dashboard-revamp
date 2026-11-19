-- Comeback coupons: "book N times (optionally within a period) and get something free".
-- Free for every barber for 5 days from first switching it on; after that it needs an active subscription.

CREATE TABLE IF NOT EXISTS public.comeback_programs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  bookings_required integer NOT NULL DEFAULT 5,
  period_days integer,
  reward text NOT NULL DEFAULT 'Free haircut',
  trial_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comeback_programs_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  CONSTRAINT comeback_programs_bookings_required_check CHECK (bookings_required BETWEEN 2 AND 30),
  CONSTRAINT comeback_programs_period_days_check CHECK (period_days IS NULL OR period_days BETWEEN 7 AND 730),
  CONSTRAINT comeback_programs_reward_check CHECK (char_length(btrim(reward)) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX IF NOT EXISTS comeback_programs_slug_key ON public.comeback_programs (slug);

CREATE TABLE IF NOT EXISTS public.comeback_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comeback_redemptions_lookup_idx
  ON public.comeback_redemptions (user_id, customer_id, redeemed_at DESC);

-- The trial clock is set by the database the first time the coupon is switched on and can't be reset from the app.
CREATE OR REPLACE FUNCTION public.comeback_programs_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.slug := lower(btrim(NEW.slug));
  NEW.reward := btrim(NEW.reward);
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.trial_started_at := OLD.trial_started_at;
  ELSE
    NEW.trial_started_at := NULL;
  END IF;
  IF NEW.enabled AND NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comeback_programs_before_write ON public.comeback_programs;
CREATE TRIGGER comeback_programs_before_write
BEFORE INSERT OR UPDATE ON public.comeback_programs
FOR EACH ROW EXECUTE FUNCTION public.comeback_programs_before_write();

ALTER TABLE public.comeback_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comeback_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read their comeback program" ON public.comeback_programs;
CREATE POLICY "Owners read their comeback program" ON public.comeback_programs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners create their comeback program" ON public.comeback_programs;
CREATE POLICY "Owners create their comeback program" ON public.comeback_programs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners update their comeback program" ON public.comeback_programs;
CREATE POLICY "Owners update their comeback program" ON public.comeback_programs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Redemptions are written only through redeem_comeback_reward(), which checks the reward was earned.
DROP POLICY IF EXISTS "Owners read their comeback redemptions" ON public.comeback_redemptions;
CREATE POLICY "Owners read their comeback redemptions" ON public.comeback_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.comeback_programs, public.comeback_redemptions FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.comeback_programs TO authenticated;
GRANT SELECT ON public.comeback_redemptions TO authenticated;

-- 5-day trial from first enable, or an active subscription.
CREATE OR REPLACE FUNCTION public.comeback_owner_has_access(_user_id uuid, _trial_started_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_trial_started_at IS NOT NULL AND _trial_started_at + interval '5 days' > now())
    OR EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE (s.user_id = _user_id
             OR lower(s.email) = lower((SELECT u.email FROM auth.users u WHERE u.id = _user_id)))
        AND s.subscribed = true
        AND (s.subscription_end IS NULL OR s.subscription_end > now())
    );
$$;
REVOKE ALL ON FUNCTION public.comeback_owner_has_access(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

-- Completed visits that count toward the next reward: after the last redemption, inside the period if there is one.
CREATE OR REPLACE FUNCTION public.comeback_visit_count(_user_id uuid, _customer_id uuid, _period_days integer)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer
  FROM public.appointments a
  WHERE a.user_id = _user_id
    AND a.customer_id = _customer_id
    AND a.status = 'completed'
    AND (_period_days IS NULL OR a.appointment_date >= current_date - _period_days)
    AND a.appointment_date > COALESCE(
      (SELECT max(r.redeemed_at)::date FROM public.comeback_redemptions r
        WHERE r.user_id = _user_id AND r.customer_id = _customer_id),
      date '1900-01-01');
$$;
REVOKE ALL ON FUNCTION public.comeback_visit_count(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

-- Public: the offer behind cutzioo.com/c/<slug>, or a shop's offer by its id (booking page).
CREATE OR REPLACE FUNCTION public.get_comeback_program(_slug text DEFAULT NULL, _business_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', cp.slug,
    'bookings_required', cp.bookings_required,
    'period_days', cp.period_days,
    'reward', cp.reward,
    'business', jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.business_name, p.full_name),
      'avatar_url', p.avatar_url,
      'booking_link', p.booking_link))
  FROM public.comeback_programs cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.enabled
    AND ((_slug IS NOT NULL AND cp.slug = lower(btrim(_slug)))
      OR (_slug IS NULL AND _business_id IS NOT NULL AND cp.user_id = _business_id))
    AND public.comeback_owner_has_access(cp.user_id, cp.trial_started_at)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_comeback_program(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_comeback_program(text, uuid) TO anon, authenticated, service_role;

-- Public, by the private booking token: how far this client is toward the reward.
CREATE OR REPLACE FUNCTION public.get_comeback_progress_by_token(_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', cp.slug,
    'bookings_required', cp.bookings_required,
    'period_days', cp.period_days,
    'reward', cp.reward,
    'completed', public.comeback_visit_count(a.user_id, a.customer_id, cp.period_days))
  FROM public.appointments a
  JOIN public.comeback_programs cp ON cp.user_id = a.user_id
  WHERE a.cancel_token = _token
    AND cp.enabled
    AND public.comeback_owner_has_access(cp.user_id, cp.trial_started_at)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_comeback_progress_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_comeback_progress_by_token(uuid) TO anon, authenticated, service_role;

-- Owner: clients and their counted visits, closest to the reward first.
CREATE OR REPLACE FUNCTION public.list_comeback_progress()
RETURNS TABLE (customer_id uuid, name text, phone text, completed integer, last_visit date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH prog AS (
    SELECT cp.period_days FROM public.comeback_programs cp WHERE cp.user_id = auth.uid()
  ), last_red AS (
    SELECT r.customer_id, max(r.redeemed_at)::date AS d
    FROM public.comeback_redemptions r WHERE r.user_id = auth.uid() GROUP BY r.customer_id
  )
  SELECT c.id, c.name, c.phone, count(*)::integer, max(a.appointment_date)
  FROM public.appointments a
  JOIN public.customers c ON c.id = a.customer_id
  CROSS JOIN prog
  LEFT JOIN last_red lr ON lr.customer_id = a.customer_id
  WHERE a.user_id = auth.uid()
    AND a.status = 'completed'
    AND (prog.period_days IS NULL OR a.appointment_date >= current_date - prog.period_days)
    AND a.appointment_date > COALESCE(lr.d, date '1900-01-01')
  GROUP BY c.id, c.name, c.phone
  ORDER BY count(*) DESC, max(a.appointment_date) DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.list_comeback_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_comeback_progress() TO authenticated, service_role;

-- Owner: mark a client's reward as used. Their count starts again from the next visit.
CREATE OR REPLACE FUNCTION public.redeem_comeback_reward(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prog public.comeback_programs%ROWTYPE;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT * INTO v_prog FROM public.comeback_programs WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Set up your coupon first');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id AND c.user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client not found');
  END IF;
  v_count := public.comeback_visit_count(auth.uid(), _customer_id, v_prog.period_days);
  IF v_count < v_prog.bookings_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'This client has not earned the reward yet');
  END IF;
  INSERT INTO public.comeback_redemptions (user_id, customer_id, reward)
  VALUES (auth.uid(), _customer_id, v_prog.reward);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_comeback_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_comeback_reward(uuid) TO authenticated, service_role;
