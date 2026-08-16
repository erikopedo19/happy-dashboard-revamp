-- Ensure all required Stripe columns exist in profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarded_at timestamptz,
ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sender_email text;

-- Create index for stripe_account_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
ON public.profiles(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

-- Ensure unique constraint exists
DROP INDEX IF EXISTS profiles_stripe_account_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key
ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;