-- Plugin VINCIT HUB para o Premiere Pro.
-- O plugin manda a sequência (clipes + transcrição) para av_edit_sessions; o Claude lê pelo conector,
-- devolve um plano de edição (JSON) e o plugin aplica no Premiere. av_style_kits guarda o kit de estilo de cada perfil/cliente.

create table if not exists public.av_style_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.ig_accounts(id) on delete set null,
  client_id uuid references public.ag_clients(id) on delete set null,
  name text not null,
  data jsonb not null default '{}'::jsonb,   -- {cores, fontes, legenda, motion, regras, mogrts}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.av_style_kits enable row level security;
drop policy if exists av_style_kits_own on public.av_style_kits;
create policy av_style_kits_own on public.av_style_kits for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.av_edit_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_id uuid references public.content_ideas(id) on delete set null,
  kit_id uuid references public.av_style_kits(id) on delete set null,
  project_name text,
  sequence_name text,
  fps numeric,
  duration_sec numeric,
  timeline jsonb not null default '[]'::jsonb,    -- [{faixa, nome, inicio, fim}]
  transcript jsonb not null default '[]'::jsonb,  -- [{inicio, fim, texto}] em segundos da sequência
  request text,                                    -- o que o editor pediu (ex.: "estilo impacto, cortar respiros")
  status text not null default 'aguardando_plano' check (status in ('aguardando_plano','plano_pronto','aplicado','cancelado')),
  plan jsonb,
  plan_note text,
  plan_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists av_edit_sessions_owner_status on public.av_edit_sessions (owner_id, status, created_at desc);
alter table public.av_edit_sessions enable row level security;
drop policy if exists av_edit_sessions_own on public.av_edit_sessions;
create policy av_edit_sessions_own on public.av_edit_sessions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- libera nos planos que já têm o Teleprompter
update public.plans
   set tools = array(select distinct unnest(tools || array['audiovisual:premiere']))
 where tools @> array['audiovisual:teleprompter'];
