-- Clean up booking_link slugs, display names, and expose total bookings for the super admin dashboard.

-- 1) Helpers -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clean_booking_link(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(COALESCE(raw, '')),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.clean_display_name(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(trim(COALESCE(raw, '')), '\s+', ' ', 'g');
$$;

-- 2) Normalize existing data -------------------------------------------------

DO $$
DECLARE
  rec record;
  new_slug text;
  suffix integer;
BEGIN
  FOR rec IN
    SELECT id, booking_link
    FROM public.profiles
    WHERE booking_link IS NOT NULL AND booking_link <> ''
    ORDER BY created_at NULLS FIRST, id
  LOOP
    new_slug := public.clean_booking_link(rec.booking_link);

    -- Skip empty or already-clean values.
    IF new_slug = '' OR new_slug = rec.booking_link THEN
      CONTINUE;
    END IF;

    -- Resolve collisions by appending an incrementing suffix.
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE booking_link = new_slug AND id <> rec.id
    ) THEN
      suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM public.profiles
        WHERE booking_link = new_slug || '-' || suffix AND id <> rec.id
      ) LOOP
        suffix := suffix + 1;
      END LOOP;
      new_slug := new_slug || '-' || suffix;
    END IF;

    UPDATE public.profiles
    SET booking_link = new_slug
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Clean up existing full_name / business_name values.
UPDATE public.profiles
SET
  full_name = public.clean_display_name(full_name),
  business_name = public.clean_display_name(business_name)
WHERE
  full_name IS DISTINCT FROM public.clean_display_name(full_name)
  OR business_name IS DISTINCT FROM public.clean_display_name(business_name);

-- 3) Keep booking_link clean on every write ----------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user_booking_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_link IS NOT NULL AND NEW.booking_link <> '' THEN
    NEW.booking_link := public.clean_booking_link(NEW.booking_link);
  END IF;

  IF NEW.booking_link IS NULL OR NEW.booking_link = '' THEN
    NEW.booking_link := 'book-' || encode(gen_random_bytes(8), 'hex');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4) Keep display names clean on every write ---------------------------------

CREATE OR REPLACE FUNCTION public.clean_profile_names()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name := public.clean_display_name(NEW.full_name);
  NEW.business_name := public.clean_display_name(NEW.business_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_clean_profile_names ON public.profiles;
CREATE TRIGGER trg_clean_profile_names
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.clean_profile_names();

-- 5) Super-admin total bookings helper ---------------------------------------

CREATE OR REPLACE FUNCTION public.get_total_bookings()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.appointments
  WHERE status IS NULL OR status <> 'cancelled';
$$;

GRANT EXECUTE ON FUNCTION public.get_total_bookings() TO authenticated, service_role;
