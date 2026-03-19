-- Add 'change_requested' to status constraint
alter table public.beauty_booking_requests
drop constraint if exists beauty_booking_requests_status_check;

alter table public.beauty_booking_requests
add constraint beauty_booking_requests_status_check
check (status in ('requested', 'confirmed', 'completed', 'canceled', 'failed', 'change_requested'));

-- Add columns for change tracking
alter table public.beauty_booking_requests
add column if not exists change_requested_at timestamptz,
add column if not exists change_reason text not null default '';
