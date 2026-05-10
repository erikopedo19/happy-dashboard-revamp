CREATE TABLE IF NOT EXISTS public.message_templates (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_subject TEXT NOT NULL DEFAULT 'Booking Confirmation - {{businessName}}',
  email_body TEXT NOT NULL DEFAULT 'Hi {{customerName}}, your {{serviceName}} appointment with {{businessName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}.',
  sms_body TEXT NOT NULL DEFAULT '{{businessName}}: Your {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} is confirmed.',
  accent_color TEXT NOT NULL DEFAULT '#2563eb',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates" ON public.message_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);