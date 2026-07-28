-- Track story view counts and expose them through the active-stories RPC

-- 1. Add view counter to stories
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 2. Helper to increment views safely
CREATE OR REPLACE FUNCTION public.increment_story_views(_story_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stories
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = _story_id;

  SELECT jsonb_build_object('success', true, 'views_count', views_count)
  FROM public.stories
  WHERE id = _story_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_story_views(uuid) TO anon, authenticated;

-- 3. Include views_count in the active stories list
CREATE OR REPLACE FUNCTION public.list_active_stories()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH active AS (
    SELECT user_id, MAX(created_at) AS latest
    FROM public.stories
    WHERE expires_at > now()
    GROUP BY user_id
  ),
  user_stories AS (
    SELECT s.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'media_path', s.media_path,
          'media_type', s.media_type,
          'music_title', s.music_title,
          'music_artist', s.music_artist,
          'music_preview_url', s.music_preview_url,
          'music_artwork_url', s.music_artwork_url,
          'duration_seconds', s.duration_seconds,
          'views_count', COALESCE(s.views_count, 0)
        ) ORDER BY s.created_at DESC
      ) AS stories
    FROM public.stories s
    WHERE s.expires_at > now()
    GROUP BY s.user_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'name', COALESCE(p.business_name, p.full_name, 'Barber'),
      'avatar_url', p.avatar_url,
      'booking_link', p.booking_link,
      'latest', a.latest,
      'stories', us.stories
    )
  ), '[]'::jsonb)
  FROM active a
  JOIN public.profiles p ON p.id = a.user_id
  JOIN user_stories us ON us.user_id = a.user_id;
$$;
