-- Design: projetos de marca (briefing → referências → logo → cores → tipografia → manual)
-- e peças (carrossel e estático). Tudo do projeto fica em data jsonb.
create table if not exists public.design_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'marca' check (kind in ('marca', 'carrossel', 'peca')),
  title text not null default 'Projeto sem nome',
  client_id uuid,
  brand_id uuid references public.design_projects(id) on delete set null,
  step text not null default 'briefing',
  data jsonb not null default '{}'::jsonb,
  preview text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_projects_owner_idx on public.design_projects (owner_id, kind, updated_at desc);

alter table public.design_projects enable row level security;
create policy "design_own_select" on public.design_projects for select using (owner_id = auth.uid());
create policy "design_own_insert" on public.design_projects for insert with check (owner_id = auth.uid());
create policy "design_own_update" on public.design_projects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "design_own_delete" on public.design_projects for delete using (owner_id = auth.uid());

create or replace function public.design_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create or replace trigger design_projects_touch before update on public.design_projects
  for each row execute function public.design_touch();

-- Libera a seção Design nos planos que têm o Creator
update public.plans set tools = tools || array['design:marca', 'design:pecas']
  where 'creator:producao' = any(tools) and not ('design:marca' = any(tools));
update public.profiles set tools = tools || array['design:marca', 'design:pecas']
  where tools is not null and 'creator:producao' = any(tools) and not ('design:marca' = any(tools));
