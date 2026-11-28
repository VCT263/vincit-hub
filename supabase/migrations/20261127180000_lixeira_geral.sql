-- Lixeira geral do HUB (regra do Vinícius, 27/11): tudo que é apagado vai para a lixeira,
-- pode ser recuperado por 15 dias e só depois some de vez (cron diário).
--
-- Como funciona:
-- 1. A tela chama public.lixeira_apagar(tabela, filtro, rotulo, link). Ela cria um "lote",
--    marca a transação com app.lixeira_lote e apaga com as regras de acesso (RLS) da pessoa.
-- 2. O gatilho zz_lixeira em cada tabela guarda uma cópia de cada linha apagada, inclusive
--    as que saem em cascata (tarefas de um projeto, posts de uma conta...), e anota os vínculos
--    que viram null (ex.: tarefas que apontavam para a lista apagada).
-- 3. public.lixeira_restaurar(lote) devolve as linhas na ordem certa e refaz os vínculos.
-- 4. O cron hub-lixeira (private.lixeira_purge) apaga de vez os lotes com mais de 15 dias.
-- Apagar sem lote (limpezas internas do sistema) continua igual, sem passar pela lixeira.

create table if not exists public.lixeira_lotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rotulo text not null,
  origem text not null,
  link text,
  itens int not null default 0,
  resumo jsonb not null default '{}'::jsonb,
  apagado_em timestamptz not null default now()
);
create index if not exists lixeira_lotes_owner on public.lixeira_lotes (owner_id, apagado_em desc);
alter table public.lixeira_lotes enable row level security;
drop policy if exists lixeira_lotes_select on public.lixeira_lotes;
create policy lixeira_lotes_select on public.lixeira_lotes for select to authenticated using (owner_id = auth.uid());
drop policy if exists lixeira_lotes_insert on public.lixeira_lotes;
create policy lixeira_lotes_insert on public.lixeira_lotes for insert to authenticated with check (owner_id = auth.uid());
revoke all on public.lixeira_lotes from anon;
grant select, insert on public.lixeira_lotes to authenticated;

-- as cópias ficam fora da API (podem ter campos sensíveis, como tokens)
create table if not exists private.lixeira_itens (
  id bigserial primary key,
  lote uuid not null references public.lixeira_lotes(id) on delete cascade,
  tabela text not null,
  acao text not null check (acao in ('apagou', 'soltou')),
  linha jsonb not null
);
create index if not exists lixeira_itens_lote on private.lixeira_itens (lote, id);
revoke all on private.lixeira_itens from public, anon, authenticated;

create or replace function private.lixeira_capturar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  l uuid := nullif(current_setting('app.lixeira_lote', true), '')::uuid;
  d jsonb;
begin
  if l is null then
    if tg_op = 'DELETE' then return old; end if;
    return null;
  end if;
  if tg_op = 'DELETE' then
    insert into private.lixeira_itens (lote, tabela, acao, linha) values (l, tg_table_name, 'apagou', to_jsonb(old));
    update public.lixeira_lotes
      set itens = itens + 1,
          resumo = jsonb_set(resumo, array[tg_table_name], to_jsonb(coalesce((resumo->>tg_table_name)::int, 0) + 1))
      where id = l;
    return old;
  end if;
  -- update dentro de um lote = vínculo que virou null porque o pai foi apagado
  if to_jsonb(old) ? 'id' then
    select jsonb_object_agg(e.key, e.value) into d
      from jsonb_each(to_jsonb(old)) e
      where e.value <> 'null'::jsonb and (to_jsonb(new) -> e.key) = 'null'::jsonb;
    if d is not null then
      insert into private.lixeira_itens (lote, tabela, acao, linha)
        values (l, tg_table_name, 'soltou', d || jsonb_build_object('id', to_jsonb(old) -> 'id'));
    end if;
  end if;
  return null;
end $$;
revoke all on function private.lixeira_capturar() from public, anon, authenticated;

-- liga a lixeira em todas as tabelas do HUB (tabelas novas: rodar private.lixeira_ligar('nome'))
create or replace function private.lixeira_ligar(p_tabela text) returns void
language plpgsql security definer set search_path = public as $$
begin
  execute format('drop trigger if exists zz_lixeira_apagar on public.%I', p_tabela);
  execute format('drop trigger if exists zz_lixeira_soltar on public.%I', p_tabela);
  execute format('create trigger zz_lixeira_apagar before delete on public.%I for each row execute function private.lixeira_capturar()', p_tabela);
  execute format($f$create trigger zz_lixeira_soltar after update on public.%I for each row
    when (coalesce(current_setting('app.lixeira_lote', true), '') <> '') execute function private.lixeira_capturar()$f$, p_tabela);
