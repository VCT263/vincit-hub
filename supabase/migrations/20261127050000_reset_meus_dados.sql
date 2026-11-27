-- Recomeçar do zero (Minha conta): apaga só os dados da própria pessoa.
-- Financeiro: lançamentos (receitas, despesas, recorrentes, previstos) e cobranças. Contas, categorias e clientes ficam.
-- Seu dia: tarefas, projetos (com eventos e listas de projeto) e histórico de status. Espaços, agenda e clientes ficam.
create or replace function public.reset_my_data(p_financeiro boolean, p_seu_dia boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r jsonb := '{}'::jsonb;
  n int;
begin
  if uid is null then raise exception 'sem login'; end if;
  if coalesce(p_financeiro, false) then
    delete from public.fin_charges where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('cobrancas', n);
    delete from public.ag_transactions where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('lancamentos', n);
  end if;
  if coalesce(p_seu_dia, false) then
    delete from public.ag_tasks where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('tarefas', n);
    delete from public.ag_projects where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('projetos', n);
    delete from public.ag_lists l where l.owner_id = uid
      and l.space_id in (select s.id from public.ag_spaces s where s.owner_id = uid and s.kind = 'projetos');
    delete from public.status_history where owner_id = uid; get diagnostics n = row_count; r := r || jsonb_build_object('historico', n);
  end if;
  return r;
end $$;

revoke all on function public.reset_my_data(boolean, boolean) from public, anon;
grant execute on function public.reset_my_data(boolean, boolean) to authenticated;
