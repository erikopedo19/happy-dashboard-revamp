create or replace function public.get_business_analytics_summary(
  _business_id uuid,
  _start_date date,
  _end_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  total_revenue numeric;
  total_appointments bigint;
  completed_count bigint;
  scheduled_count bigint;
  cancelled_count bigint;
  total_customers bigint;
  avg_ticket numeric;
  active_services bigint;
  active_stylists bigint;
  revenue_delta_pct integer;
  first_half_revenue numeric;
  second_half_revenue numeric;
  day_span integer;
  busiest_day_name text;
  busiest_day_count bigint;
  peak_hour_name text;
  peak_hour_count bigint;
  completion_rate integer;
begin
  -- core aggregates
  select
    coalesce(sum(a.price), 0),
    count(*),
    count(*) filter (where a.status = 'completed'),
    count(*) filter (where a.status in ('scheduled', 'confirmed')),
    count(*) filter (where a.status = 'cancelled'),
    count(distinct a.customer_id)
  into
    total_revenue,
    total_appointments,
    completed_count,
    scheduled_count,
    cancelled_count,
    total_customers
  from appointments a
  where a.user_id = _business_id
    and a.appointment_date between _start_date and _end_date;

  avg_ticket := case when total_appointments > 0 then total_revenue / total_appointments else 0 end;

  select count(*) into active_services
  from services where user_id = _business_id and deleted_at is null;

  select count(*) into active_stylists
  from stylists where user_id = _business_id and deleted_at is null;

  completion_rate := case when total_appointments > 0
    then round((completed_count::numeric / total_appointments) * 100)
    else 0 end;

  -- revenue delta vs prior period split
  day_span := greatest(1, _end_date - _start_date + 1);
  select
    coalesce(sum(case when a.appointment_date < _start_date + (day_span / 2) then a.price else 0 end), 0),
    coalesce(sum(case when a.appointment_date >= _start_date + (day_span / 2) then a.price else 0 end), 0)
  into first_half_revenue, second_half_revenue
  from appointments a
  where a.user_id = _business_id
    and a.appointment_date between _start_date and _end_date;

  revenue_delta_pct := case when first_half_revenue > 0
    then round(((second_half_revenue - first_half_revenue) / first_half_revenue) * 100)
    else 0 end;

  -- busiest day
  select
    case extract(dow from a.appointment_date)
      when 0 then 'Sun' when 1 then 'Mon' when 2 then 'Tue'
      when 3 then 'Wed' when 4 then 'Thu' when 5 then 'Fri' when 6 then 'Sat'
    end,
    count(*)
  into busiest_day_name, busiest_day_count
  from appointments a
  where a.user_id = _business_id
    and a.appointment_date between _start_date and _end_date
  group by extract(dow from a.appointment_date)
  order by count(*) desc
  limit 1;

  -- peak hour (8am-8pm)
  with hours as (
    select
      case
        when extract(hour from a.appointment_time::time) <= 12
        then extract(hour from a.appointment_time::time)::text || 'am'
        else (extract(hour from a.appointment_time::time) - 12)::text || 'pm'
      end as hour_label,
      count(*) as cnt
    from appointments a
    where a.user_id = _business_id
      and a.appointment_date between _start_date and _end_date
      and a.appointment_time is not null
      and extract(hour from a.appointment_time::time) between 8 and 20
    group by extract(hour from a.appointment_time::time)
  )
  select hour_label, cnt into peak_hour_name, peak_hour_count
  from hours
  order by cnt desc
  limit 1;

  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'total_appointments', total_appointments,
    'completed_count', completed_count,
    'scheduled_count', scheduled_count,
    'cancelled_count', cancelled_count,
    'total_customers', total_customers,
    'average_ticket', avg_ticket,
    'active_services', active_services,
    'active_stylists', active_stylists,
    'completion_rate', completion_rate,
    'revenue_delta_pct', revenue_delta_pct,
    'busiest_day', jsonb_build_object('day', busiest_day_name, 'count', busiest_day_count),
    'peak_hour', jsonb_build_object('hour', peak_hour_name, 'count', peak_hour_count),
    'status_breakdown', (
      select jsonb_agg(jsonb_build_object('name', name, 'value', val, 'fill', fill))
      from (values
        ('Completed', completed_count, '#30D158'),
        ('Scheduled', scheduled_count, '#0A84FF'),
        ('Cancelled', cancelled_count, '#FF375F')
      ) as v(name, val, fill)
      where val > 0
    ),
    'day_of_week_demand', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(c.cnt, 0)) order by d.ord)
      from (values
        ('Sun', 0), ('Mon', 1), ('Tue', 2), ('Wed', 3), ('Thu', 4), ('Fri', 5), ('Sat', 6)
      ) as d(day, ord)
      left join (
        select extract(dow from a.appointment_date) as dow, count(*) as cnt
        from appointments a
        where a.user_id = _business_id and a.appointment_date between _start_date and _end_date
        group by extract(dow from a.appointment_date)
      ) c on c.dow = d.ord
    ),
    'hourly_demand', (
      select jsonb_agg(jsonb_build_object('hour', h.hour_label, 'count', coalesce(c.cnt, 0)) order by h.ord)
      from (values
        ('8am', 8), ('9am', 9), ('10am', 10), ('11am', 11),
        ('12pm', 12), ('1pm', 13), ('2pm', 14), ('3pm', 15),
        ('4pm', 16), ('5pm', 17), ('6pm', 18), ('7pm', 19), ('8pm', 20)
      ) as h(hour_label, ord)
      left join (
        select extract(hour from a.appointment_time::time) as hr, count(*) as cnt
        from appointments a
        where a.user_id = _business_id
          and a.appointment_date between _start_date and _end_date
          and a.appointment_time is not null
        group by extract(hour from a.appointment_time::time)
      ) c on c.hr = h.ord
    )
  );

  return result;
end;
$$;
