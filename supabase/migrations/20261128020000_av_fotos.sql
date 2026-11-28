-- Editor de fotos do Audiovisual (28/11). Uma linha por foto editada (tipo 'foto') ou por estilo salvo (tipo 'estilo').
-- A edição roda no navegador; aqui fica só o resultado (Storage, bucket midia) e os ajustes para reabrir.
-- O pedido "Claude, ajusta esta foto" vai pela fila (ai_requests, endpoint /api/av/foto). Excluir passa pela lixeira (15 dias).

create table if not exists public.av_fotos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.ig_accounts(id) on delete set null,
  tipo text not null default 'foto' check (tipo in ('foto','estilo')),
  titulo text not null default 'Foto sem nome',
  original_url text,
  resultado_url text,
  spec jsonb not null default '{}'::jsonb,
  ai_request_id uuid references public.ai_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists av_fotos_owner on public.av_fotos (owner_id, tipo, updated_at desc);
alter table public.av_fotos enable row level security;
drop policy if exists av_fotos_own on public.av_fotos;
create policy av_fotos_own on public.av_fotos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.av_fotos from anon;
grant select, insert, update, delete on public.av_fotos to authenticated;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'lixeira_ligar') then
    perform private.lixeira_ligar('av_fotos');
  end if;
end $$;

alter table public.ai_requests drop constraint if exists ai_requests_endpoint_check;
alter table public.ai_requests add constraint ai_requests_endpoint_check
  check (endpoint = any (array['ai', 'diagnostico', 'ref-profile', '/api/av/motion', '/api/av/cenas', '/api/av/foto']));
