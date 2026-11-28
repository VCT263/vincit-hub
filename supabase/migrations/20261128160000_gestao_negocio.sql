-- Gestão do negócio no Gestor (28/11/2026): notas fiscais, comprovantes, contrato do cliente e divisão do dinheiro.

-- notas fiscais emitidas (vindas do Asaas ou digitadas); arquivos ficam no Drive
create table if not exists public.ag_invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number int,
  client_id uuid references public.ag_clients(id) on delete set null,
  client_name text,
  amount numeric(12,2) not null default 0,
  issued_at date not null,
  status text not null default 'emitida',
  description text,
  pdf_url text,
  xml_url text,
  source text default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  unique (owner_id, source, external_id)
);
alter table public.ag_invoices enable row level security;
drop policy if exists ag_invoices_owner on public.ag_invoices;
create policy ag_invoices_owner on public.ag_invoices for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create index if not exists ag_invoices_owner_idx on public.ag_invoices(owner_id, issued_at desc);

-- comprovante do lançamento (link do arquivo no Drive)
alter table public.ag_transactions add column if not exists receipt_url text;

-- contrato do cliente: {valor_mensal, dia_vencimento, inicio, fim, escopo:[{item,qtd}], observacoes}
alter table public.ag_clients add column if not exists contract jsonb;

-- divisão do dinheiro que entra (Profit First adaptado): {lucro, prolabore, impostos, operacao} em %
alter table public.ag_settings add column if not exists alocacao jsonb;

-- metas do trimestre da empresa (Gestor): por mês {AAAA-MM: {min, meta, super}}, 3 prioridades e o pró-labore fixo
create table if not exists public.ag_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  months jsonb not null default '{}'::jsonb,
  priorities text[] not null default '{}',
  first_step text,
  pro_labore numeric,
  pro_labore_day int check (pro_labore_day between 1 and 31),
  closing text,
  updated_at timestamptz not null default now(),
  unique (owner_id, year, quarter)
);
alter table public.ag_goals enable row level security;
drop policy if exists ag_goals_owner on public.ag_goals;
create policy ag_goals_owner on public.ag_goals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
