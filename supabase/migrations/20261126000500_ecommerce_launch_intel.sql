-- Lançamento da loja online (checklist, funil, acompanhamento mensal) e inteligência do negócio (persona, mix, preço, concorrentes).
create table if not exists public.ec_launch (
  store_id uuid primary key references public.ec_stores(id) on delete cascade,
  launch_date date,
  platform text default 'Nuvemshop',
  items jsonb not null default '[]'::jsonb,
  funnel jsonb not null default '{}'::jsonb,
  months jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.ec_intel (
  store_id uuid primary key references public.ec_stores(id) on delete cascade,
  persona jsonb not null default '{}'::jsonb,
  mix jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  products jsonb not null default '[]'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ec_launch enable row level security;
create policy ec_launch_all on public.ec_launch for all using (public.ec_can(store_id)) with check (public.ec_can(store_id));
alter table public.ec_intel enable row level security;
create policy ec_intel_all on public.ec_intel for all using (public.ec_can(store_id)) with check (public.ec_can(store_id));
