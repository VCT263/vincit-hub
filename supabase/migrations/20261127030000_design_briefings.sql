-- Design · Briefings: link público que o cliente responde sem login.
-- A resposta chega na Criação de marca como solicitação e vira projeto de marca.
-- O projeto ganha um link público de apresentação (share_token) com aprovação do cliente.
create table if not exists public.design_briefings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  title text not null default 'Novo briefing',
  client_name text,
  client_id uuid,
  intro text,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'projeto', 'arquivado')),
  answers jsonb not null default '{}'::jsonb,
  respondent text,
  answered_at timestamptz,
  notes text,
  brand_id uuid references public.design_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_briefings_owner_idx on public.design_briefings (owner_id, status, updated_at desc);

alter table public.design_briefings enable row level security;
create policy "briefings_own_select" on public.design_briefings for select using (owner_id = auth.uid());
create policy "briefings_own_insert" on public.design_briefings for insert with check (owner_id = auth.uid());
create policy "briefings_own_update" on public.design_briefings for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "briefings_own_delete" on public.design_briefings for delete using (owner_id = auth.uid());

create or replace trigger design_briefings_touch before update on public.design_briefings
  for each row execute function public.design_touch();

alter table public.design_projects add column if not exists share_token uuid unique;
alter table public.design_projects add column if not exists briefing_id uuid references public.design_briefings(id) on delete set null;

-- ── link público do briefing ──
create or replace function public.pub_get_briefing(p_token uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'title', b.title, 'client_name', b.client_name, 'intro', b.intro, 'status', b.status,
    'answered_at', b.answered_at, 'company', s.company_name,
    'answers', case when b.answered_at is not null then b.answers else null end)
  from public.design_briefings b
  left join public.ag_settings s on s.owner_id = b.owner_id
  where b.token = p_token and b.status <> 'arquivado';
$$;

create or replace function public.pub_submit_briefing(p_token uuid, p_answers jsonb, p_name text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare br record;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 8000000 then return false; end if;
  select id, owner_id, title, status into br from public.design_briefings where token = p_token;
  if not found or br.status not in ('aberto', 'respondido') then return false; end if;
  update public.design_briefings
     set answers = p_answers, status = 'respondido', answered_at = now(),
         respondent = left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120)
   where id = br.id;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (br.owner_id, 'briefing', 'Briefing respondido',
          left(coalesce(nullif(trim(p_name), ''), 'O cliente') || ' respondeu o briefing ' || br.title, 300),
          '/design/briefings/' || br.id, 'design_briefing', br.id, 'briefing:' || br.id || ':' || extract(epoch from now())::bigint);
  return true;
end $$;

-- ── link público da apresentação da marca ──
create or replace function public.pub_get_brand(p_token uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('title', p.title, 'data', p.data - '_antes' - 'cliente', 'updated_at', p.updated_at,
    'mockups', coalesce((select jsonb_agg(to_jsonb(m) - 'created_by' - 'file' order by m.sort, m.created_at)
                          from public.design_mockups m where m.active), '[]'::jsonb))
  from public.design_projects p
  where p.share_token = p_token and p.kind = 'marca' and p.archived_at is null;
$$;

create or replace function public.pub_brand_feedback(p_token uuid, p_decision text, p_comment text, p_name text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare pr record; who text := left(coalesce(nullif(trim(p_name), ''), 'Cliente'), 120); item jsonb;
begin
  if p_decision not in ('aprovado', 'ajuste') then return false; end if;
  if p_decision = 'ajuste' and coalesce(trim(p_comment), '') = '' then return false; end if;
  select id, owner_id, title, data into pr from public.design_projects where share_token = p_token and kind = 'marca' and archived_at is null;
  if not found then return false; end if;
  item := jsonb_build_object('decisao', p_decision, 'texto', left(coalesce(p_comment, ''), 4000), 'nome', who, 'em', now());
  update public.design_projects set data = jsonb_set(
      jsonb_set(data, '{entrega}', coalesce(data->'entrega', '{}'::jsonb), true),
      '{entrega,retornos}', coalesce(data->'entrega'->'retornos', '[]'::jsonb) || item, true)
   where id = pr.id;
  if p_decision = 'aprovado' then
    update public.design_projects set data = jsonb_set(data, '{entrega,aprovado}', to_jsonb(now()), true) where id = pr.id;
  end if;
  insert into public.notifications(owner_id, kind, title, body, href, source_type, source_id, dedup_key)
  values (pr.owner_id, 'briefing', case when p_decision = 'aprovado' then 'Marca aprovada pelo cliente' else 'Cliente pediu ajuste na marca' end,
          left(who || ' · ' || pr.title || case when coalesce(trim(p_comment), '') <> '' then ': ' || p_comment else '' end, 300),
          '/design/marcas/' || pr.id || '?etapa=manual', 'design_project', pr.id, 'marca:' || pr.id || ':' || extract(epoch from now())::bigint);
  return true;
end $$;

revoke all on function public.pub_get_briefing(uuid) from public;
revoke all on function public.pub_submit_briefing(uuid, jsonb, text) from public;
revoke all on function public.pub_get_brand(uuid) from public;
revoke all on function public.pub_brand_feedback(uuid, text, text, text) from public;
grant execute on function public.pub_get_briefing(uuid) to anon, authenticated;
grant execute on function public.pub_submit_briefing(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.pub_get_brand(uuid) to anon, authenticated;
grant execute on function public.pub_brand_feedback(uuid, text, text, text) to anon, authenticated;
