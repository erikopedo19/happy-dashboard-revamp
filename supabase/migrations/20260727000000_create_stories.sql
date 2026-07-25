-- Stories feature migration: table, storage bucket, RLS, RPC and cleanup

-- 1. Stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  music_track_id TEXT,
  music_title TEXT,
  music_artist TEXT,
  music_preview_url TEXT,
  music_artwork_url TEXT,
  duration_seconds INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stories_updated_at ON public.stories;
CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stories_updated_at();

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Cleanup expired stories
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.stories WHERE expires_at <= now();
$$;

-- 5. List active stories grouped by user
-- Created before RLS/policies so the stories table is not locked while this references profiles.
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
          'duration_seconds', s.duration_seconds
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

-- 6. Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 7. Row policies
DROP POLICY IF EXISTS "Users can insert own stories" ON public.stories;
CREATE POLICY "Users can insert own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active stories" ON public.stories;
CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

-- 8. Storage policies
DROP POLICY IF EXISTS "Anyone can view story files" ON storage.objects;
CREATE POLICY "Anyone can view story files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated can upload story files" ON storage.objects;
CREATE POLICY "Authenticated can upload story files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own story files" ON storage.objects;
CREATE POLICY "Users can update own story files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'stories' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own story files" ON storage.objects;
CREATE POLICY "Users can delete own story files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'stories' AND owner = auth.uid());
