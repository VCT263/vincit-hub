-- Banco de mídia em dois lados (Técnico × Meus conteúdos): entram transições, fotos, vídeos gravados e inserções gravadas
alter table public.av_media drop constraint if exists av_media_kind_check;
alter table public.av_media add constraint av_media_kind_check
  check (kind in ('sfx','trilha','insercao','externo','transicao','imagem','marca','lut','modelo','referencia','video','take','foto','interno','outro'));
