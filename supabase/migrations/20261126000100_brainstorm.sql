-- Brainstorm: quadros brancos infinitos do Creator (cena do Excalidraw em jsonb)
create table if not exists public.brainstorm_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Quadro sem título',
  color text,
  scene jsonb not null default '{}'::jsonb,
  files jsonb not null default '{}'::jsonb,
  preview text,
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brainstorm_boards_owner_idx on public.brainstorm_boards (owner_id, updated_at desc);

alter table public.brainstorm_boards enable row level security;
create policy "brainstorm_own_select" on public.brainstorm_boards for select using (owner_id = auth.uid());
create policy "brainstorm_own_insert" on public.brainstorm_boards for insert with check (owner_id = auth.uid());
create policy "brainstorm_own_update" on public.brainstorm_boards for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "brainstorm_own_delete" on public.brainstorm_boards for delete using (owner_id = auth.uid());

create or replace function public.brainstorm_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create or replace trigger brainstorm_boards_touch before update on public.brainstorm_boards
  for each row execute function public.brainstorm_touch();

-- Imagens dos quadros: bucket privado, pasta = id do usuário
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brainstorm', 'brainstorm', false, 10485760, array['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/avif'])
on conflict (id) do nothing;

create policy "brainstorm_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'brainstorm' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "brainstorm_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'brainstorm' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "brainstorm_files_update" on storage.objects for update to authenticated
  using (bucket_id = 'brainstorm' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "brainstorm_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'brainstorm' and (storage.foldername(name))[1] = auth.uid()::text);

-- Libera a ferramenta nos planos que têm o Creator
update public.plans set tools = array_append(tools, 'creator:brainstorm')
  where 'creator:producao' = any(tools) and not ('creator:brainstorm' = any(tools));
update public.profiles set tools = array_append(tools, 'creator:brainstorm')
  where tools is not null and 'creator:producao' = any(tools) and not ('creator:brainstorm' = any(tools));
