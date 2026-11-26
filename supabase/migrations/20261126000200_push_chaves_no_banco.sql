-- Chaves VAPID do push guardadas no banco (private.app_config), geradas pelo próprio HUB no primeiro uso.
-- Assim ninguém precisa cadastrar chave na Vercel. Só a service role (servidor) lê ou grava.
create or replace function public.push_vapid_get()
 returns jsonb language sql security definer set search_path to ''
as $$
  select jsonb_build_object(
    'pub', (select value from private.app_config where key = 'vapid_public'),
    'priv', (select value from private.app_config where key = 'vapid_private'));
$$;

create or replace function public.push_vapid_set(p_pub text, p_priv text)
 returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  -- grava só se ainda não existir (duas chamadas ao mesmo tempo ficam com o primeiro par)
  if not exists (select 1 from private.app_config where key = 'vapid_public') then
    insert into private.app_config (key, value) values ('vapid_public', p_pub), ('vapid_private', p_priv)
    on conflict (key) do nothing;
  end if;
  return public.push_vapid_get();
end $$;

revoke all on function public.push_vapid_get() from public, anon, authenticated;
revoke all on function public.push_vapid_set(text, text) from public, anon, authenticated;
grant execute on function public.push_vapid_get() to service_role;
grant execute on function public.push_vapid_set(text, text) to service_role;
