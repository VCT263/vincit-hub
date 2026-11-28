-- Última versão das novidades de IA que cada pessoa já viu no Claude (conector VINCIT HUB).
create table if not exists public.hub_ai_seen (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  versao text not null,
  visto_em timestamptz not null default now()
);
alter table public.hub_ai_seen enable row level security;
drop policy if exists hub_ai_seen_own on public.hub_ai_seen;
create policy hub_ai_seen_own on public.hub_ai_seen for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
