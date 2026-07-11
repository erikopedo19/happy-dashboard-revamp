ALTER TABLE public.agenda_settings REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;