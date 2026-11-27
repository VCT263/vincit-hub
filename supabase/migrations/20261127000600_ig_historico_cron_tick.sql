-- foto diária: às 06h de Brasília (09h UTC) o agendador chama o app se houver perfil conectado
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
    raise warning 'notify_tick: %', sqlerrm;
  end;
  if exists (select 1 from public.dm_contacts where waiting = 'delay' and wait_until <= now())
     or exists (select 1 from public.scheduled_posts where (status = 'agendado' and scheduled_at <= now()) or status = 'publicando')
     or (extract(minute from now()) = 0 and exists (
           select 1 from public.content_ideas c
           join private.ig_tokens t on t.account_id = c.account_id
           left join public.ig_posts p on p.account_id = c.account_id and p.ig_media_id = c.ig_media_id
           where c.ig_media_id is not null and c.account_id is not null
             and c.status_id = private.content_status_for(c.owner_id, 'publicado')
             and coalesce(p.posted_at, c.status_changed_at) <= now() - interval '7 days'))
     or (extract(hour from now() at time zone 'UTC') = 9 and extract(minute from now()) = 0 and exists (select 1 from private.ig_tokens))
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
