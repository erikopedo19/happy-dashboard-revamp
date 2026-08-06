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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_blocked_slots TO authenticated;
GRANT SELECT ON public.agenda_blocked_slots TO anon;
GRANT ALL ON public.agenda_blocked_slots TO service_role;

ALTER TABLE public.agenda_blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own blocked slots"
ON public.agenda_blocked_slots FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read blocked slots"
ON public.agenda_blocked_slots FOR SELECT
TO anon
USING (true);

CREATE INDEX IF NOT EXISTS idx_agenda_blocked_slots_user_date
ON public.agenda_blocked_slots(user_id, blocked_date);

CREATE OR REPLACE FUNCTION public.touch_agenda_blocked_slots()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_agenda_blocked_slots_updated_at
BEFORE UPDATE ON public.agenda_blocked_slots
FOR EACH ROW EXECUTE FUNCTION public.touch_agenda_blocked_slots();