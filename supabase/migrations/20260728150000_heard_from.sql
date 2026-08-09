-- Track where users heard about Cutzioo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS heard_from text;

CREATE INDEX IF NOT EXISTS idx_profiles_heard_from
  ON public.profiles(heard_from)
  WHERE heard_from IS NOT NULL;
