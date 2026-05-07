-- Add columns for onboarding statistics
DO $$ 
BEGIN
  -- Add years_of_experience and average_clients_per_day to stylists table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stylists' 
    AND column_name = 'years_of_experience'
  ) THEN
    ALTER TABLE public.stylists ADD COLUMN years_of_experience TEXT;
    RAISE NOTICE 'Added years_of_experience column to stylists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stylists' 
    AND column_name = 'average_clients_per_day'
  ) THEN
    ALTER TABLE public.stylists ADD COLUMN average_clients_per_day TEXT;
    RAISE NOTICE 'Added average_clients_per_day column to stylists';
  END IF;

  -- Add hear_about_us and goals to brand_profiles table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'brand_profiles' 
    AND column_name = 'hear_about_us'
  ) THEN
    ALTER TABLE public.brand_profiles ADD COLUMN hear_about_us TEXT;
    RAISE NOTICE 'Added hear_about_us column to brand_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'brand_profiles' 
    AND column_name = 'goals'
  ) THEN
    ALTER TABLE public.brand_profiles ADD COLUMN goals TEXT[];
    RAISE NOTICE 'Added goals column to brand_profiles';
  END IF;
END $$;
