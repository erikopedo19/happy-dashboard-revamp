CREATE OR REPLACE FUNCTION public.set_subscription_auto_renew(_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  UPDATE public.subscribers
     SET auto_renew = _enabled,
         cancel_at_period_end = NOT _enabled,
         updated_at = now()
   WHERE user_id = _uid;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_subscription_auto_renew(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_subscription_auto_renew(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  UPDATE public.subscribers
     SET cancel_at_period_end = true,
         auto_renew = false,
         updated_at = now()
   WHERE user_id = _uid;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_subscription_at_period_end() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_at_period_end() TO authenticated;