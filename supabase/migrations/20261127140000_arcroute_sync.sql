-- Ponte Arc Route <-> HUB: código de sincronia e origem externa das tarefas
alter table public.profiles add column if not exists sync_code text;
create unique index if not exists profiles_sync_code_key on public.profiles (upper(sync_code)) where sync_code is not null;
alter table public.ag_tasks add column if not exists external_source text;
alter table public.ag_tasks add column if not exists external_id text;
create unique index if not exists ag_tasks_external_key on public.ag_tasks (owner_id, external_source, external_id) where external_id is not null;

-- o usuário grava o próprio código (RLS de profiles não deixa editar direto)
create or replace function public.set_sync_code(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := nullif(upper(btrim(p_code)), '');
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if c is not null and c !~ '^ARC-[A-Z0-9]{4}-[A-Z0-9]{4}$' then raise exception 'Código inválido. Use o formato ARC-XXXX-XXXX.'; end if;
  update public.profiles set sync_code = c, updated_at = now() where id = auth.uid();
  return c;
end $$;
grant execute on function public.set_sync_code(text) to authenticated;

-- ID da agenda do Google passa a poder ser definido pelo usuário
create or replace function public.google_tokens_update(p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  update private.google_tokens set
    access_token = case when p_patch ? 'access_token' then p_patch->>'access_token' else access_token end,
    expires_at = case when p_patch ? 'expires_at' then (p_patch->>'expires_at')::timestamptz else expires_at end,
    push = case when p_patch ? 'push' then (p_patch->>'push')::boolean else push end,
    pull = case when p_patch ? 'pull' then (p_patch->>'pull')::boolean else pull end,
    calendar_id = case when p_patch ? 'calendar_id' then coalesce(nullif(btrim(p_patch->>'calendar_id'), ''), 'primary') else calendar_id end,
    last_sync_at = case when p_patch ? 'last_sync_at' then (p_patch->>'last_sync_at')::timestamptz else last_sync_at end,
    last_error = case when p_patch ? 'last_error' then p_patch->>'last_error' else last_error end
  where owner_id = auth.uid();
end $$;
