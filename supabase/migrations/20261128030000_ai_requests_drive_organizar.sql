-- Organizar a Entrada do Drive pelo Claude (fila): endpoint novo na regra de ai_requests.
alter table public.ai_requests drop constraint if exists ai_requests_endpoint_check;
alter table public.ai_requests add constraint ai_requests_endpoint_check
  check (endpoint = any (array['ai', 'diagnostico', 'ref-profile', '/api/av/motion', '/api/av/cenas', '/api/av/foto', '/api/av/drive/organizar']));
