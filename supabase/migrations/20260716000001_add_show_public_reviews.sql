-- Add public review visibility toggle for premium users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_public_reviews BOOLEAN DEFAULT false;

-- Update microsite RPC to expose the toggle and detailed reviews when enabled
CREATE OR REPLACE FUNCTION public.get_microsite_by_slug(_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'business_name', COALESCE(p.business_name, p.full_name),
      'full_name', p.full_name,
      'booking_link', p.booking_link,
      'brand_color', COALESCE(p.brand_color, '#0A84FF'),
      'avatar_url', p.avatar_url,
      'banner_url', p.banner_url,
      'address', p.address,
      'phone', p.phone,
      'description', p.description,
      'rating', COALESCE(p.rating, 5.0),
      'rating_count', COALESCE(p.rating_count, 0),
      'show_public_reviews', COALESCE(p.show_public_reviews, false)
    ),
    'microsite', to_jsonb(m.*),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration) ORDER BY s.name)
      FROM public.services s
      WHERE s.user_id = p.id AND s.deleted_at IS NULL
    ), '[]'::jsonb),
    'reviews', CASE
      WHEN COALESCE(p.show_public_reviews, false) THEN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id,
          'rating', r.rating,
          'comment', r.comment,
          'reviewer_name', r.reviewer_name,
          'created_at', r.created_at
        ) ORDER BY r.created_at DESC)
        FROM public.reviews r
        WHERE r.business_id = p.id
      ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  )
  FROM public.profiles p
  LEFT JOIN public.microsites m ON m.user_id = p.id AND m.published = true
  WHERE p.booking_link = _slug
  LIMIT 1;
$$;
