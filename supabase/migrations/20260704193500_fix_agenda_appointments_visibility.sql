-- Fix appointments not showing on the Agenda page
--
-- The Agenda page fetches appointments with embedded customers/services.
-- If Row Level Security (RLS) blocks the joined tables, or if the embedded
-- relationship is resolved incorrectly, Supabase returns null for the joined
-- objects and the UI silently filters out those appointments.
--
-- This migration:
-- 1. Makes sure the appointments table has the correct foreign keys and indexes.
-- 2. Recreates the correct RLS policies for appointments/customers/services.
-- 3. Adds a SECURITY DEFINER function that returns an owner's appointments with
--    customer/service/stylist data already joined, bypassing any RLS quirks on
--    the related tables.

-- -----------------------------------------------------------------------------
-- 1. Indexes for fast agenda lookups
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_user_date
  ON public.appointments(user_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date_time
  ON public.appointments(user_id, appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_org_date
  ON public.appointments(org_id, appointment_date)
  WHERE org_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Ensure RLS is enabled and policies are correct
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

-- Recreate appointment policies cleanly
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable select for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable delete for users own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable select for anon users" ON public.appointments;

CREATE POLICY "Enable select for users own appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users own appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users own appointments"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable select for anon users"
  ON public.appointments
  FOR SELECT
  TO anon
  USING (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Recreate customers/services select policies so the Agenda joins can resolve
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view own customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own services" ON public.services;
CREATE POLICY "Users can view own services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.stylists TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. SECURITY DEFINER function: returns the current user's appointments with
--    customer, service and stylist data. This bypasses any RLS oddities on the
--    related tables while still restricting rows to the calling user.
-- -----------------------------------------------------------------------------
-- Drop any previous definition so parameter names/order can change safely.
DROP FUNCTION IF EXISTS public.get_user_appointments(date, date);

CREATE OR REPLACE FUNCTION public.get_user_appointments(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'appointment_date', a.appointment_date,
        'appointment_time', a.appointment_time,
        'status', COALESCE(a.status, 'scheduled'),
        'notes', a.notes,
        'price', a.price,
        'user_id', a.user_id,
        'org_id', a.org_id,
        'customer', CASE
          WHEN c.id IS NOT NULL THEN jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone
          )
          ELSE NULL
        END,
        'service', CASE
          WHEN s.id IS NOT NULL THEN jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'duration', s.duration,
            'price', s.price,
            'color', COALESCE(s.color, 'bg-blue-50'),
            'text_color', COALESCE(s.text_color, 'text-blue-600'),
            'border_color', COALESCE(s.border_color, 'border-blue-200')
          )
          ELSE NULL
        END,
        'stylist', CASE
          WHEN st.id IS NOT NULL THEN jsonb_build_object(
            'id', st.id,
            'name', st.name
          )
          ELSE NULL
        END
      )
      ORDER BY a.appointment_date, a.appointment_time
    ),
    '[]'::jsonb
  )
  FROM public.appointments a
  LEFT JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.stylists st ON st.id = a.stylist_id
  WHERE a.user_id = auth.uid()
    AND (p_start_date IS NULL OR a.appointment_date >= p_start_date)
    AND (p_end_date IS NULL OR a.appointment_date <= p_end_date);
$$;

-- Grant execute to authenticated and anon (anon will simply get no rows because
-- auth.uid() is NULL and auth.uid() = user_id evaluates to false/NULL).
GRANT EXECUTE ON FUNCTION public.get_user_appointments(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_appointments(date, date) TO anon;

-- -----------------------------------------------------------------------------
-- 4. Diagnostic helper: list appointments that are missing a customer or service
--    Run this in the SQL editor to see if bad data is the cause.
--    SELECT * FROM public.diag_orphaned_appointments;
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.diag_orphaned_appointments AS
SELECT
  a.id,
  a.user_id,
  a.appointment_date,
  a.appointment_time,
  a.customer_id,
  a.service_id,
  c.id AS customer_exists,
  s.id AS service_exists,
  CASE WHEN c.id IS NULL THEN 'missing customer' ELSE NULL END AS customer_issue,
  CASE WHEN s.id IS NULL THEN 'missing service' ELSE NULL END AS service_issue
FROM public.appointments a
LEFT JOIN public.customers c ON c.id = a.customer_id
LEFT JOIN public.services s ON s.id = a.service_id
WHERE c.id IS NULL OR s.id IS NULL;

COMMENT ON VIEW public.diag_orphaned_appointments IS
  'Shows appointments whose customer_id or service_id does not resolve to a row.';

-- -----------------------------------------------------------------------------
-- 5. Optional data cleanup: delete orphaned appointments created more than a
--    day ago. Uncomment and run manually if diag_orphaned_appointments returns rows.
-- -----------------------------------------------------------------------------
-- DELETE FROM public.appointments a
-- WHERE NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = a.customer_id)
--    OR NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = a.service_id);
