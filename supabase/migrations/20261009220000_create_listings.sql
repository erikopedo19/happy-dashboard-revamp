-- Aggelies: rent & staff listings with client applications.
-- Admins/barbers post spaces for rent or staff openings; clients apply.
-- Application caps: 2 for free users, 10 for premium (enforced in apply_to_listing).

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('rent', 'job')),
  title text NOT NULL,
  short_description text,
  description text,
  location text,
  price_text text,
  cover_url text,
  contact_phone text,
  featured boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, applicant_id)
);

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

GRANT SELECT, INSERT, DELETE ON public.listing_applications TO authenticated;
GRANT ALL ON public.listing_applications TO service_role;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_applications ENABLE ROW LEVEL SECURITY;

-- Split so anonymous reads never reference is_super_admin(): anon lacks EXECUTE
-- on it, and a function inside a policy fails at plan time regardless of OR order.
CREATE POLICY "Published listings are viewable by everyone"
ON public.listings FOR SELECT
USING (published = true);

CREATE POLICY "Owners and admins can read their listings"
ON public.listings FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "Users can create their own listings"
ON public.listings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners or admins can update listings"
ON public.listings FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin())
WITH CHECK (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "Owners or admins can delete listings"
ON public.listings FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "Applicants and listing owners can read applications"
ON public.listing_applications FOR SELECT TO authenticated
USING (
  applicant_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.created_by = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Authenticated users can apply"
ON public.listing_applications FOR INSERT TO authenticated
WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Applicants can withdraw their application"
ON public.listing_applications FOR DELETE TO authenticated
USING (applicant_id = auth.uid());

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

CREATE INDEX IF NOT EXISTS listings_kind_idx ON public.listings (kind);
CREATE INDEX IF NOT EXISTS listings_created_by_idx ON public.listings (created_by);
CREATE INDEX IF NOT EXISTS listing_applications_listing_idx ON public.listing_applications (listing_id);
CREATE INDEX IF NOT EXISTS listing_applications_applicant_idx ON public.listing_applications (applicant_id);

-- Premium check used by the application cap.
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers s
    WHERE (
      s.user_id = auth.uid()
      OR lower(s.email) = lower(auth.jwt() ->> 'email')
    )
    AND s.subscribed = true
    AND (s.subscription_end IS NULL OR s.subscription_end > now())
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated, service_role;

-- Applies the current user to a listing, enforcing the application cap.
CREATE OR REPLACE FUNCTION public.apply_to_listing(
  _listing_id uuid,
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _message text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
  v_limit int;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND published = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This listing is no longer available');
  END IF;

  IF EXISTS (SELECT 1 FROM public.listing_applications WHERE listing_id = _listing_id AND applicant_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_applied');
  END IF;

  SELECT count(*) INTO v_count FROM public.listing_applications WHERE applicant_id = v_user_id;
  v_limit := CASE WHEN public.has_active_subscription() THEN 10 ELSE 2 END;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'limit_reached', 'limit', v_limit);
  END IF;

  INSERT INTO public.listing_applications (listing_id, applicant_id, full_name, phone, message)
  VALUES (_listing_id, v_user_id, _full_name, _phone, _message)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'used', v_count + 1, 'limit', v_limit);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_to_listing(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_to_listing(uuid, text, text, text) TO authenticated, service_role;

-- Fix the same is_super_admin EXECUTE problem on events: the original select
-- policy errored for anonymous visitors, so logged-out users could never see
-- published events. Replace it with a public published-read plus an
-- authenticated owner/admin read (policies are OR'ed per role).
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;

CREATE POLICY "Published events are viewable by everyone"
ON public.events FOR SELECT
USING (published = true);

CREATE POLICY "Owners and admins can read their events"
ON public.events FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin());
