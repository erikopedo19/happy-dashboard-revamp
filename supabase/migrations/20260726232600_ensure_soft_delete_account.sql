-- Ensure the soft_delete_account RPC exists and refresh PostgREST schema cache.
-- Safe to re-run. Mirrors the logic in 20260724000000_account_deletion_support.sql.

-- 1. Make sure the deletion tracking column exists.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Soft-delete function used by the mobile settings "Delete account" button.
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

-- 3. Permissions
GRANT EXECUTE ON FUNCTION public.soft_delete_account(uuid) TO authenticated;

-- 4. Force PostgREST to refresh its schema cache so the new RPC is immediately available.
NOTIFY pgrst, 'reload schema';
