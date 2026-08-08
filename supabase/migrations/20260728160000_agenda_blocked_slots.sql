-- Blocked time slots on the agenda (e.g. 45 min buffer before a booking)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE               TABLE IF NOT EXISTS public.agenda_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_blocked_slots_user_date
  ON public.agenda_blocked_slots (user_id, blocked_date);

ALTER TABLE public.agenda_blocked_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own blocked slots" ON public.agenda_blocked_slots;
CREATE POLICY "Users can manage their own blocked slots"
  ON public.agenda_blocked_slots
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
