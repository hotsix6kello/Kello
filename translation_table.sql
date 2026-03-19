-- ============================================================
-- Translation subsystem for beauty-first multilingual content
-- Base locale: ko
-- Target locales: en, ja, zh-CN
-- Future domain support: restaurant
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.translation_contents (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('beauty', 'restaurant')),
  content_type text not null check (
    content_type in ('shop', 'service', 'description', 'policy', 'chat_message', 'request_note', 'reservation')
  ),
  source_table text not null default '',
  source_id text not null default '',
  source_locale text not null default 'ko',
  source_version integer not null default 1,
  schema_version text not null default 'beauty-v1',
  mode text not null check (mode in ('static', 'realtime', 'structured')),
  source_hash text not null,
  source_payload jsonb,
  source_fields jsonb not null default '[]'::jsonb,
  target_locales text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending', 'translated', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(domain, content_type, source_table, source_id, source_hash)
);

create index if not exists idx_translation_contents_status
  on public.translation_contents(status, domain, content_type);

create table if not exists public.translation_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.translation_contents(id) on delete cascade,
  target_locale text not null check (target_locale in ('en', 'ja', 'zh-CN')),
  version integer not null default 1,
  cache_key text not null unique,
  source_hash text not null,
  translation_engine text not null,
  glossary_version integer not null default 1,
  translated_text text,
  translated_payload jsonb,
  translated_fields jsonb not null default '[]'::jsonb,
  fallback_used boolean not null default false,
  status text not null default 'translated' check (status in ('pending', 'translated', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(content_id, target_locale, version)
);

create index if not exists idx_translation_versions_lookup
  on public.translation_versions(content_id, target_locale, source_hash, version desc);

create table if not exists public.translation_glossary (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('beauty', 'restaurant')),
  source_locale text not null default 'ko',
  target_locale text not null check (target_locale in ('en', 'ja', 'zh-CN')),
  source_term text not null,
  target_term text not null,
  priority integer not null default 100,
  version integer not null default 1,
  notes text,
  is_active boolean not null default true,
  updated_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(domain, source_locale, target_locale, source_term, version)
);

create index if not exists idx_translation_glossary_lookup
  on public.translation_glossary(domain, target_locale, is_active, priority);

create table if not exists public.translation_batch_jobs (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('beauty', 'restaurant')),
  content_type text not null default 'all',
  requested_locales text[] not null default '{}'::text[],
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  queued_count integer not null default 0,
  processed_count integer not null default 0,
  translated_count integer not null default 0,
  failed_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.translation_contents enable row level security;
alter table public.translation_versions enable row level security;
alter table public.translation_glossary enable row level security;
alter table public.translation_batch_jobs enable row level security;

create policy "translation_glossary_select_admin"
  on public.translation_glossary
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "translation_glossary_write_admin"
  on public.translation_glossary
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Service role bypass is expected for translation batch jobs and server APIs.
