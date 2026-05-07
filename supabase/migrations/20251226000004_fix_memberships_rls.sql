-- Fix infinite recursion in memberships RLS policies
-- This makes memberships use simple user_id based policies
DO $$
DECLARE
  _pol RECORD;
BEGIN
  -- Only proceed if the table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'memberships'
  ) THEN
    -- Drop any existing policies to remove recursive references
    FOR _pol IN
      SELECT polname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'memberships'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.memberships', _pol.polname);
    END LOOP;

    -- Ensure RLS is enabled
    ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

    -- Apply simple non-recursive policies
    CREATE POLICY "Users can view their memberships"
      ON public.memberships
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their memberships"
      ON public.memberships
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their memberships"
      ON public.memberships
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their memberships"
      ON public.memberships
      FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE 'Memberships RLS policies reset successfully';
  ELSE
    RAISE NOTICE 'Table public.memberships does not exist; no changes applied';
  END IF;
END $$;
