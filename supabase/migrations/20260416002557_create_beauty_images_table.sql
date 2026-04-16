create table if not exists public.beauty_booking_request_images (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references public.beauty_booking_requests(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  image_type text not null check(image_type in ('current', 'style')),
  bucket_name text not null default 'booking',
  storage_path text not null,
  original_file_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for querying images by request
create index if not exists idx_beauty_images_request_id on public.beauty_booking_request_images(request_id);
create index if not exists idx_beauty_images_user_id on public.beauty_booking_request_images(user_id);

-- RLS
alter table public.beauty_booking_request_images enable row level security;

-- Policies
create policy "Users can view their own booking images"
  on public.beauty_booking_request_images
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own booking images"
  on public.beauty_booking_request_images
  for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all booking images"
  on public.beauty_booking_request_images
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
