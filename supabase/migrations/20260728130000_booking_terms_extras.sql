-- Add booking-link related flags to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website_design_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_website_design_requested
  ON public.profiles(website_design_requested)
  WHERE website_design_requested = true;
