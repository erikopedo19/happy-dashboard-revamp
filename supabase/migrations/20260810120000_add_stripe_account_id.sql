-- Add Stripe Connect account ID to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Create index for efficient queries on Stripe account IDs
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
ON public.profiles(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;