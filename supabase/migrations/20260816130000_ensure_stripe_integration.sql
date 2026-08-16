-- Ensure complete Stripe integration support
-- This migration ensures all required columns and indexes exist for Stripe Connect

-- Ensure profiles table has all required Stripe columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarded_at timestamptz,
ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sender_email text;

-- Create proper indexes for Stripe account lookups
DROP INDEX IF EXISTS idx_profiles_stripe_account_id;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
ON public.profiles(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

-- Ensure unique constraint for Stripe account IDs
DROP INDEX IF EXISTS profiles_stripe_account_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key
ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Ensure payments table exists with proper structure
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('booking','product')),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  description text,
  customer_name text,
  customer_email text,
  currency text NOT NULL DEFAULT 'eur',
  amount_subtotal integer NOT NULL DEFAULT 0,
  amount_tax integer NOT NULL DEFAULT 0,
  amount_total integer NOT NULL DEFAULT 0,
  application_fee_amount integer NOT NULL DEFAULT 25,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_account_id text,
  status text NOT NULL DEFAULT 'pending',
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grant proper permissions
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
DROP POLICY IF EXISTS "Owners can view their payments" ON public.payments;
CREATE POLICY "Owners can view their payments"
  ON public.payments FOR SELECT TO authenticated
  USING (business_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert payments" ON public.payments;
CREATE POLICY "Owners can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update payments" ON public.payments;
CREATE POLICY "Owners can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (business_id = auth.uid());

-- Create index for efficient payment queries
CREATE INDEX IF NOT EXISTS payments_business_created_idx ON public.payments (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_stripe_session_idx ON public.payments (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status) WHERE status != 'completed';

-- Add updated_at trigger
-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();