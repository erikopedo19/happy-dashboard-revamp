ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

DROP FUNCTION IF EXISTS public.list_public_profiles();
DROP FUNCTION IF EXISTS public.get_public_profile_by_booking_link(text);

CREATE FUNCTION public.list_public_profiles()
RETURNS TABLE(
  id uuid, full_name text, booking_link text, brand_color text,
  avatar_url text, banner_url text, rating numeric, rating_count integer, description text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.booking_link,
         COALESCE(p.brand_color,'#e0c4a8'),
         p.avatar_url, p.banner_url,
         COALESCE(p.rating, 5.0),
         COALESCE(p.rating_count, 0),
         p.description
  FROM public.profiles p
  WHERE p.booking_link IS NOT NULL
$$;

CREATE FUNCTION public.get_public_profile_by_booking_link(_booking_link text)
RETURNS TABLE(
  id uuid, full_name text, booking_link text, brand_color text,
  avatar_url text, banner_url text, rating numeric, rating_count integer, description text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.booking_link,
         COALESCE(p.brand_color,'#e0c4a8'),
         p.avatar_url, p.banner_url,
         COALESCE(p.rating, 5.0),
         COALESCE(p.rating_count, 0),
         p.description
  FROM public.profiles p
  WHERE p.booking_link = _booking_link
  LIMIT 1
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('brand-images', 'brand-images', true, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

DROP POLICY IF EXISTS "brand_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_owner_delete" ON storage.objects;

CREATE POLICY "brand_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'brand-images');
CREATE POLICY "brand_images_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-images');
CREATE POLICY "brand_images_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-images' AND owner = auth.uid());
CREATE POLICY "brand_images_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-images' AND owner = auth.uid());