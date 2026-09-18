GRANT SELECT, INSERT, UPDATE, DELETE ON public.microsites TO authenticated;
GRANT ALL ON public.microsites TO service_role;
GRANT SELECT ON public.microsites TO anon;