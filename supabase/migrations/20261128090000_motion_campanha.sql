-- Pasta do Motion ligada à campanha do E-commerce (28/11): os motions e os cards do Quadro
-- que nascem de uma ação (ex.: Natal) guardam o id dela; o Editor abre a pasta certa.
alter table public.av_motions add column if not exists ec_action_id uuid references public.ec_actions(id) on delete set null;
alter table public.content_ideas add column if not exists ec_action_id uuid references public.ec_actions(id) on delete set null;
create index if not exists av_motions_ec_action_idx on public.av_motions (ec_action_id);
create index if not exists content_ideas_ec_action_idx on public.content_ideas (ec_action_id);
