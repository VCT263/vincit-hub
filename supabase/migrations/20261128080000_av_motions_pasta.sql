-- Pastas no Motion (28/11): agrupar os motions por campanha, coleção ou ação (ex.: "Natal ISYS").
alter table public.av_motions add column if not exists pasta text;
create index if not exists av_motions_pasta_idx on public.av_motions (owner_id, pasta);
