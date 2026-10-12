DROP POLICY IF EXISTS "org_insert_policy" ON public.organizations;
CREATE POLICY "org_insert_policy" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Anyone can read blocked slots" ON public.agenda_blocked_slots;
CREATE POLICY "Owners can read their blocked slots" ON public.agenda_blocked_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can upload story files" ON storage.objects;
CREATE POLICY "Authenticated can upload story files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = (select auth.uid()::text));