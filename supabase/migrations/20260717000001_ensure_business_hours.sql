-- Ensure business_hours table exists for per-day opening hours
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours FORCE ROW LEVEL SECURITY;

-- Users can manage their own business hours
DROP POLICY IF EXISTS "Users can manage own business_hours" ON public.business_hours;
CREATE POLICY "Users can manage own business_hours"
  ON public.business_hours
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public/anonymous users can read business hours (needed for public booking pages)
DROP POLICY IF EXISTS "Public can view business hours" ON public.business_hours;
CREATE POLICY "Public can view business hours"
  ON public.business_hours
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index for fast lookups by barber/user
CREATE INDEX IF NOT EXISTS idx_business_hours_user_day
  ON public.business_hours (user_id, day_of_week);
