create extension if not exists pgcrypto;

create table if not exists public.beauty_booking_requests (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'beauty' check (category = 'beauty'),
  customer_user_id uuid references auth.users(id) on delete set null,
  beauty_category text not null,
  region text not null,
  store_id text not null,
  store_name text not null,
  booking_date date not null,
  booking_time text not null,
  designer_id text,
  designer_name text,
  primary_service_id text not null,
  primary_service_name text not null,
  add_on_ids text[] not null default '{}'::text[],
  add_on_names text[] not null default '{}'::text[],
  base_price integer not null default 0,
  add_on_price integer not null default 0,
  designer_surcharge integer not null default 0,
  total_price integer not null default 0,
  customer_name text not null,
  customer_phone text not null,
  customer_request text not null default '',
  communication_language text not null,
  communication_intent text not null,
  korean_message text not null,
  localized_message text not null,
  agreements jsonb not null default '{}'::jsonb,
  created_from_flow text not null default 'beauty-explore',
  payload_json jsonb not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'canceled', 'failed')),
  canceled_at timestamptz,
  canceled_by text check (canceled_by in ('customer', 'admin')),
  cancel_reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_beauty_booking_requests_created_at
  on public.beauty_booking_requests(created_at desc);

create index if not exists idx_beauty_booking_requests_booking_slot
  on public.beauty_booking_requests(beauty_category, booking_date, booking_time);

create index if not exists idx_beauty_booking_requests_customer_user
  on public.beauty_booking_requests(customer_user_id, created_at desc);

alter table public.beauty_booking_requests enable row level security;

-- Service role bypass is expected for server-side booking insert APIs.
