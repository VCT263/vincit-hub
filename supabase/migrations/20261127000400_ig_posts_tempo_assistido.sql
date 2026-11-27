-- Tempo assistido dos Reels (ig_reels_avg_watch_time e ig_reels_video_view_total_time, em milissegundos)
alter table public.ig_posts add column if not exists avg_watch_ms integer;
alter table public.ig_posts add column if not exists total_watch_ms bigint;
