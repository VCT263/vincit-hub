-- Pré-projeto público: o cliente marca as letras e o mapa do gosto sem login (/g/[token]).
-- Token próprio, separado do link da apresentação (share_token).
alter table public.design_projects add column if not exists taste_token uuid unique;

create or replace function public.pub_get_taste(p_token uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('title', p.title, 'nome', coalesce(p.data->'brief'->>'nome', p.title), 'gosto', coalesce(p.data->'gosto', '{}'::jsonb))
  from public.design_projects p
  where p.taste_token = p_token and p.kind = 'marca' and p.archived_at is null;
$$;

create or replace function public.pub_submit_taste(p_token uuid, p_gosto jsonb, p_name text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare pr record; who text := left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120); g jsonb;
begin
  if jsonb_typeof(p_gosto) <> 'object' or length(p_gosto::text) > 20000 then return false; end if;
  select id, owner_id, title into pr from public.design_projects where taste_token = p_token and kind = 'marca' and archived_at is null;
  if not found then return false; end if;
  g := jsonb_build_object(
    'fontes', case when jsonb_typeof(p_gosto->'fontes') = 'object' then p_gosto->'fontes' else '{}'::jsonb end,
    'eixos', case when jsonb_typeof(p_gosto->'eixos') = 'object' then p_gosto->'eixos' else '{}'::jsonb end,
    'notas', left(coalesce(p_gosto->>'notas', ''), 4000),
    'cliente', jsonb_build_object('nome', who, 'em', now()));
  update public.design_projects set data = jsonb_set(data, '{gosto}', g, true) where id = pr.id;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (pr.owner_id, 'briefing', 'Cliente respondeu o pré-projeto', left(who || ' · ' || pr.title, 300),
          '/design/marcas/' || pr.id || '?etapa=preprojeto', 'design_project', pr.id, 'gosto:' || pr.id || ':' || extract(epoch from now())::bigint);
  return true;
end $$;

revoke all on function public.pub_get_taste(uuid) from public;
revoke all on function public.pub_submit_taste(uuid, jsonb, text) from public;
grant execute on function public.pub_get_taste(uuid) to anon, authenticated;
grant execute on function public.pub_submit_taste(uuid, jsonb, text) to anon, authenticated;
