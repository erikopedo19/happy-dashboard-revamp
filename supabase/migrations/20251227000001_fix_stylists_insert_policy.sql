-- Fix stylists RLS to allow INSERT for owners

-- Replace overly-broad policy (FOR ALL USING ...) which does not permit INSERT
DROP POLICY IF EXISTS "Users can manage their own stylists" ON stylists;

-- Allow authenticated users to insert stylists for their own user_id
DROP POLICY IF EXISTS "Users can insert their own stylists" ON stylists;
CREATE POLICY "Users can insert their own stylists" ON stylists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own stylists
DROP POLICY IF EXISTS "Users can update their own stylists" ON stylists;
CREATE POLICY "Users can update their own stylists" ON stylists
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own stylists
DROP POLICY IF EXISTS "Users can delete their own stylists" ON stylists;
CREATE POLICY "Users can delete their own stylists" ON stylists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
