-- Lixeira de marcas: marca excluída fica com archived_at preenchido e pode ser recuperada por 15 dias.
-- Depois disso o cron diário apaga de vez.
create or replace function private.design_purge_lixeira() returns void language sql security definer set search_path = public as $$
  delete from public.design_projects where kind = 'marca' and archived_at is not null and archived_at < now() - interval '15 days';
$$;
select cron.unschedule('design-lixeira') where exists (select 1 from cron.job where jobname = 'design-lixeira');
select cron.schedule('design-lixeira', '17 6 * * *', 'select private.design_purge_lixeira()');
