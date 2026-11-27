-- Histórico de versões do briefing: cada vez que o cliente reenvia, a equipe edita ou pede para refazer,
-- a versão anterior vai para versoes (mais nova primeiro, guarda as 6 últimas).
-- Entrada: { at, por: 'cliente' | 'equipe', nome, motivo, answers }
alter table public.design_briefings add column if not exists versoes jsonb not null default '[]'::jsonb;

create or replace function public.briefing_push_versao(p_versoes jsonb, p_nova jsonb)
returns jsonb language sql immutable set search_path to '' as $$
  select coalesce(jsonb_agg(e order by n), '[]'::jsonb)
  from (select e, n from jsonb_array_elements(jsonb_build_array(p_nova) || coalesce(p_versoes, '[]'::jsonb)) with ordinality t(e, n) order by n limit 6) s;
$$;

create or replace function public.pub_submit_briefing(p_token uuid, p_answers jsonb, p_name text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare br record; refeito boolean;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 8000000 then return false; end if;
  select id, owner_id, title, status, answers, answered_at, respondent, versoes into br from public.design_briefings where token = p_token;
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
revoke all on function public.briefing_push_versao(jsonb, jsonb) from public, anon;
