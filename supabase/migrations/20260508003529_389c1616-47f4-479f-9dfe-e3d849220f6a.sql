CREATE OR REPLACE FUNCTION public.check_stylist_appointment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Stylist is OPTIONAL. Only validate ownership when one is provided.
  IF NEW.stylist_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.stylists
      WHERE stylists.id = NEW.stylist_id
        AND stylists.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'invalid stylist_id or stylist does not belong to user';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;