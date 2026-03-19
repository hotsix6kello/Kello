-- Beauty Booking Notification Preferences Table
create table if not exists public.beauty_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  booking_updates_enabled boolean not null default true,
  change_request_updates_enabled boolean not null default true,
  alternative_offer_updates_enabled boolean not null default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.beauty_notification_preferences enable row level security;

create policy "Users can view their own preferences"
on public.beauty_notification_preferences for select
using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
on public.beauty_notification_preferences for insert
with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
on public.beauty_notification_preferences for update
using (auth.uid() = user_id);
