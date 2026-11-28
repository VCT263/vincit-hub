-- Estilos de referência (28/11): um estilo junta vários links de referência e vai se alimentando.
-- Cada link é uma linha em references_lib com estilo_id; a folha (o que os vídeos têm em comum) fica no estilo
-- e só vira Kit de estilo (av_style_kits) quando a pessoa aprova. Aprovar de novo atualiza o mesmo Kit.
create table if not exists public.ref_estilos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.ig_accounts(id) on delete set null,
  name text not null,
  descricao text,
  folha jsonb,
  folha_refs uuid[] not null default '{}',
  folha_at timestamptz,
  folha_request uuid,
  kit_id uuid references public.av_style_kits(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ref_estilos enable row level security;
drop policy if exists ref_estilos_own on public.ref_estilos;
create policy ref_estilos_own on public.ref_estilos for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.references_lib add column if not exists estilo_id uuid references public.ref_estilos(id) on delete set null;
create index if not exists references_lib_estilo_idx on public.references_lib(estilo_id);
