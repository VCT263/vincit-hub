-- Banco de mídia separado por áreas: entram banco externo (stock), conteúdos internos e marcas/logos
alter table public.av_media drop constraint if exists av_media_kind_check;
alter table public.av_media add constraint av_media_kind_check
  check (kind in ('sfx','trilha','insercao','externo','interno','marca','imagem','lut','modelo','referencia','outro'));
