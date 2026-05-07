
-- Create a table to store brand details
CREATE TABLE public.brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  about text,
  industry text,
  banner_url text,
  logo_url text,
  contact_email text,
  contact_phone text,
  location text,
  booking_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS to secure each user's brand profile
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own brand profile
CREATE POLICY "Users can view their own brand profile"
  ON public.brand_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own brand profile
CREATE POLICY "Users can insert their own brand profile"
  ON public.brand_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own brand profile
CREATE POLICY "Users can update their own brand profile"
  ON public.brand_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own brand profile
CREATE POLICY "Users can delete their own brand profile"
  ON public.brand_profiles FOR DELETE
  USING (user_id = auth.uid());

-- Create a public bucket for brand images
insert into storage.buckets (id, name, public) values ('brand-images', 'brand-images', true);
