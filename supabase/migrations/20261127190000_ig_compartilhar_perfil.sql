-- Agência e cliente: o dono de um perfil do Instagram (ex.: a conta da ISYS) compartilha o perfil
-- com outra conta do HUB (ex.: a agência do Vinícius), que passa a ver e sincronizar os dados como administradora.
-- As políticas novas somam às antigas (permissivas): nada do dono muda.

create table if not exists public.ig_account_members (
  account_id uuid not null references public.ig_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','leitura')),
  added_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index if not exists ig_account_members_user on public.ig_account_members(user_id);

-- dono ou membro do perfil
create or replace function public.ig_can(p_account uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ig_accounts a where a.id = p_account and a.owner_id = auth.uid())
      or exists (select 1 from public.ig_account_members m where m.account_id = p_account and m.user_id = auth.uid());
$$;
revoke all on function public.ig_can(uuid) from public, anon;
grant execute on function public.ig_can(uuid) to authenticated;

-- membro administrador (pode editar briefing e sincronizar)
create or replace function public.ig_can_admin(p_account uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ig_accounts a where a.id = p_account and a.owner_id = auth.uid())
      or exists (select 1 from public.ig_account_members m where m.account_id = p_account and m.user_id = auth.uid() and m.role = 'admin');
$$;
revoke all on function public.ig_can_admin(uuid) from public, anon;
grant execute on function public.ig_can_admin(uuid) to authenticated;

alter table public.ig_account_members enable row level security;
create policy igm_sel on public.ig_account_members for select using (public.ig_can(account_id));
create policy igm_del on public.ig_account_members for delete
  using (exists (select 1 from public.ig_accounts a where a.id = account_id and a.owner_id = auth.uid()) or user_id = auth.uid());
-- inclusão só pela função ig_add_member

create policy member_select on public.ig_accounts for select using (public.ig_can(id));
create policy member_update on public.ig_accounts for update using (public.ig_can_admin(id)) with check (public.ig_can_admin(id));

create policy member_select on public.ig_posts for select using (public.ig_can(account_id));
create policy member_insert on public.ig_posts for insert with check (public.ig_can_admin(account_id));
create policy member_update on public.ig_posts for update using (public.ig_can_admin(account_id)) with check (public.ig_can_admin(account_id));

create policy member_select on public.ig_account_daily for select using (public.ig_can(account_id));
create policy member_insert on public.ig_account_daily for insert with check (public.ig_can_admin(account_id));
create policy member_update on public.ig_account_daily for update using (public.ig_can_admin(account_id)) with check (public.ig_can_admin(account_id));

create or replace function public.ig_add_member(p_account uuid, p_email text, p_role text default 'admin') returns json
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_name text;
begin
  if not exists (select 1 from public.ig_accounts where id = p_account and owner_id = auth.uid()) then
    raise exception 'Só o dono do perfil compartilha';
  end if;
  select id, coalesce(name, email) into v_user, v_name from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then raise exception 'Nenhuma conta do HUB com esse e-mail'; end if;
  if v_user = auth.uid() then raise exception 'Esse e-mail já é o dono do perfil'; end if;
  insert into public.ig_account_members(account_id, user_id, role) values (p_account, v_user, coalesce(p_role, 'admin'))
    on conflict (account_id, user_id) do update set role = excluded.role;
  return json_build_object('user_id', v_user, 'name', v_name);
end $$;
revoke all on function public.ig_add_member(uuid, text, text) from public, anon;
grant execute on function public.ig_add_member(uuid, text, text) to authenticated;

create or replace function public.ig_member_list(p_account uuid) returns table (user_id uuid, name text, email text, role text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select a.owner_id, p.name, p.email, 'dono', true from public.ig_accounts a left join public.profiles p on p.id = a.owner_id
   where a.id = p_account and public.ig_can(p_account)
  union all
  select m.user_id, p.name, p.email, m.role, false from public.ig_account_members m left join public.profiles p on p.id = m.user_id
   where m.account_id = p_account and public.ig_can(p_account);
$$;
revoke all on function public.ig_member_list(uuid) from public, anon;
grant execute on function public.ig_member_list(uuid) to authenticated;

-- token: o dono ou um membro administrador sincroniza
create or replace function public.ig_token_for(p_account_id uuid, p_owner uuid)
returns text language sql stable security definer set search_path to '' as $$
  select t.access_token from private.ig_tokens t
  join public.ig_accounts a on a.id = t.account_id
  where t.account_id = p_account_id
    and (a.owner_id = p_owner
         or exists (select 1 from public.ig_account_members m
                     where m.account_id = p_account_id and m.user_id = p_owner and m.role = 'admin'));
$$;
