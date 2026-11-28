-- Card do Quadro (28/11): o roteiro já sai com o que o post precisa para ir ao ar
-- e com a direção para quem edita e anima. Anúncio tem campos e regras próprias.
alter table public.content_ideas
  add column if not exists publish_time time,          -- horário sugerido (a data continua em planned_for)
  add column if not exists hashtags text,              -- até 5, separadas por espaço; a legenda fica sem elas
  add column if not exists editor_brief text,          -- direção para o editor (ritmo, cortes, legenda, trilha)
  add column if not exists motion_brief text,          -- pedido para o Motion (o que animar e onde entra)
  add column if not exists is_ad boolean not null default false, -- peça de anúncio (regras de anúncio, não de conteúdo)
  add column if not exists ad_brief jsonb not null default '{}'::jsonb; -- objetivo, público, oferta, botão, variações de gancho
