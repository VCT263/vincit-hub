-- Seção E-commerce: plano estratégico de loja de moda (método Plano de 90 dias).
-- Vendas, caixa, estoque e financeiro continuam no ERP da loja (Nuvem Moda); aqui ficam metas, ações e campanhas.
-- Uma loja é compartilhada entre o dono e os membros que ele adiciona (ex.: usuário da própria loja).

create table if not exists public.ec_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  segment text,
  created_at timestamptz not null default now()
);

create table if not exists public.ec_members (
  store_id uuid not null references public.ec_stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index if not exists ec_members_user on public.ec_members(user_id);

-- dono ou membro da loja
create or replace function public.ec_can(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ec_stores s where s.id = p_store and s.owner_id = auth.uid())
      or exists (select 1 from public.ec_members m where m.store_id = p_store and m.user_id = auth.uid());
$$;
revoke all on function public.ec_can(uuid) from public, anon;
grant execute on function public.ec_can(uuid) to authenticated;

alter table public.ec_stores enable row level security;
create policy ec_stores_sel on public.ec_stores for select using (public.ec_can(id));
create policy ec_stores_ins on public.ec_stores for insert with check (owner_id = auth.uid());
create policy ec_stores_upd on public.ec_stores for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy ec_stores_del on public.ec_stores for delete using (owner_id = auth.uid());

alter table public.ec_members enable row level security;
create policy ec_members_sel on public.ec_members for select using (public.ec_can(store_id));
create policy ec_members_del on public.ec_members for delete
  using (exists (select 1 from public.ec_stores s where s.id = store_id and s.owner_id = auth.uid()) or user_id = auth.uid());
-- inclusão só pela função ec_add_member (busca o usuário pelo e-mail)

create or replace function public.ec_add_member(p_store uuid, p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_name text;
begin
  if not exists (select 1 from public.ec_stores where id = p_store and owner_id = auth.uid()) then
    raise exception 'Só o dono da loja adiciona pessoas';
  end if;
  select id, coalesce(name, email) into v_user, v_name from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then raise exception 'Nenhuma conta do HUB com esse e-mail'; end if;
  insert into public.ec_members(store_id, user_id) values (p_store, v_user) on conflict do nothing;
  return json_build_object('user_id', v_user, 'name', v_name);
end $$;
revoke all on function public.ec_add_member(uuid, text) from public, anon;
grant execute on function public.ec_add_member(uuid, text) to authenticated;

create or replace function public.ec_member_list(p_store uuid) returns table (user_id uuid, name text, email text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select s.owner_id, p.name, p.email, true from public.ec_stores s left join public.profiles p on p.id = s.owner_id
   where s.id = p_store and public.ec_can(p_store)
  union all
  select m.user_id, p.name, p.email, false from public.ec_members m left join public.profiles p on p.id = m.user_id
   where m.store_id = p_store and public.ec_can(p_store);
$$;
revoke all on function public.ec_member_list(uuid) from public, anon;
grant execute on function public.ec_member_list(uuid) to authenticated;

-- plano do trimestre (conferência de estoque, pró-labore, prioridades e fechamento)
create table if not exists public.ec_quarters (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.ec_stores(id) on delete cascade,
  year integer not null,
  quarter integer not null check (quarter between 1 and 4),
  stock_value numeric,
  stock_ok boolean,
  stock_plan text check (stock_plan in ('oportunidade','baixar_meta')),
  pro_labore numeric,
  pro_labore_day integer check (pro_labore_day between 1 and 31),
  priorities text[] not null default '{}',
  first_step text,
  closing text,
  updated_at timestamptz not null default now(),
  unique (store_id, year, quarter)
);

-- metas e compra de cada mês
create table if not exists public.ec_months (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.ec_stores(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  goal_min numeric,
  goal numeric,
  goal_super numeric,
  team_goal text,
  extra_label text,
  extra_goal numeric,
  buy_cap numeric,
  buy_until date,
  buy_notes text,
  launch text,
  colors text[] not null default '{}',
  result numeric,
  updated_at timestamptz not null default now(),
  unique (store_id, month)
);

-- ações e eventos do calendário (frase do método, meta, antes/durante/depois, VM e campanha)
create table if not exists public.ec_actions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.ec_stores(id) on delete cascade,
  title text not null,
  kind text not null default 'acao' check (kind in ('acao','data','lancamento','evento','liquidacao','live')),
  date date not null,
  end_date date,
  warmup_date date,
  goal numeric,
  goal_max numeric,
  do_what text,
  because text,
  offering text,
  audience text,
  aiming text,
  before_items jsonb not null default '[]'::jsonb,
  during_items jsonb not null default '[]'::jsonb,
  after_items jsonb not null default '[]'::jsonb,
  vm_date date,
  vm_window text,
  vm_have text,
  vm_need text,
  campaign jsonb,
  status text not null default 'planejada' check (status in ('planejada','em_andamento','concluida','cancelada')),
  result numeric,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ec_actions_store_date on public.ec_actions(store_id, date);

alter table public.ec_quarters enable row level security;
create policy ec_quarters_all on public.ec_quarters for all using (public.ec_can(store_id)) with check (public.ec_can(store_id));
alter table public.ec_months enable row level security;
create policy ec_months_all on public.ec_months for all using (public.ec_can(store_id)) with check (public.ec_can(store_id));
alter table public.ec_actions enable row level security;
create policy ec_actions_all on public.ec_actions for all using (public.ec_can(store_id)) with check (public.ec_can(store_id));
