CREATE TABLE IF NOT EXISTS public.time_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  off_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, off_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_off TO authenticated;
GRANT ALL ON public.time_off TO service_role;

ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own time off" ON public.time_off;
CREATE POLICY "Users manage their own time off"
ON public.time_off FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_time_off_dates(_user_id uuid)
RETURNS TABLE(off_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.off_date FROM public.time_off t
  WHERE t.user_id = _user_id AND t.off_date >= (now() at time zone 'utc')::date - 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_time_off_dates(uuid) TO anon, authenticated, service_role;