
-- Allow public users to read profiles by booking_link (needed for public booking)
CREATE POLICY "Public users can view profiles by booking link"
ON public.profiles
FOR SELECT
TO anon
USING (booking_link IS NOT NULL);

-- Allow public users to read agenda_settings (needed for booking time slots)
CREATE POLICY "Public users can view agenda settings for booking"
ON public.agenda_settings
FOR SELECT
TO anon
USING (true);

-- Allow public users to read appointments (needed to check availability)
CREATE POLICY "Public users can view appointments for booking"
ON public.appointments
FOR SELECT
TO anon
USING (true);

-- Allow public users to read brand_profiles (needed for booking page display)
CREATE POLICY "Public users can view brand profiles for booking"
ON public.brand_profiles
FOR SELECT
TO anon
USING (true);
