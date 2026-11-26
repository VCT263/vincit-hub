-- Seção Audiovisual (Fase 2): decupagem, ordem do dia (diárias) e checklist de set.

-- planos de cada conteúdo (decupagem do roteiro)
create table if not exists public.av_shots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_ideas(id) on delete cascade,
  position double precision not null default 0,
  description text not null,
  framing text,
  audio text,
  media_id uuid references public.av_media(id) on delete set null,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists av_shots_content on public.av_shots(content_id, position);
alter table public.av_shots enable row level security;
create policy av_shots_own on public.av_shots for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- diárias de gravação (ordem do dia)
create table if not exists public.av_shoots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  call_time time,
  wrap_time time,
  location text,
  address text,
  client_id uuid references public.ag_clients(id) on delete set null,
  content_ids uuid[] not null default '{}',
  team jsonb not null default '[]'::jsonb,        -- [{name, role, phone, call}]
  equipment_ids uuid[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,   -- [{t, done}]
  notes text,
  event_id uuid references public.ag_events(id) on delete set null,
  share_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists av_shoots_owner_date on public.av_shoots(owner_id, date);
alter table public.av_shoots enable row level security;
create policy av_shoots_own on public.av_shoots for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- checklist padrão de set do assinante
alter table public.av_settings add column if not exists checklist_template jsonb;

-- ordem do dia pública para a equipe (link com token, sem login)
create or replace function public.av_shoot_public(p_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'title', s.title, 'date', s.date, 'call_time', s.call_time, 'wrap_time', s.wrap_time,
    'location', s.location, 'address', s.address, 'notes', s.notes,
    'client', (select c.name from ag_clients c where c.id = s.client_id),
    'team', s.team, 'checklist', s.checklist,
    'equipment', coalesce((select json_agg(e.name order by e.name) from ag_equipment e where e.id = any(s.equipment_ids) and e.owner_id = s.owner_id), '[]'::json),
    'contents', coalesce((
      select json_agg(json_build_object(
        'id', ci.id, 'title', ci.title, 'format', ci.format,
        'shots', coalesce((select json_agg(json_build_object('id', sh.id, 'description', sh.description, 'framing', sh.framing, 'audio', sh.audio, 'notes', sh.notes, 'done', sh.done) order by sh.position) from av_shots sh where sh.content_id = ci.id and sh.owner_id = s.owner_id), '[]'::json)
      ) order by array_position(s.content_ids, ci.id))
      from content_ideas ci where ci.id = any(s.content_ids) and ci.owner_id = s.owner_id
    ), '[]'::json)
  )
  from av_shoots s
  where s.share_token = p_token and p_token is not null;
$$;

-- a equipe marca no set o plano gravado (só planos dos conteúdos daquela diária)
create or replace function public.av_shoot_check(p_token uuid, p_shot uuid, p_done boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  update av_shots sh set done = coalesce(p_done, false)
    from av_shoots s
   where s.share_token = p_token and p_token is not null
     and sh.id = p_shot and sh.owner_id = s.owner_id and sh.content_id = any(s.content_ids);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

grant execute on function public.av_shoot_public(uuid) to anon, authenticated;
grant execute on function public.av_shoot_check(uuid, uuid, boolean) to anon, authenticated;

-- novas ferramentas nos planos que já têm o Audiovisual
update public.plans
   set tools = array(select distinct unnest(tools || array['audiovisual:decupagem','audiovisual:ordem']))
 where tools @> array['audiovisual:teleprompter'];
