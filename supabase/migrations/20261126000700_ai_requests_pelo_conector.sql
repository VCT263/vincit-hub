-- Fila de IA respondida pelo conector do Claude (MCP), com a conta da própria pessoa.
-- A pessoa não pode mexer em status/result_text direto (grant só de delivered_at/response);
-- estas funções deixam ela responder SÓ os próprios pedidos pendentes.
create or replace function public.ai_request_answer(p_id uuid, p_text text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if coalesce(trim(p_text), '') = '' then raise exception 'Resposta vazia'; end if;
  update public.ai_requests
     set status = 'done', result_text = p_text, error = null, done_at = now(), started_at = coalesce(started_at, now())
   where id = p_id and user_id = auth.uid() and status in ('pending', 'working')
  returning id into v;
  if v is null then raise exception 'Pedido não encontrado ou já respondido'; end if;
  return v;
end $$;

create or replace function public.ai_request_fail(p_id uuid, p_error text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  update public.ai_requests
     set status = 'error', error = left(coalesce(nullif(trim(p_error), ''), 'O Claude não conseguiu responder.'), 500), done_at = now()
   where id = p_id and user_id = auth.uid() and status in ('pending', 'working')
  returning id into v;
  if v is null then raise exception 'Pedido não encontrado ou já respondido'; end if;
  return v;
end $$;

revoke all on function public.ai_request_answer(uuid, text) from public, anon;
revoke all on function public.ai_request_fail(uuid, text) from public, anon;
grant execute on function public.ai_request_answer(uuid, text) to authenticated;
grant execute on function public.ai_request_fail(uuid, text) to authenticated;
