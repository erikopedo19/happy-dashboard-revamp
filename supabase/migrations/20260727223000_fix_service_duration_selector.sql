-- Fix service duration/time selector by ensuring duration columns are numeric, non-null, and defaulted.

-- Services table: clean and enforce duration in minutes.
UPDATE public.services SET duration = 30 WHERE duration IS NULL;

ALTER TABLE public.services
  ALTER COLUMN duration SET DEFAULT 30,
  ALTER COLUMN duration SET NOT NULL,
  ADD CONSTRAINT services_duration_positive CHECK (duration > 0);

-- Agenda settings: clean and enforce default slot duration.
UPDATE public.agenda_settings SET service_duration = 30 WHERE service_duration IS NULL;

ALTER TABLE public.agenda_settings
  ALTER COLUMN service_duration SET DEFAULT 30,
  ALTER COLUMN service_duration SET NOT NULL,
  ADD CONSTRAINT agenda_settings_service_duration_positive CHECK (service_duration > 0);