end $$;
revoke all on function private.lixeira_ligar(text) from public, anon, authenticated;

do $$
declare t text;
begin
  for t in select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname <> 'lixeira_lotes'
  loop
    perform private.lixeira_ligar(t);
  end loop;
end $$;

-- Apagar pela lixeira. Roda com as permissões da pessoa (RLS vale).
-- p_passos: [{"tabela": "ag_tasks", "filtro": {"coluna": valor | [valores]}}, ...], na ordem; tudo vira um lote só.
-- Todas as colunas do filtro precisam bater.
create or replace function public.lixeira_apagar_varios(p_passos jsonb, p_rotulo text, p_link text default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  passo jsonb;
  tab text;
  filtro jsonb;
  rel regclass;
  l uuid;
  w text;
  k text;
  n int;
  tot int := 0;
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  if p_passos is null or jsonb_typeof(p_passos) <> 'array' or jsonb_array_length(p_passos) = 0 then raise exception 'nada para apagar'; end if;
  for passo in select * from jsonb_array_elements(p_passos) loop
    tab := passo->>'tabela';
    rel := to_regclass(format('public.%I', tab));
    if rel is null or not exists (select 1 from pg_trigger where tgrelid = rel and tgname = 'zz_lixeira_apagar') then
      raise exception 'tabela sem lixeira: %', tab;
    end if;
    filtro := passo->'filtro';
    if filtro is null or jsonb_typeof(filtro) <> 'object' or filtro = '{}'::jsonb then raise exception 'filtro vazio'; end if;
    for k in select jsonb_object_keys(filtro) loop
      if not exists (select 1 from pg_attribute where attrelid = rel and attname = k and attnum > 0 and not attisdropped) then
        raise exception 'coluna desconhecida: %', k;
      end if;
    end loop;
  end loop;
  insert into public.lixeira_lotes (rotulo, origem, link)
    values (left(coalesce(nullif(trim(p_rotulo), ''), p_passos->0->>'tabela'), 200), p_passos->0->>'tabela', p_link) returning id into l;
  perform set_config('app.lixeira_lote', l::text, true);
  for passo in select * from jsonb_array_elements(p_passos) loop
    tab := passo->>'tabela';
    filtro := passo->'filtro';
    w := '';
    for k in select jsonb_object_keys(filtro) loop
      w := w || format(' and t.%I::text = any (array(select jsonb_array_elements_text(case when jsonb_typeof($1->%L) = ''array'' then $1->%L else jsonb_build_array($1->%L) end)))', k, k, k, k);
    end loop;
    execute format('delete from public.%I t where true', tab) || w using filtro;
    get diagnostics n = row_count;
    tot := tot + n;
  end loop;
  perform set_config('app.lixeira_lote', '', true);
  if tot = 0 then raise exception 'nada para apagar'; end if;
  return jsonb_build_object('lote', l, 'apagados', tot);
end $$;
revoke all on function public.lixeira_apagar_varios(jsonb, text, text) from public, anon;
grant execute on function public.lixeira_apagar_varios(jsonb, text, text) to authenticated;

create or replace function public.lixeira_apagar(p_tabela text, p_filtro jsonb, p_rotulo text, p_link text default null)
returns jsonb language sql security invoker set search_path = public as $$
  select public.lixeira_apagar_varios(jsonb_build_array(jsonb_build_object('tabela', p_tabela, 'filtro', p_filtro)), p_rotulo, p_link);
$$;
revoke all on function public.lixeira_apagar(text, jsonb, text, text) from public, anon;
grant execute on function public.lixeira_apagar(text, jsonb, text, text) to authenticated;

-- Recuperar um lote inteiro.
create or replace function public.lixeira_restaurar(p_lote uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  lt public.lixeira_lotes;
  tabs text[];
  t text;
  pend bigint[];
  falhas bigint[];
  i bigint;
  it private.lixeira_itens;
  k text;
  prog boolean;
  n int := 0;
begin
  select * into lt from public.lixeira_lotes where id = p_lote and owner_id = auth.uid();
  if not found then raise exception 'item não encontrado na lixeira'; end if;
  select array_agg(distinct tabela) into tabs from private.lixeira_itens where lote = p_lote;
  -- sem gatilhos de histórico/tarefas automáticas: a linha volta exatamente como era
  foreach t in array coalesce(tabs, '{}') loop
    if to_regclass(format('public.%I', t)) is not null then execute format('alter table public.%I disable trigger user', t); end if;
  end loop;
  pend := array(select id from private.lixeira_itens where lote = p_lote and acao = 'apagou' order by id);
  loop
    falhas := '{}'; prog := false;
    foreach i in array pend loop
      select * into it from private.lixeira_itens where id = i;
      begin
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', it.tabela, it.tabela) using it.linha;
        prog := true; n := n + 1;
      exception
        when foreign_key_violation then falhas := falhas || i;
        when unique_violation then raise exception 'já existe um item igual a este no HUB (%). Renomeie ou apague o atual antes de recuperar.', it.tabela;
      end;
    end loop;
    exit when cardinality(falhas) = 0;
    if not prog then raise exception 'este item depende de outro que também está na lixeira. Recupere o outro primeiro.'; end if;
    pend := falhas;
  end loop;
  for it in select * from private.lixeira_itens where lote = p_lote and acao = 'soltou' order by id loop
    for k in select jsonb_object_keys(it.linha) loop
      continue when k = 'id';
      begin
        execute format('update public.%I x set %I = (jsonb_populate_record(null::public.%I, $1)).%I where x.id = ($1->>''id'')::uuid and x.%I is null',
          it.tabela, k, it.tabela, k, k) using it.linha;
      exception when foreign_key_violation then null; -- o pai não voltou: o vínculo fica solto
      end;
    end loop;
  end loop;
  foreach t in array coalesce(tabs, '{}') loop
    if to_regclass(format('public.%I', t)) is not null then execute format('alter table public.%I enable trigger user', t); end if;
  end loop;
  delete from public.lixeira_lotes where id = p_lote;
  return jsonb_build_object('recuperados', n, 'rotulo', lt.rotulo, 'link', lt.link);
end $$;
revoke all on function public.lixeira_restaurar(uuid) from public, anon;
grant execute on function public.lixeira_restaurar(uuid) to authenticated;

-- Apagar de vez depois de 15 dias: usa o cron hub-lixeira (private.lixeira_purge, PR #105).
create table if not exists private.lixeira_tabelas (
  tabela text primary key,
  coluna text not null default 'deleted_at',
  filtro text not null default 'true'
);
revoke all on private.lixeira_tabelas from public, anon, authenticated;
insert into private.lixeira_tabelas (tabela, coluna, filtro) values ('lixeira_lotes', 'apagado_em', 'true')
on conflict (tabela) do update set coluna = excluded.coluna, filtro = excluded.filtro;

-- Recomeçar do zero (Minha conta) também passa pela lixeira: dá para recuperar por 15 dias.
create or replace function public.reset_my_data(p_financeiro boolean, p_seu_dia boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r jsonb := '{}'::jsonb;
  n int;
  tot int := 0;
  l uuid;
begin
  if uid is null then raise exception 'sem login'; end if;
  insert into public.lixeira_lotes (owner_id, rotulo, origem, link)
    values (uid, 'Recomeçar do zero: ' || concat_ws(', ', case when p_financeiro then 'financeiro' end, case when p_seu_dia then 'tarefas e projetos' end), 'reset_my_data', '/conta')
    returning id into l;
  perform set_config('app.lixeira_lote', l::text, true);
  if coalesce(p_financeiro, false) then
    delete from public.fin_charges where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('cobrancas', n); tot := tot + n;
    delete from public.ag_transactions where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('lancamentos', n); tot := tot + n;
  end if;
  if coalesce(p_seu_dia, false) then
    delete from public.ag_tasks where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('tarefas', n); tot := tot + n;
    delete from public.ag_projects where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('projetos', n); tot := tot + n;
    delete from public.ag_lists l2 where l2.owner_id = uid
      and l2.space_id in (select s.id from public.ag_spaces s where s.owner_id = uid and s.kind = 'projetos');
    delete from public.status_history where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('historico', n); tot := tot + n;
  end if;
  perform set_config('app.lixeira_lote', '', true);
  if tot = 0 and not exists (select 1 from private.lixeira_itens where lote = l) then
    delete from public.lixeira_lotes where id = l;
  else
    r := r || jsonb_build_object('lote', l);
  end if;
  return r;
end $$;
revoke all on function public.reset_my_data(boolean, boolean) from public, anon;
grant execute on function public.reset_my_data(boolean, boolean) to authenticated;

-- Peças e carrosséis do Design também saem da lixeira depois de 15 dias (antes eram só arquivados).
insert into private.lixeira_tabelas (tabela, coluna, filtro) values ('design_projects', 'archived_at', 'kind in (''marca'', ''carrossel'', ''peca'')')
on conflict (tabela) do update set coluna = excluded.coluna, filtro = excluded.filtro;
