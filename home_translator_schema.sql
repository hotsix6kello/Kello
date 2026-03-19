create table if not exists public.booking_concierge_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  customer_locale text not null,
  original_text text not null,
  normalized_text text not null,
  response_ko text not null,
  response_localized text not null,
  structured_output jsonb not null,
  tools jsonb not null default '[]'::jsonb,
  booking_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_booking_concierge_session
  on public.booking_concierge_events(session_id, created_at desc);

create table if not exists public.booking_records (
  id text primary key,
  session_id text not null,
  service_name text not null,
  booking_date date not null,
  booking_time text not null,
  status text not null check (status in ('confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_booking_records_session
  on public.booking_records(session_id, created_at desc);

create table if not exists public.interpreter_sessions (
  id uuid primary key default gen_random_uuid(),
  ephemeral_token text not null,
  customer_locale text not null,
  staff_locale text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_interpreter_sessions_expiry
  on public.interpreter_sessions(expires_at desc);

create table if not exists public.interpreter_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interpreter_sessions(id) on delete cascade,
  speaker text not null check (speaker in ('customer', 'staff')),
  source_locale text not null,
  target_locale text not null,
  input_mode text not null check (input_mode in ('voice', 'text')),
  original_text text not null,
  translated_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_interpreter_turns_session
  on public.interpreter_turns(session_id, created_at desc);
