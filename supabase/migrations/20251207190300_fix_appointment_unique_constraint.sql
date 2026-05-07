-- Fix the appointment unique constraint issue
-- The current constraint prevents multiple appointments at the same time for the same user
-- This causes error 1005 when trying to book multiple appointments at the same time slot
-- (e.g., when a business has multiple stylists or wants to allow overlapping bookings)

-- Drop the existing unique constraint that's too restrictive
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_user_id_appointment_date_appointment_time_key;

-- Instead, we'll rely on application-level logic to prevent double-booking
-- This allows flexibility for:
-- 1. Multiple stylists working at the same time
-- 2. Different services that can overlap
-- 3. Business-specific booking rules

-- Add an index to improve query performance for availability checks
CREATE INDEX IF NOT EXISTS idx_appointments_user_date_time 
ON public.appointments(user_id, appointment_date, appointment_time);
