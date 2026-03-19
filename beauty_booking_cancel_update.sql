alter table public.beauty_booking_requests
add column if not exists canceled_at timestamptz;

alter table public.beauty_booking_requests
add column if not exists canceled_by text;

alter table public.beauty_booking_requests
add column if not exists cancel_reason text not null default '';

alter table public.beauty_booking_requests
drop constraint if exists beauty_booking_requests_canceled_by_check;

alter table public.beauty_booking_requests
add constraint beauty_booking_requests_canceled_by_check
check (canceled_by in ('customer', 'admin') or canceled_by is null);
