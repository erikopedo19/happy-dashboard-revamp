DO $$
DECLARE
  brand_profiles_kind "char";
BEGIN
  SELECT c.relkind
    INTO brand_profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'brand_profiles';

  IF brand_profiles_kind = 'v' THEN
    ALTER VIEW public.brand_profiles SET (security_invoker = true);
  END IF;
END $$;
