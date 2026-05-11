-- Fix appointments RLS policies
-- This migration ensures authenticated users can create their own appointments

-- Drop existing appointments policies if they exist
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable select for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable delete for users own appointments" ON public.appointments;

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (important!)
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for appointments
-- Policy: Users can view their own appointments
CREATE POLICY "Enable select for users own appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own appointments
CREATE POLICY "Enable insert for users own appointments" 
ON public.appointments 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own appointments
CREATE POLICY "Enable update for users own appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own appointments
CREATE POLICY "Enable delete for users own appointments" 
ON public.appointments 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Add policy for anon users to view appointments (if needed for public booking)
DROP POLICY IF EXISTS "Enable select for anon users" ON public.appointments;
CREATE POLICY "Enable select for anon users" 
ON public.appointments 
FOR SELECT 
TO anon 
USING (false);  -- Anon users cannot view appointments by default

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT USAGE ON SEQUENCE public.appointments_id_seq TO authenticated;

-- Verify the table structure is correct
COMMENT ON TABLE public.appointments IS 'Appointments table with RLS enabled - users can only access their own appointments';
