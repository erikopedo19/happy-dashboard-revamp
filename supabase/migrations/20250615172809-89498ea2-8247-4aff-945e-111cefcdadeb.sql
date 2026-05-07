
-- Add price field to appointments table to track revenue
ALTER TABLE public.appointments 
ADD COLUMN price DECIMAL(10,2);

-- Add index for better performance on revenue queries
CREATE INDEX idx_appointments_date_status ON public.appointments(appointment_date, status);
CREATE INDEX idx_appointments_user_date ON public.appointments(user_id, appointment_date);
