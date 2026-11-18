CREATE OR REPLACE FUNCTION public.get_appointment_by_token(_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', a.id,
    'appointment_date', a.appointment_date,
    'appointment_time', a.appointment_time,
    'status', COALESCE(a.status,'scheduled'),
    'notes', a.notes,
    'service', jsonb_build_object('id', s.id, 'name', s.name, 'duration', COALESCE(a.duration_minutes, s.duration), 'price', COALESCE(a.original_price, s.price)),
    'business', jsonb_build_object(
      'id', p.id,
      'name', COALESCE(p.business_name, p.full_name),
      'brand_color', COALESCE(p.brand_color, '#e0c4a8'),
      'avatar_url', p.avatar_url,
      'banner_url', p.banner_url,
      'address', p.address,
      'phone', p.phone
    ),
    'customer', jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone)
  )
  FROM public.appointments a
  JOIN public.services s ON s.id = a.service_id
  JOIN public.profiles p ON p.id = a.user_id
  JOIN public.customers c ON c.id = a.customer_id
  WHERE a.cancel_token = _token
  LIMIT 1;
$function$;