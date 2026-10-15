-- Blocked agenda slots were written by the owner but never surfaced to the
-- public booking page, so a "blocked" slot stayed bookable. This makes the
-- table/permissions idempotent and exposes a SECURITY DEFINER RPC the public
-- booking flow can call (same pattern as get_booked_slots).

CREATE TABLE IF NOT EXISTS public.agenda_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_blocked_slots_user_date
  ON public.agenda_blocked_slots (user_id, blocked_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_blocked_slots TO authenticated;
GRANT ALL ON public.agenda_blocked_slots TO service_role;

ALTER TABLE public.agenda_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Owner-only row access (client never reads the table directly).
DROP POLICY IF EXISTS "Anyone can read blocked slots" ON public.agenda_blocked_slots;
DROP POLICY IF EXISTS "Owners can read their blocked slots" ON public.agenda_blocked_slots;
DROP POLICY IF EXISTS "Users can manage their own blocked slots" ON public.agenda_blocked_slots;
DROP POLICY IF EXISTS "Users manage their own blocked slots" ON public.agenda_blocked_slots;

CREATE POLICY "Users manage their own blocked slots"
  ON public.agenda_blocked_slots FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public availability read — safe because it only exposes busy time ranges,
-- never ids, reasons or user data.
DROP FUNCTION IF EXISTS public.get_blocked_slots(uuid, date);
CREATE OR REPLACE FUNCTION public.get_blocked_slots(_business_id uuid, _date date)
RETURNS TABLE(start_time time without time zone, end_time time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT b.start_time, b.end_time
  FROM public.agenda_blocked_slots b
  WHERE b.user_id = _business_id
    AND b.blocked_date = _date
  ORDER BY b.start_time;
$function$;

GRANT EXECUTE ON FUNCTION public.get_blocked_slots(uuid, date) TO anon, authenticated;
