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

-- 3. Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 4. Row policies
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

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies
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

-- 7. Cleanup expired stories
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.stories WHERE expires_at <= now();
$$;

-- 8. List active stories grouped by user
CREATE OR REPLACE FUNCTION public.list_active_stories()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'name', COALESCE(p.business_name, p.full_name, 'Barber'),
      'avatar_url', p.avatar_url,
      'booking_link', p.booking_link,
      'latest', MAX(s.created_at),
      'stories', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s2.id,
            'media_path', s2.media_path,
            'media_type', s2.media_type,
            'music_title', s2.music_title,
            'music_artist', s2.music_artist,
            'music_preview_url', s2.music_preview_url,
            'music_artwork_url', s2.music_artwork_url,
            'duration_seconds', s2.duration_seconds
          ) ORDER BY s2.created_at DESC
        )
        FROM public.stories s2
        WHERE s2.user_id = s.user_id AND s2.expires_at > now()
      )
    )
  ), '[]'::jsonb)
  FROM (
    SELECT DISTINCT user_id FROM public.stories WHERE expires_at > now()
  ) s
  JOIN public.profiles p ON p.id = s.user_id;
$$;
