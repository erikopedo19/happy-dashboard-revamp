DO $$
DECLARE
  _pol RECORD;
  _key_col TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'memberships'
  ) THEN
    FOR _pol IN
      SELECT polname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'memberships'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.memberships', _pol.polname);
    END LOOP;

    ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'memberships'
        AND column_name = 'user_id'
    ) THEN
      _key_col := 'user_id';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'memberships'
        AND column_name = 'profile_id'
    ) THEN
      _key_col := 'profile_id';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'memberships'
        AND column_name = 'owner_id'
    ) THEN
      _key_col := 'owner_id';
    ELSE
      _key_col := NULL;
    END IF;

    IF _key_col IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %L ON public.memberships FOR SELECT TO authenticated USING (auth.uid() = %I)',
        'Users can view their memberships',
        _key_col
      );

      EXECUTE format(
        'CREATE POLICY %L ON public.memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = %I)',
        'Users can insert their memberships',
        _key_col
      );

      EXECUTE format(
        'CREATE POLICY %L ON public.memberships FOR UPDATE TO authenticated USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)',
        'Users can update their memberships',
        _key_col,
        _key_col
      );

      EXECUTE format(
        'CREATE POLICY %L ON public.memberships FOR DELETE TO authenticated USING (auth.uid() = %I)',
        'Users can delete their memberships',
        _key_col
      );
    ELSE
      CREATE POLICY "Authenticated can read memberships" ON public.memberships
        FOR SELECT TO authenticated
        USING (auth.uid() IS NOT NULL);

      CREATE POLICY "Authenticated can write memberships" ON public.memberships
        FOR ALL TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $$;
