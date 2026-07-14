create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  path text not null unique,
  depth integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_parent_sort_idx
  on public.categories (parent_id, sort_order);

create index if not exists categories_path_idx
  on public.categories (path);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text not null,
  department text not null default '',
  description text not null default '',
  image_url text not null,
  image_key text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  image_width integer,
  image_height integer,
  status text not null default 'published' check (status in ('published')),
  is_visible boolean not null default true,
  is_category_featured boolean not null default false,
  is_main_featured boolean not null default false,
  is_deleted boolean not null default false,
  thumbnail_url text,
  event_id text,
  author_id text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_category_idx
  on public.memories (category_id, created_at desc);

create index if not exists memories_main_featured_idx
  on public.memories (is_main_featured, is_visible, is_deleted, created_at desc);

create index if not exists memories_category_featured_idx
  on public.memories (category_id, is_category_featured, is_visible, is_deleted, created_at desc);

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

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.memories enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.categories
  to anon, authenticated;

grant select, insert, update, delete on table public.memories
  to anon, authenticated;

drop policy if exists "public can read categories" on public.categories;
drop policy if exists "public can manage categories" on public.categories;
create policy "public can manage categories"
on public.categories
for all
using (true)
with check (true);

drop policy if exists "public can read visible memories" on public.memories;
drop policy if exists "public can manage memories" on public.memories;
create policy "public can manage memories"
on public.memories
for all
using (true)
with check (true);
