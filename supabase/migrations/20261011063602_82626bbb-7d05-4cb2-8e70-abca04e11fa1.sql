CREATE TABLE IF NOT EXISTS public.listing_searches (
  city_key text PRIMARY KEY,
  searched_at timestamptz NOT NULL DEFAULT now(),
  found int NOT NULL DEFAULT 0
);
GRANT ALL ON public.listing_searches TO service_role;
ALTER TABLE public.listing_searches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_to_listing(_listing_id uuid, _full_name text DEFAULT NULL, _phone text DEFAULT NULL, _message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_count int; v_limit int; v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND published = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This listing is no longer available'); END IF;
  IF EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND ai_found = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'external_listing'); END IF;
  IF EXISTS (SELECT 1 FROM public.listing_applications WHERE listing_id = _listing_id AND applicant_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_applied'); END IF;
  SELECT count(*) INTO v_count FROM public.listing_applications WHERE applicant_id = v_user_id;
  v_limit := CASE WHEN public.has_active_subscription() THEN 10 ELSE 2 END;
  IF v_count >= v_limit THEN RETURN jsonb_build_object('success', false, 'error', 'limit_reached', 'limit', v_limit); END IF;
  INSERT INTO public.listing_applications (listing_id, applicant_id, full_name, phone, message)
  VALUES (_listing_id, v_user_id, left(_full_name, 100), left(_phone, 30), left(_message, 1000)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'used', v_count + 1, 'limit', v_limit);
END; $$;
REVOKE ALL ON FUNCTION public.apply_to_listing(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_to_listing(uuid, text, text, text) TO authenticated, service_role;

UPDATE public.listings SET published = false WHERE ai_found = true AND created_at < now() - interval '30 days';