-- Motion graphics do Audiovisual (27/11): vinhetas, peças animadas, lower thirds e transições.
-- spec guarda o motion inteiro (src/lib/motion/engine.ts, MotionSpec). O pedido sob demanda vai pela
-- fila do Claude (ai_requests, task "motion"): status 'pedido' até o Claude responder, depois 'pronto'.
-- Excluir passa pela lixeira do HUB (15 dias para recuperar).

create table if not exists public.av_motions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.ig_accounts(id) on delete set null,
  kit_id uuid references public.av_style_kits(id) on delete set null,
  brand_id uuid references public.design_projects(id) on delete set null,
  content_id uuid references public.content_ideas(id) on delete set null,
  titulo text not null default 'Motion sem nome',
  formato text not null default '9:16' check (formato in ('9:16','16:9','1:1')),
  spec jsonb not null default '{}'::jsonb,
  status text not null default 'pronto' check (status in ('pedido','pronto')),
  pedido text,
  ai_request_id uuid references public.ai_requests(id) on delete set null,
  origem text not null default 'hub' check (origem in ('hub','pedido','editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists av_motions_owner on public.av_motions (owner_id, updated_at desc);
alter table public.av_motions enable row level security;
drop policy if exists av_motions_own on public.av_motions;
create policy av_motions_own on public.av_motions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.av_motions from anon;
grant select, insert, update, delete on public.av_motions to authenticated;

-- lixeira geral: guarda a cópia de cada motion apagado por 15 dias
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'lixeira_ligar') then
    perform private.lixeira_ligar('av_motions');
  end if;
end $$;
