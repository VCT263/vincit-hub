-- Perfil estratégico da loja (público, estilo, voz, ticket médio, conversão): alimenta a IA das campanhas.
alter table public.ec_stores add column if not exists profile jsonb not null default '{}'::jsonb;
