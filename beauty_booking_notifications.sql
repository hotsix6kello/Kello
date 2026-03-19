-- Create beauty booking notifications table
create table if not exists public.beauty_booking_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references public.beauty_booking_requests(id) on delete cascade,
  event_type text not null,
  title text not null,
  message text not null,
  channel text not null default 'in_app',
  status text not null default 'sent', -- sent, failed, read
  metadata_json jsonb default '{}'::jsonb,
  read_at timestamptz
);

-- Index for faster retrieval by user
create index if not exists beauty_booking_notifications_user_id_idx on public.beauty_booking_notifications(user_id);
create index if not exists beauty_booking_notifications_booking_id_idx on public.beauty_booking_notifications(booking_id);

-- Enable RLS
alter table public.beauty_booking_notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on public.beauty_booking_notifications for select
  using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.beauty_booking_notifications for insert
  with check (true); -- Usually restricted to service_role in production, but allowing for now per system design
