ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_amount numeric;

CREATE OR REPLACE FUNCTION public.get_user_appointments(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'payment_status', COALESCE(a.payment_status, 'unpaid'),
        'paid_at', a.paid_at,
        'paid_amount', a.paid_amount,
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
$function$;