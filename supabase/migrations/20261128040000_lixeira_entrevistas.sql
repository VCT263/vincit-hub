-- Revisão geral (28/11): a tabela de entrevistas de marca ficou sem a lixeira de 15 dias (regra do HUB).
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'lixeira_ligar') then
    perform private.lixeira_ligar('brand_interviews');
  end if;
end $$;
