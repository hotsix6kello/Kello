-- Add columns for change request review
alter table public.beauty_booking_requests
add column if not exists status_before_change_request text,
add column if not exists change_request_status text check (change_request_status in ('approved', 'rejected', 'pending')) default 'pending',
add column if not exists change_reviewed_at timestamptz,
add column if not exists change_reviewed_by uuid references auth.users(id),
add column if not exists change_review_note text not null default '';
