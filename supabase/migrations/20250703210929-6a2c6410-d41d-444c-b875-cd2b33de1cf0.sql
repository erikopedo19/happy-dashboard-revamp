-- Create public booking policies to allow external users to book appointments
-- First, we need to modify RLS policies to allow public bookings

-- Allow public users to read services (needed for booking form)
CREATE POLICY "Public users can view services for booking"
ON public.services
FOR SELECT
TO anon
USING (true);

-- Allow public users to create appointments (for public booking)
CREATE POLICY "Public users can create appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public users to create customers (for new customer during booking)
CREATE POLICY "Public users can create customers for booking"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (true);

-- Add a booking_link column to profiles for shareable booking links
ALTER TABLE public.profiles 
ADD COLUMN booking_link TEXT UNIQUE;

-- Create function to generate unique booking links
CREATE OR REPLACE FUNCTION public.generate_booking_link()
RETURNS TEXT AS $$
BEGIN
  RETURN 'book-' || encode(gen_random_bytes(8), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-generate booking link for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_booking_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_link IS NULL THEN
    NEW.booking_link = public.generate_booking_link();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_link
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_booking_link();

-- Enable realtime for appointments table
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;