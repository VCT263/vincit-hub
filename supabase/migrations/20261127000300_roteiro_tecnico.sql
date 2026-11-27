-- Roteiro técnico (folha A4 do Quadro de produção).
-- Cada linha da decupagem passa a guardar a fala e a instrução técnica ao lado:
-- parte do roteiro (Gancho, Desenvolvimento, CTA…), fala, movimento de câmera e B-roll.
-- O conteúdo ganha a direção geral do set (objetivo, locação, luz, figurino, trilha).
alter table public.av_shots add column if not exists part text;
alter table public.av_shots add column if not exists line text;
alter table public.av_shots add column if not exists movement text;
alter table public.av_shots add column if not exists broll text;
alter table public.content_ideas add column if not exists tech_brief jsonb not null default '{}'::jsonb;
