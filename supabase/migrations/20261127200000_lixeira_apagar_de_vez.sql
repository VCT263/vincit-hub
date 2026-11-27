-- Apagar de vez antes dos 15 dias (pedido do Vinícius, 27/11): descarta um lote da lixeira, sem volta.
-- A tela pede a senha de novo antes de chamar. Só o dono do lote.
create or replace function public.lixeira_apagar_de_vez(p_lote uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.lixeira_lotes where id = p_lote and owner_id = auth.uid();
  if not found then raise exception 'Item não encontrado na sua lixeira'; end if;
end $$;
revoke all on function public.lixeira_apagar_de_vez(uuid) from public, anon;
grant execute on function public.lixeira_apagar_de_vez(uuid) to authenticated;

-- tabela criada depois da lixeira geral (PR #113): liga a cópia na lixeira
select private.lixeira_ligar('ig_account_members');
