alter table public.beauty_booking_requests
add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_beauty_booking_requests_customer_user
  on public.beauty_booking_requests(customer_user_id, created_at desc);
