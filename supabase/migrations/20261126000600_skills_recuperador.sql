-- Skills do Audiovisual: Recuperador de arquivos (roda no navegador, sem custo de servidor)
-- libera nos planos que já têm o Teleprompter
update public.plans
   set tools = array(select distinct unnest(tools || array['audiovisual:recuperador']))
 where tools @> array['audiovisual:teleprompter'];
