alter table public.beauty_booking_requests
  add column if not exists customer_email text;
