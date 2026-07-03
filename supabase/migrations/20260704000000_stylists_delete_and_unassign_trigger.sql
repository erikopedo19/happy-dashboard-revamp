-- Ensure all required columns exist on stylists
ALTER TABLE public.stylists
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS specialties text[],
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS satisfaction numeric(3,1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS bookings_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_availability text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- RLS: delete policy (DROP + CREATE — IF NOT EXISTS is not valid for CREATE POLICY)
DROP POLICY IF EXISTS "owner_delete_stylists" ON public.stylists;
CREATE POLICY "owner_delete_stylists"
  ON public.stylists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: when a stylist is deleted, unassign them from future appointments only
-- Past appointments are preserved (appointment_date >= CURRENT_DATE guard)
CREATE OR REPLACE FUNCTION public.unassign_deleted_stylist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.appointments
  SET stylist_id = NULL
  WHERE stylist_id = OLD.id
    AND appointment_date >= CURRENT_DATE;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_stylist_deleted ON public.stylists;
CREATE TRIGGER on_stylist_deleted
  BEFORE DELETE ON public.stylists
  FOR EACH ROW
  EXECUTE FUNCTION public.unassign_deleted_stylist();
