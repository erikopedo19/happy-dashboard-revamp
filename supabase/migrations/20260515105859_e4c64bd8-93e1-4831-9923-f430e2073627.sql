CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  stripe_customer_id text,
  subscribed boolean NOT NULL DEFAULT false,
  subscription_tier text,
  subscription_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id OR email = auth.email());

CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE USING (true);

CREATE POLICY "insert_subscription" ON public.subscribers
  FOR INSERT WITH CHECK (true);