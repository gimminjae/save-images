create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  cover_media_id uuid,
  sort_order integer not null default 0,
  depth integer not null default 0,
  path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  total_files integer not null default 0,
  completed_files integer not null default 0,
  failed_files integer not null default 0,
  status text not null check (status in ('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  title text not null,
  description text,
  original_filename text not null,
  original_extension text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  checksum text,
  width integer,
  height integer,
  duration_seconds numeric,
  original_s3_key text,
  preview_s3_key text,
  thumbnail_s3_key text,
  poster_s3_key text,
  status text not null check (status in ('pending', 'uploading', 'processing', 'ready', 'failed', 'deleted')),
  upload_session_id uuid references public.upload_sessions(id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists categories_event_parent_sort_idx
  on public.categories (event_slug, parent_id, sort_order);

create index if not exists categories_event_path_idx
  on public.categories (event_slug, path);

create unique index if not exists categories_event_slug_unique_idx
  on public.categories (event_slug, path);

create index if not exists media_event_category_created_idx
  on public.media (event_slug, category_id, created_at desc);

create index if not exists media_event_type_created_idx
  on public.media (event_slug, media_type, created_at desc);

create index if not exists media_event_status_idx
  on public.media (event_slug, status);

create index if not exists media_checksum_idx
  on public.media (checksum);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at
before update on public.media
for each row execute function public.set_updated_at();
