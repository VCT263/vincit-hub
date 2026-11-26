-- Central de avisos: adiar aviso e arquivar sozinho o que perdeu o sentido.

alter table public.notifications add column if not exists snoozed_until timestamptz;
create index if not exists notifications_owner_unread_idx on public.notifications (owner_id, created_at desc) where read_at is null;

-- arquiva (marca como lido) avisos que ficaram velhos: "Para hoje" de outro dia, rotina da semana passada,
-- "Em 1 h" de compromisso que já passou e lembrete de mais de 2 dias. Os lidos somem em 30 dias (notify_tick).
create or replace function private.notify_archive()
returns void language plpgsql security definer set search_path to '' as $$
declare today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.notifications set read_at = now()
   where read_at is null and (
        (kind = 'tarefa_hoje' and (created_at at time zone 'America/Sao_Paulo')::date < today)
     or (kind = 'rotina' and created_at < now() - interval '3 days')
     or (kind = 'evento_em_breve' and created_at < now() - interval '2 hours')
     or (kind = 'lembrete' and created_at < now() - interval '2 days'));
end $$;
revoke all on function private.notify_archive() from public, anon, authenticated;

create or replace function private.cron_tick()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  begin
    perform private.notify_tick();
    perform private.notify_archive();
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

-- arquiva já o que está velho
select private.notify_archive();
