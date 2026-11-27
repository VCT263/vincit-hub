-- Biblioteca de mockups fotográficos (PSD grátis do mockups-design.com) já preparados para o navegador:
-- base = foto com a área do design em preto; light_url de cada área = mapa de luz (W − K). A arte entra como K + D·L.
create table if not exists public.design_mockups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'outros',
  source_url text,
  file text,
  width int not null,
  height int not null,
  base_url text not null,
  thumb_url text,
  slots jsonb not null default '[]'::jsonb,
  sort int not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists design_mockups_cat_idx on public.design_mockups (category, sort);
alter table public.design_mockups enable row level security;
create policy "design_mockups_read" on public.design_mockups for select to authenticated using (true);
create policy "design_mockups_write" on public.design_mockups for insert to authenticated with check (true);
create policy "design_mockups_update" on public.design_mockups for update to authenticated using (true) with check (true);
create policy "design_mockups_delete" on public.design_mockups for delete to authenticated using (created_by = auth.uid());

insert into storage.buckets (id, name, public) values ('design-mockups', 'design-mockups', true) on conflict (id) do nothing;
create policy "design_mockups_obj_insert" on storage.objects for insert to authenticated with check (bucket_id = 'design-mockups');
create policy "design_mockups_obj_update" on storage.objects for update to authenticated using (bucket_id = 'design-mockups');
