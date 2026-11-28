-- Design · Páginas e sites (pedido do Vinícius, 28/11): o Claude cria o código da página a partir do
-- briefing e do perfil, o HUB mostra a prévia interativa, o cliente comenta e aprova por um link
-- público e depois o código vai para onde a página será hospedada. A prévia é dado, não deploy.
create table if not exists public.web_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nova página',
  tipo text not null default 'landing' check (tipo in ('landing', 'site', 'loja', 'pagina')),
  account_id uuid references public.ig_accounts(id) on delete set null,
  brand_id uuid references public.design_projects(id) on delete set null,
  briefing jsonb not null default '{}'::jsonb,
  -- rascunho: briefing em montagem · pedido: esperando o Claude · revisao: versão pronta para ver/aprovar
  -- aprovado: cliente aprovou · entregue: código já foi para o destino
  status text not null default 'rascunho' check (status in ('rascunho', 'pedido', 'revisao', 'aprovado', 'entregue')),
  pedido text,
  -- [{n, nota, em, telas: [{slug, nome, html}]}], a última é a atual
  versions jsonb not null default '[]'::jsonb,
  -- [{id, v, tela, x, y, modo, texto, nome, de: cliente|equipe|claude, em, resolvido}]
  comments jsonb not null default '[]'::jsonb,
  approved jsonb,
  share_token uuid not null unique default gen_random_uuid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists web_pages_owner_idx on public.web_pages (owner_id, status, updated_at desc);

alter table public.web_pages enable row level security;
drop policy if exists web_pages_own on public.web_pages;
create policy web_pages_own on public.web_pages for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.web_pages from anon;

create or replace trigger web_pages_touch before update on public.web_pages
  for each row execute function public.design_touch();

-- lixeira: excluir grava archived_at; o cron hub-lixeira apaga de vez depois de 15 dias
select private.lixeira_ligar('web_pages');
insert into private.lixeira_tabelas (tabela, coluna, filtro) values ('web_pages', 'archived_at', 'true')
on conflict (tabela) do update set coluna = excluded.coluna, filtro = excluded.filtro;

-- ── link público (prévia para o cliente) ──
create or replace function public.pub_get_page(p_token uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'title', p.title, 'tipo', p.tipo, 'status', p.status, 'approved', p.approved, 'updated_at', p.updated_at,
    'company', s.company_name,
    'versao', p.versions -> (jsonb_array_length(p.versions) - 1),
    'comments', coalesce((select jsonb_agg(c) from jsonb_array_elements(p.comments) c
                          where c->>'de' in ('cliente', 'claude', 'equipe') and coalesce((c->>'resolvido')::boolean, false) = false), '[]'::jsonb))
  from public.web_pages p
  left join public.ag_settings s on s.owner_id = p.owner_id
  where p.share_token = p_token and p.archived_at is null and jsonb_array_length(p.versions) > 0;
$$;

create or replace function public.pub_page_comment(p_token uuid, p_tela text, p_x numeric, p_y numeric, p_modo text, p_texto text, p_nome text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare pr record; item jsonb; who text := left(coalesce(nullif(trim(p_nome), ''), 'Cliente'), 80);
begin
  if coalesce(trim(p_texto), '') = '' then return null; end if;
  select id, owner_id, title, versions, comments into pr from public.web_pages where share_token = p_token and archived_at is null;
  if not found or jsonb_array_length(pr.comments) >= 400 then return null; end if;
  item := jsonb_build_object('id', gen_random_uuid(), 'v', jsonb_array_length(pr.versions), 'tela', left(coalesce(p_tela, ''), 60),
    'x', greatest(0, least(100, coalesce(p_x, 0))), 'y', greatest(0, coalesce(p_y, 0)), 'modo', case when p_modo = 'desk' then 'desk' else 'phone' end,
    'texto', left(p_texto, 2000), 'nome', who, 'de', 'cliente', 'em', now(), 'resolvido', false);
  update public.web_pages set comments = comments || item where id = pr.id;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (pr.owner_id, 'briefing', 'Comentário na página', left(who || ' · ' || pr.title || ': ' || p_texto, 300),
          '/design/paginas/' || pr.id, 'web_page', pr.id, 'pagina:' || pr.id || ':' || extract(epoch from now())::bigint);
  return item;
end $$;

create or replace function public.pub_page_approve(p_token uuid, p_nome text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare pr record; who text := left(coalesce(nullif(trim(p_nome), ''), 'Cliente'), 80);
begin
  select id, owner_id, title, versions into pr from public.web_pages where share_token = p_token and archived_at is null;
  if not found or jsonb_array_length(pr.versions) = 0 then return false; end if;
  update public.web_pages set status = 'aprovado', approved = jsonb_build_object('nome', who, 'em', now(), 'v', jsonb_array_length(pr.versions)) where id = pr.id;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (pr.owner_id, 'briefing', 'Página aprovada pelo cliente', left(who || ' aprovou ' || pr.title, 300),
          '/design/paginas/' || pr.id, 'web_page', pr.id, 'pagina-ok:' || pr.id || ':' || extract(epoch from now())::bigint);
  return true;
end $$;

revoke all on function public.pub_get_page(uuid) from public;
revoke all on function public.pub_page_comment(uuid, text, numeric, numeric, text, text, text) from public;
revoke all on function public.pub_page_approve(uuid, text) from public;
grant execute on function public.pub_get_page(uuid) to anon, authenticated;
grant execute on function public.pub_page_comment(uuid, text, numeric, numeric, text, text, text) to anon, authenticated;
grant execute on function public.pub_page_approve(uuid, text) to anon, authenticated;

-- ferramenta nova nos planos que já têm o Design
update public.plans set tools = tools || array['design:paginas'] where 'design:marca' = any(tools) and not ('design:paginas' = any(tools));
update public.profiles set tools = tools || array['design:paginas'] where tools is not null and 'design:marca' = any(tools) and not ('design:paginas' = any(tools));
