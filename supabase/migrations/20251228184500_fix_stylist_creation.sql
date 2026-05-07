-- Fix Stylists RLS Policy to allow creation
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Drop existing policies to be safe and avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can insert their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can update their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can delete their own stylists" ON public.stylists;
    
    -- Also drop policies that might have been created with different names
    DROP POLICY IF EXISTS "Public stylists are viewable by everyone" ON public.stylists;
    DROP POLICY IF EXISTS "Users can manage their own stylists" ON public.stylists;
    DROP POLICY IF EXISTS "Users can insert stylists" ON public.stylists;

    -- 1. View policy: Users can view their own stylists OR public stylists
    CREATE POLICY "Users can view stylists"
    ON public.stylists FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        is_public = true
    );

    -- 2. Insert policy: Users can insert their own stylists
    CREATE POLICY "Users can insert their own stylists"
    ON public.stylists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    -- 3. Update policy: Users can update their own stylists
    CREATE POLICY "Users can update their own stylists"
    ON public.stylists FOR UPDATE
    USING (auth.uid() = user_id);

    -- 4. Delete policy: Users can delete their own stylists
    CREATE POLICY "Users can delete their own stylists"
    ON public.stylists FOR DELETE
    USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Fixed Stylists RLS policies';
END $$;
