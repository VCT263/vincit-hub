-- Engenharia reversa da edição de um reel de referência (28/11, aprovado pelo Vinícius).
-- Creator > Referências: o Claude (fila, no Mac) baixa o vídeo, quebra plano a plano (rea-video) e devolve
-- a análise + uma proposta de Kit de estilo. A análise fica na referência; o Kit só nasce quando a pessoa aprova.
alter table public.references_lib add column if not exists edicao jsonb;
alter table public.references_lib add column if not exists edicao_request uuid;
alter table public.references_lib add column if not exists kit_id uuid references public.av_style_kits(id) on delete set null;

alter table public.ai_requests drop constraint if exists ai_requests_endpoint_check;
alter table public.ai_requests add constraint ai_requests_endpoint_check
  check (endpoint = any (array['ai', 'diagnostico', 'ref-profile', '/api/av/motion', '/api/av/cenas', '/api/av/foto', '/api/av/drive/organizar', '/api/creator/referencia-edicao']));
