-- Migration: Add location coordinates to brand_profiles and dark_mode to profiles
-- This enables the maps feature and dark mode preference storage

-- Add latitude and longitude to brand_profiles table
ALTER TABLE brand_profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add dark_mode to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT true;

-- Create index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_brand_profiles_location 
ON brand_profiles(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN brand_profiles.latitude IS 'Shop latitude coordinate for map display';
COMMENT ON COLUMN brand_profiles.longitude IS 'Shop longitude coordinate for map display';
COMMENT ON COLUMN profiles.dark_mode IS 'User dark mode preference, defaults to true';
