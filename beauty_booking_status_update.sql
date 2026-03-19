update public.beauty_booking_requests
set status = 'canceled'
where status = 'cancelled';

alter table public.beauty_booking_requests
drop constraint if exists beauty_booking_requests_status_check;

alter table public.beauty_booking_requests
add constraint beauty_booking_requests_status_check
check (status in ('requested', 'confirmed', 'completed', 'canceled', 'failed'));
