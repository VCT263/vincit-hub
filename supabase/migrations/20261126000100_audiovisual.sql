-- Seção Audiovisual (Fase 1): banco de mídia sincronizado com o Google Drive e takes do teleprompter.

-- preferências da seção: pasta do Drive que funciona como banco de mídia
create table if not exists public.av_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  drive_folder_id text,
  drive_folder_name text,
  last_sync_at timestamptz,
  last_error text,
  prompter jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.av_settings enable row level security;
create policy av_settings_own on public.av_settings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- índice dos arquivos da pasta do Drive (o arquivo continua no Drive; aqui ficam dados e etiquetas do HUB)
create table if not exists public.av_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drive_id text not null,
  name text not null,
  mime text,
  kind text not null default 'outro' check (kind in ('sfx','trilha','insercao','imagem','lut','modelo','referencia','outro')),
  folder text,
  size bigint,
  duration_ms integer,
  width integer,
  height integer,
  has_thumb boolean not null default false,
  web_link text,
  modified_at timestamptz,
  tags text[] not null default '{}',
  client_id uuid references public.ag_clients(id) on delete set null,
  license_source text,
  license_until date,
  notes text,
  favorite boolean not null default false,
  missing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, drive_id)
);
create index if not exists av_media_owner_kind on public.av_media(owner_id, kind) where not missing;
alter table public.av_media enable row level security;
create policy av_media_own on public.av_media for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- takes marcados no teleprompter (viram nota para quem edita)
create table if not exists public.av_takes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_ideas(id) on delete cascade,
  n integer not null,
  rating text not null default 'neutro' check (rating in ('bom','ruim','neutro')),
  seconds integer,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists av_takes_content on public.av_takes(content_id);
alter table public.av_takes enable row level security;
create policy av_takes_own on public.av_takes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- libera a seção nos planos que têm roteiros (Creator e Completo)
update public.plans
   set tools = array(select distinct unnest(tools || array['audiovisual:teleprompter','audiovisual:midia']))
 where name in ('Creator','Completo');
