-- Lixeira do HUB (regra do Vinícius, 27/11/2026): excluir pede a senha de novo e manda o item para a lixeira
-- por 15 dias, de onde pode ser recuperado. Depois o cron diário hub-lixeira apaga de vez.
-- Para pôr uma tabela nova na lixeira: coluna deleted_at timestamptz + uma linha em private.lixeira_tabelas.

create table if not exists private.lixeira_tabelas (
  tabela text primary key,           -- nome em public
  coluna text not null default 'deleted_at',
  filtro text not null default 'true' -- condição extra (sql), ex.: kind = 'marca'
);
revoke all on private.lixeira_tabelas from public, anon, authenticated;

create or replace function private.lixeira_purge() returns void language plpgsql security definer set search_path to '' as $$
declare t record;
begin
  for t in select * from private.lixeira_tabelas loop
    execute format('delete from public.%I where %I is not null and %I < now() - interval ''15 days'' and (%s)', t.tabela, t.coluna, t.coluna, t.filtro);
  end loop;
end $$;
revoke all on function private.lixeira_purge() from public, anon, authenticated;

-- briefings entram na lixeira
alter table public.design_briefings add column if not exists deleted_at timestamptz;
insert into private.lixeira_tabelas (tabela, coluna, filtro) values
  ('design_briefings', 'deleted_at', 'true'),
  ('design_projects', 'archived_at', 'kind = ''marca''')
on conflict (tabela) do update set coluna = excluded.coluna, filtro = excluded.filtro;

-- o cron antigo das marcas vira o cron geral
select cron.unschedule('design-lixeira') where exists (select 1 from cron.job where jobname = 'design-lixeira');
select cron.unschedule('hub-lixeira') where exists (select 1 from cron.job where jobname = 'hub-lixeira');
select cron.schedule('hub-lixeira', '17 6 * * *', 'select private.lixeira_purge()');

-- link público do briefing some enquanto estiver na lixeira
create or replace function public.pub_get_briefing(p_token uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'title', b.title, 'client_name', b.client_name, 'intro', b.intro, 'status', b.status,
    'answered_at', b.answered_at, 'company', s.company_name,
    'answers', case when b.answered_at is not null then b.answers else null end)
  from public.design_briefings b
  left join public.ag_settings s on s.owner_id = b.owner_id
  where b.token = p_token and b.status <> 'arquivado' and b.deleted_at is null;
$$;
revoke all on function public.pub_get_briefing(uuid) from public;
grant execute on function public.pub_get_briefing(uuid) to anon, authenticated;

-- envio do cliente também é recusado enquanto estiver na lixeira
create or replace function public.pub_submit_briefing(p_token uuid, p_answers jsonb, p_name text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare br record; refeito boolean;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 8000000 then return false; end if;
  select id, owner_id, title, status, answers, answered_at, respondent, versoes into br from public.design_briefings where token = p_token and deleted_at is null;
  if not found or br.status not in ('aberto', 'respondido') then return false; end if;
  refeito := br.answered_at is not null or jsonb_array_length(br.versoes) > 0;
  update public.design_briefings
     set answers = p_answers - '_editado_em', status = 'respondido', answered_at = now(),
         respondent = left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120),
         versoes = case when br.answered_at is not null and br.answers <> '{}'::jsonb
                        then public.briefing_push_versao(br.versoes, jsonb_build_object('at', coalesce(br.answers->>'_editado_em', br.answered_at::text), 'por', 'cliente', 'nome', br.respondent, 'motivo', 'Resposta anterior do cliente', 'answers', br.answers))
                        else br.versoes end
   where id = br.id;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (br.owner_id, 'briefing', case when refeito then 'Briefing refeito' else 'Briefing respondido' end,
          left(coalesce(nullif(trim(p_name), ''), 'O cliente') || case when refeito then ' reenviou o briefing ' else ' respondeu o briefing ' end || br.title, 300),
          '/design/briefings/' || br.id, 'design_briefing', br.id, 'briefing:' || br.id || ':' || extract(epoch from now())::bigint)
  on conflict (owner_id, dedup_key) do nothing;
  return true;
end $$;
revoke all on function public.pub_submit_briefing(uuid, jsonb, text) from public;
grant execute on function public.pub_submit_briefing(uuid, jsonb, text) to anon, authenticated;
