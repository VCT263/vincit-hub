-- Os pedidos de IA do Audiovisual (Motion e Cenas do roteiro) usam os endpoints
-- '/api/av/motion' e '/api/av/cenas'. A regra antiga só aceitava 'ai', 'diagnostico' e 'ref-profile',
-- então o pedido nem entrava na fila e o motion ficava parado em "Enviando o pedido...".
alter table public.ai_requests drop constraint if exists ai_requests_endpoint_check;
alter table public.ai_requests add constraint ai_requests_endpoint_check
  check (endpoint = any (array['ai', 'diagnostico', 'ref-profile', '/api/av/motion', '/api/av/cenas']));
