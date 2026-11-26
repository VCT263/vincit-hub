-- Notificações push do HUB instalável (PWA): inscrições por aparelho e envio dos avisos pelo cron.
-- Aditiva: não muda nada do que já existe além de o cron também chamar o app quando há aviso para enviar.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_owner_idx on public.push_subscriptions (owner_id);
alter table public.push_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'push_subscriptions_own') then
    create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
end $$;

-- quando o aviso foi enviado como push (null = ainda não)
alter table public.notifications add column if not exists pushed_at timestamptz;
create index if not exists notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

-- o cron passa a chamar a aplicação também quando há aviso novo para quem ativou o push
create or replace function private.cron_tick()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  begin
    perform private.notify_tick();
  exception when others then
    raise warning 'notify_tick: %', sqlerrm;  -- aviso com erro não pode travar publicação e DMs
  end;
  -- só chama a aplicação quando há algo para fazer
  if exists (select 1 from public.dm_contacts where waiting = 'delay' and wait_until <= now())
     or exists (select 1 from public.scheduled_posts where (status = 'agendado' and scheduled_at <= now()) or status = 'publicando')
     -- conteúdo publicado há 7+ dias esperando as métricas (rotina Analisado, roda no minuto 0)
     or (extract(minute from now()) = 0 and exists (
           select 1 from public.content_ideas c
           join private.ig_tokens t on t.account_id = c.account_id
           left join public.ig_posts p on p.account_id = c.account_id and p.ig_media_id = c.ig_media_id
           where c.ig_media_id is not null and c.account_id is not null
             and c.status_id = private.content_status_for(c.owner_id, 'publicado')
             and coalesce(p.posted_at, c.status_changed_at) <= now() - interval '7 days'))
     -- aviso novo para quem tem push ativo
     or exists (select 1 from public.notifications n
                join public.push_subscriptions s on s.owner_id = n.owner_id and s.created_at <= n.created_at
                where n.pushed_at is null and n.read_at is null and n.created_at > now() - interval '1 day') then
    perform net.http_post(
      url := 'https://vincit-hub.vercel.app/api/cron/tick',
      headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select value from private.app_config where key = 'webhook_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  end if;
end $function$;
