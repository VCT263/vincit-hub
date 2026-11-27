-- Histórico diário da conta do Instagram (o Instagram só entrega 30 dias; aqui guardamos para comparar mês a mês)
create table if not exists public.ig_account_daily (
  account_id uuid not null references public.ig_accounts(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  views integer,
  reach integer,
  total_interactions integer,
  profile_views integer,
  profile_links_taps integer,
  follows integer,
  followers_count integer,
  updated_at timestamptz not null default now(),
  primary key (account_id, day)
);
create index if not exists ig_account_daily_owner on public.ig_account_daily (owner_id, day);
alter table public.ig_account_daily enable row level security;
create policy "ig_daily_own_select" on public.ig_account_daily for select using (owner_id = auth.uid());
create policy "ig_daily_own_insert" on public.ig_account_daily for insert with check (owner_id = auth.uid());
create policy "ig_daily_own_update" on public.ig_account_daily for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
