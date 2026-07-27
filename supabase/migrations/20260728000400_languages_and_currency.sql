-- Expand booking languages and add currency support

-- Allow Spanish and Polish booking locales
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_booking_locale_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_booking_locale_check
CHECK (booking_locale IN ('en', 'el', 'es', 'pl'));

-- Add business currency
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Backfill existing rows with sensible defaults based on booking_locale
UPDATE public.profiles
SET currency = CASE
  WHEN booking_locale = 'pl' THEN 'PLN'
  WHEN booking_locale = 'en' THEN 'GBP'
  WHEN booking_locale = 'el' THEN 'EUR'
  WHEN booking_locale = 'es' THEN 'EUR'
  ELSE 'EUR'
END
WHERE currency IS NULL;

-- Ensure non-null after backfill
ALTER TABLE public.profiles
ALTER COLUMN currency SET NOT NULL;
