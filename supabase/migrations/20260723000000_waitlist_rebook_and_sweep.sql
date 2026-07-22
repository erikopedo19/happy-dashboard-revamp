-- Support manual/admin rebooking of a cancelled slot that is currently held by a waitlist offer.
-- Safe to re-run.

-- 1. Track who manually rebooked a waitlist slot.
ALTER TABLE public.cancellation_waitlist
  ADD COLUMN IF NOT EXISTS rebooked_email text,
  ADD COLUMN IF NOT EXISTS rebooked_name text,
  ADD COLUMN IF NOT EXISTS rebooked_by uuid,
  ADD COLUMN IF NOT EXISTS rebooked_at timestamptz;

-- 2. Function: admin/barber manually fills a cancelled slot that is waiting/offered.
--    Marks the active waitlist entry as claimed and records the manual assignment.
--    If no waitlist entry exists, creates a minimal claimed record so the slot can still be tracked.
CREATE OR REPLACE FUNCTION public.rebook_cancelled_slot(
  _appointment_id uuid,
  _email text,
  _name text DEFAULT NULL,
  _admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_barber_id uuid;
  v_entry_id uuid;
  v_token uuid;
BEGIN
  -- Find the barber/owner of the appointment
  SELECT user_id INTO v_barber_id FROM appointments WHERE id = _appointment_id;
  IF v_barber_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  -- Only the barber or an admin can rebook
  IF auth.uid() <> v_barber_id AND auth.uid() <> _admin_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Pick the active waitlist entry for this appointment (offered or waiting)
  SELECT id INTO v_entry_id
  FROM cancellation_waitlist
  WHERE offered_appointment_id = _appointment_id
    AND status IN ('offered','waiting')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_entry_id IS NULL THEN
    -- No waitlist entry yet; create a claimed one to record the manual rebook
    INSERT INTO cancellation_waitlist (
      barber_id, client_email, client_name, status,
      offered_appointment_id, rebooked_email, rebooked_name, rebooked_by, rebooked_at
    ) VALUES (
      v_barber_id, _email, _name, 'claimed',
      _appointment_id, _email, _name, _admin_user_id, now()
    )
    RETURNING id INTO v_entry_id;
  ELSE
    UPDATE cancellation_waitlist
    SET status = 'claimed',
        client_email = _email,
        client_name = COALESCE(_name, client_name),
        rebooked_email = _email,
        rebooked_name = _name,
        rebooked_by = _admin_user_id,
        rebooked_at = now(),
        updated_at = now()
    WHERE id = v_entry_id
    RETURNING claim_token INTO v_token;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'waitlist_id', v_entry_id,
    'claim_token', v_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rebook_cancelled_slot(uuid, text, text, uuid) TO authenticated;
