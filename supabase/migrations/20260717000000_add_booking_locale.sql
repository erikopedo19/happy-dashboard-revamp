-- Add booking language/locale preference to profiles
-- Defaults to English ('en') everywhere; users may switch booking-related language to Greek ('el').

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS booking_locale TEXT DEFAULT 'en';

-- Restrict to supported values
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_booking_locale_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_booking_locale_check
CHECK (booking_locale IN ('en', 'el'));

-- Backfill existing rows to English
UPDATE public.profiles
SET booking_locale = 'en'
WHERE booking_locale IS NULL OR booking_locale NOT IN ('en', 'el');

-- Ensure the column is non-null after backfill
ALTER TABLE public.profiles
ALTER COLUMN booking_locale SET NOT NULL;
