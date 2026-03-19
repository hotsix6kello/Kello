-- Add operator-specific fields to beauty_booking_requests
alter table public.beauty_booking_requests 
add column if not exists operator_status text default 'pending_assignment',
add column if not exists internal_note text,
add column if not exists shop_contacted boolean default false,
add column if not exists customer_contacted boolean default false,
add column if not exists follow_up_needed boolean default false;

-- Create an index for operator_status to help admins filter
create index if not exists beauty_booking_requests_operator_status_idx on public.beauty_booking_requests(operator_status);

-- Note: No RLS changes needed as existing 'admin' policies already allow full access, 
-- and customer 'select' policies only return specific columns if they were restricted (check existing RLS).
-- If customer policy is 'select *', we might need to be careful.
-- Let's check existing policies.
