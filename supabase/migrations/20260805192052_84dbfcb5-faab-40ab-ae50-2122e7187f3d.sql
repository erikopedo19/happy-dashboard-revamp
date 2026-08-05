-- 1. Subscribers: only service_role may write
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
REVOKE INSERT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;
GRANT ALL ON public.subscribers TO service_role;

-- 2. Memberships: block self role escalation
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'You cannot change your own membership role';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_self_role_escalation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_self_role_escalation_trg ON public.memberships;
CREATE TRIGGER prevent_self_role_escalation_trg
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 3. Email logs: service-role only
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_logs FROM anon, authenticated;
GRANT ALL ON public.email_logs TO service_role;

-- 4. Agenda settings: no blanket public read; scoped RPC instead
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.agenda_settings;
DROP POLICY IF EXISTS "Public users can view agenda settings for booking" ON public.agenda_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.agenda_settings;
CREATE POLICY "Users can view their own settings"
  ON public.agenda_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_public_agenda_settings(_user_id uuid)
RETURNS TABLE(user_id uuid, start_hour text, end_hour text, working_days integer[], service_duration integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id,
         COALESCE(a.start_hour, '09:00'),
         COALESCE(a.end_hour, '18:00'),
         COALESCE(a.working_days, ARRAY[0,1,2,3,4,5,6]),
         GREATEST(COALESCE(a.service_duration, 30), 1)
  FROM public.agenda_settings a
  WHERE a.user_id = _user_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_agenda_settings(uuid) TO anon, authenticated;

-- 5. brand_profiles_raw: no public table scan
DROP POLICY IF EXISTS "select_public_brand_profiles" ON public.brand_profiles_raw;
REVOKE ALL ON public.brand_profiles_raw FROM anon;
GRANT ALL ON public.brand_profiles_raw TO service_role;

-- 6. Storage: brand-images uploads scoped to the uploader's folder
DROP POLICY IF EXISTS "brand_images_auth_upload" ON storage.objects;
CREATE POLICY "brand_images_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "brand_images_owner_update" ON storage.objects;
CREATE POLICY "brand_images_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'brand-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "brand_images_owner_delete" ON storage.objects;
CREATE POLICY "brand_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Fix mutable search_path on remaining functions
ALTER FUNCTION public.ensure_profile_identity(uuid, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.set_banners_updated_at() SET search_path = public;
ALTER FUNCTION public.set_profiles_updated_at() SET search_path = public;
ALTER FUNCTION public.set_stories_updated_at() SET search_path = public;

-- 8. Revoke EXECUTE from anon/authenticated on trigger + internal functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.prorettype = 'trigger'::regtype
           OR p.proname IN (
             'cleanup_expired_stories','cleanup_pending_services','cleanup_pending_stylists',
             'cleanup_old_logs','expire_waitlist_offers','recalculate_business_rating',
             'is_org_admin','is_org_creator','is_org_owner','user_organizations',
             'generate_org_slug','clean_booking_link','clean_display_name','ensure_profile_identity'
           ))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 9. Authenticated-only RPCs: revoke anon execute
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'accept_invitation','cancel_appointment_by_barber','claim_waitlist_offer','create_workspace',
        'get_business_analytics_summary','get_my_bookings','get_user_appointments','is_super_admin',
        'join_cancellation_waitlist','soft_delete_account','get_mobile_dashboard_metrics'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;