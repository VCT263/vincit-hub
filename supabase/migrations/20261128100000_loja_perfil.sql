-- Perfis & marca como centro (28/11): a loja do E-commerce sabe qual é o perfil do Instagram dela.
alter table public.ec_stores add column if not exists account_id uuid references public.ig_accounts(id) on delete set null;
create index if not exists ec_stores_account_idx on public.ec_stores(account_id);
-- ISYS: loja 9b6da6ef → @isysoficial_ (acdc923e)
update public.ec_stores set account_id = 'acdc923e-dc66-47a6-a840-a9d6aefb0dba' where id = '9b6da6ef-0da0-4c73-a963-33fc8c918313' and account_id is null;
