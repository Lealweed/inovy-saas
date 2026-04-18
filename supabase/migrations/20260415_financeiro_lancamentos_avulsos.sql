-- ============================================================================
-- INOVY SAAS - LANÇAMENTOS AVULSOS NO FINANCEIRO
-- Data: 2026-04-15
-- Objetivo: registrar pagamentos para parceiros externos e motoristas.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type public.financeiro_lancamento_tipo as enum ('entrada', 'saida');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.financeiro_lancamento_categoria as enum (
    'repasse_parceiro_externo',
    'pagamento_motorista',
    'receita_avulsa',
    'despesa_operacional',
    'ajuste',
    'outro'
  );
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- SEQUENCE
-- ============================================================================

create sequence if not exists public.financeiro_lancamentos_codigo_seq start with 1 increment by 1;

-- ============================================================================
-- TABELA: Lançamentos manuais do financeiro
-- ============================================================================

create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('LAN-' || lpad(nextval('public.financeiro_lancamentos_codigo_seq')::text, 5, '0')),
  tipo public.financeiro_lancamento_tipo not null,
  categoria public.financeiro_lancamento_categoria not null,
  descricao text not null,
  favorecido_nome text not null,
  valor numeric(12,2) not null check (valor > 0),
  percentual numeric(5,2) check (percentual is null or (percentual >= 0 and percentual <= 100)),
  referencia_mes date not null default date_trunc('month', now())::date,
  data_lancamento date not null default current_date,
  data_pagamento date,
  status public.repasse_status not null default 'pendente',
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_financeiro_lancamentos_status
  on public.financeiro_lancamentos(status);

create index if not exists idx_financeiro_lancamentos_referencia
  on public.financeiro_lancamentos(referencia_mes desc);

create index if not exists idx_financeiro_lancamentos_categoria
  on public.financeiro_lancamentos(categoria);

-- ============================================================================
-- TRIGGER DE UPDATED_AT
-- ============================================================================

drop trigger if exists trg_financeiro_lancamentos_updated_at on public.financeiro_lancamentos;
create trigger trg_financeiro_lancamentos_updated_at
before update on public.financeiro_lancamentos
for each row execute function public.set_updated_at();

-- ============================================================================
-- VIEW DE CONSULTA
-- ============================================================================

create or replace view public.vw_financeiro_lancamentos as
select
  id,
  codigo,
  tipo,
  categoria,
  descricao,
  favorecido_nome,
  valor,
  percentual,
  referencia_mes,
  data_lancamento,
  data_pagamento,
  status,
  observacoes,
  created_at
from public.financeiro_lancamentos
order by data_lancamento desc, created_at desc;

-- ============================================================================
-- RLS / POLICIES / GRANTS
-- ============================================================================

alter table public.financeiro_lancamentos enable row level security;

drop policy if exists financeiro_lancamentos_auth_all on public.financeiro_lancamentos;
create policy financeiro_lancamentos_auth_all on public.financeiro_lancamentos
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.financeiro_lancamentos to authenticated;
grant select on public.vw_financeiro_lancamentos to authenticated;