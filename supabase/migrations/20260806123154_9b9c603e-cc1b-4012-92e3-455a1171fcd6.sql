ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freelancer_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS heard_from text;