-- Entrevista de marca (Creator): conversa por voz ou texto que propõe o briefing do perfil.
-- turns: [{r:'e'|'p', t, quem, tema, at, via:'hub'|'claude'}]; proposta: briefing sugerido (aprovado na tela).
create table if not exists public.brand_interviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ig_accounts(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'andamento' check (status in ('andamento', 'concluida', 'aprovada', 'arquivada')),
  turns jsonb not null default '[]'::jsonb,
  tema int not null default 1,
  notas jsonb not null default '[]'::jsonb,
  proposta jsonb,
  aprovada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_interviews_account on public.brand_interviews(account_id, updated_at desc);

alter table public.brand_interviews enable row level security;

drop policy if exists brand_interviews_sel on public.brand_interviews;
create policy brand_interviews_sel on public.brand_interviews for select to authenticated
  using (owner_id = auth.uid() or public.ig_can(account_id));
drop policy if exists brand_interviews_ins on public.brand_interviews;
create policy brand_interviews_ins on public.brand_interviews for insert to authenticated
  with check (owner_id = auth.uid() and public.ig_can(account_id));
drop policy if exists brand_interviews_upd on public.brand_interviews;
create policy brand_interviews_upd on public.brand_interviews for update to authenticated
  using (owner_id = auth.uid() or public.ig_can(account_id))
  with check (owner_id = auth.uid() or public.ig_can(account_id));
-- sem delete: entrevista sai da lista com status 'arquivada'
