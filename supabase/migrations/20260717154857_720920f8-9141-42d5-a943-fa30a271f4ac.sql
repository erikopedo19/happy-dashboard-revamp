
-- Drop duplicate cron job (keep the ':15' one)
DO $$ BEGIN
  PERFORM cron.unschedule('send-review-request');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Enforce max 2 reviews per (business, customer email) in submit_review
CREATE OR REPLACE FUNCTION public.submit_review(_cancel_token uuid, _rating integer, _comment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment_id uuid;
  v_business_id    uuid;
  v_reviewer_name  text;
  v_customer_email text;
  v_existing_count integer;
  v_already        boolean;
BEGIN
  SELECT a.id, a.user_id, c.name, c.email
    INTO v_appointment_id, v_business_id, v_reviewer_name, v_customer_email
    FROM public.appointments a
    JOIN public.customers c ON c.id = a.customer_id
   WHERE a.cancel_token = _cancel_token
   LIMIT 1;

  IF v_appointment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Is this an update to an existing review for this appointment?
  SELECT EXISTS(SELECT 1 FROM public.reviews WHERE appointment_id = v_appointment_id) INTO v_already;

  -- Count distinct existing reviews from this customer for this business
  IF NOT v_already AND v_customer_email IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
      FROM public.reviews r
      JOIN public.appointments a2 ON a2.id = r.appointment_id
      JOIN public.customers c2 ON c2.id = a2.customer_id
     WHERE r.business_id = v_business_id
       AND lower(c2.email) = lower(v_customer_email);
    IF v_existing_count >= 2 THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have already left the maximum of 2 reviews for this barber.');
    END IF;
  END IF;

  INSERT INTO public.reviews (appointment_id, business_id, rating, comment, reviewer_name)
  VALUES (v_appointment_id, v_business_id, _rating, _comment, v_reviewer_name)
  ON CONFLICT (appointment_id) DO UPDATE
    SET rating  = EXCLUDED.rating,
        comment = EXCLUDED.comment;

  RETURN jsonb_build_object('success', true);
END;
$function$;
