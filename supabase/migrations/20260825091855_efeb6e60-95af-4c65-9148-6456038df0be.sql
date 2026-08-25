CREATE OR REPLACE FUNCTION public.list_boosted_barbers()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT bc.user_id
  FROM public.boost_campaigns bc
  WHERE bc.status = 'sent'
    AND bc.created_at > now() - interval '14 days'
$$;

GRANT EXECUTE ON FUNCTION public.list_boosted_barbers() TO authenticated, anon;