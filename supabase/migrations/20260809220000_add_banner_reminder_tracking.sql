-- Add columns to track banner reminder notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Create index for efficient queries on users without banners
CREATE INDEX IF NOT EXISTS idx_profiles_banner_reminder 
ON public.profiles (banner_reminder_sent_at) 
WHERE banner_url IS NULL OR banner_url = '';
