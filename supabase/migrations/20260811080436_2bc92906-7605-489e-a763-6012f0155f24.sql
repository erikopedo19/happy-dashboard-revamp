CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  cover_url text,
  short_description text,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  organizer text,
  map_url text,
  registration_url text,
  category text NOT NULL DEFAULT 'seminar',
  featured boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are viewable by everyone"
ON public.events FOR SELECT
USING (published = true OR auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "Users can create their own events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners or admins can update events"
ON public.events FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin())
WITH CHECK (auth.uid() = created_by OR public.is_super_admin());

CREATE POLICY "Owners or admins can delete events"
ON public.events FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_super_admin());

CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

CREATE INDEX events_date_idx ON public.events (event_date);

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS subscription_start timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_amount numeric,
  ADD COLUMN IF NOT EXISTS renewal_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS expiration_email_sent_at timestamptz;