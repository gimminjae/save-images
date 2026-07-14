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
