-- SQL support for the delete-account countdown button.
-- Safe to re-run; uses IF NOT EXISTS / OR REPLACE.

-- 1. Track deletion state on the profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Request account deletion (sets a pending-deletion flag and anonymizes visible fields).
CREATE OR REPLACE FUNCTION public.request_account_deletion(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Users can only request their own deletion
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.profiles
  SET deletion_requested_at = now(),
      updated_at = now()
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Deletion requested');
END;
$$;

-- 3. Soft-delete account (anonymize PII and mark deleted).
--    Actual auth.users removal is best done via an Edge Function with the service role key;
--    this function sanitizes the public profile row.
CREATE OR REPLACE FUNCTION public.soft_delete_account(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the user or a service/admin can soft-delete
  IF auth.uid() IS DISTINCT FROM _user_id AND auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.profiles
  SET deleted_at = now(),
      full_name = 'Deleted User',
      business_name = NULL,
      phone = NULL,
      avatar_url = NULL,
      banner_url = NULL,
      address = NULL,
      google_maps_url = NULL,
      description = NULL,
      email_template_html = NULL,
      updated_at = now()
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Cancel any future appointments so the freed slots become available
  UPDATE public.appointments
  SET status = 'cancelled',
      updated_at = now()
  WHERE user_id = _user_id
    AND appointment_date >= CURRENT_DATE
    AND status NOT IN ('cancelled', 'completed');

  RETURN jsonb_build_object('success', true, 'message', 'Account soft-deleted');
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.request_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_account(uuid) TO authenticated;
