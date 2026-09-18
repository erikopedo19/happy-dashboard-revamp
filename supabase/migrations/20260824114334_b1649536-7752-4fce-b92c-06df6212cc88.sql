CREATE TABLE public.boost_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  emails_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT ON public.boost_campaigns TO authenticated;
GRANT ALL ON public.boost_campaigns TO service_role;

ALTER TABLE public.boost_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their boost campaigns"
ON public.boost_campaigns FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX boost_campaigns_user_created_idx ON public.boost_campaigns (user_id, created_at DESC);