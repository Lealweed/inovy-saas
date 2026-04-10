-- ============================================================================
-- INOVY SAAS - MÓDULO DE CAIXA / BALCÃO
-- Data: 2026-04-07
-- Rode este arquivo no Supabase SQL Editor após a estrutura inicial.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type public.caixa_status as enum ('aberto', 'fechado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.caixa_forma_pagamento as enum (
    'dinheiro',
    'debito',
    'credito',
    'pix',
    'link_pagamento'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.caixa_venda_status as enum ('pago', 'cancelado', 'estornado');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- SEQUENCES
-- ============================================================================

create sequence if not exists public.caixa_sessao_codigo_seq start with 1 increment by 1;
create sequence if not exists public.caixa_venda_codigo_seq start with 1 increment by 1;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

create or replace function public.calculate_caixa_venda_total()
returns trigger
language plpgsql
as $$
begin
  new.valor_total := round(
    greatest(
      (
        (coalesce(new.quantidade, 1) * coalesce(new.valor_unitario, 0))
        + coalesce(new.acrescimo, 0)
        - coalesce(new.desconto, 0)
      ),
      0
    )::numeric,
    2
  );

  return new;
end;
$$;

-- ============================================================================
-- TABELAS
-- ============================================================================

create table if not exists public.caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('CX-' || lpad(nextval('public.caixa_sessao_codigo_seq')::text, 4, '0')),
  operador_id uuid references auth.users(id) on delete set null,
  status public.caixa_status not null default 'aberto',
  valor_abertura numeric(12,2) not null default 0 check (valor_abertura >= 0),
  valor_fechamento_informado numeric(12,2) check (valor_fechamento_informado >= 0),
  observacoes text,
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_caixa_sessao_aberta_unica
  on public.caixa_sessoes (status)
  where status = 'aberto';

create index if not exists idx_caixa_sessoes_operador on public.caixa_sessoes(operador_id, aberto_em desc);

create table if not exists public.caixa_vendas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('CXV-' || lpad(nextval('public.caixa_venda_codigo_seq')::text, 5, '0')),
  sessao_id uuid not null references public.caixa_sessoes(id) on delete restrict,
  cliente_nome text,
  cliente_documento text,
  descricao text not null,
  categoria text not null default 'balcao',
  quantidade integer not null default 1 check (quantidade > 0),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  acrescimo numeric(12,2) not null default 0 check (acrescimo >= 0),
  valor_total numeric(12,2) not null default 0 check (valor_total >= 0),
  status public.caixa_venda_status not null default 'pago',
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_caixa_vendas_sessao on public.caixa_vendas(sessao_id, created_at desc);
create index if not exists idx_caixa_vendas_status on public.caixa_vendas(status);

create table if not exists public.caixa_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.caixa_vendas(id) on delete cascade,
  forma_pagamento public.caixa_forma_pagamento not null,
  valor numeric(12,2) not null check (valor > 0),
  troco numeric(12,2) not null default 0 check (troco >= 0),
  referencia_externa text,
  observacoes text,
  recebido_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_caixa_pagamentos_venda on public.caixa_pagamentos(venda_id);
create index if not exists idx_caixa_pagamentos_forma on public.caixa_pagamentos(forma_pagamento, recebido_em desc);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

drop trigger if exists trg_caixa_sessoes_updated_at on public.caixa_sessoes;
create trigger trg_caixa_sessoes_updated_at
before update on public.caixa_sessoes
for each row execute function public.set_updated_at();

drop trigger if exists trg_caixa_vendas_updated_at on public.caixa_vendas;
create trigger trg_caixa_vendas_updated_at
before update on public.caixa_vendas
for each row execute function public.set_updated_at();

drop trigger if exists trg_caixa_vendas_total on public.caixa_vendas;
create trigger trg_caixa_vendas_total
before insert or update of quantidade, valor_unitario, desconto, acrescimo on public.caixa_vendas
for each row execute function public.calculate_caixa_venda_total();

-- ============================================================================
-- VIEWS
-- ============================================================================

drop view if exists public.vw_caixa_historico_operador;
drop view if exists public.vw_caixa_resumo_diario;
drop view if exists public.vw_caixa_vendas_lista;

create or replace view public.vw_caixa_vendas_lista as
select
  v.id,
  v.codigo,
  v.sessao_id,
  s.codigo as sessao_codigo,
  coalesce(v.cliente_nome, 'Cliente balcão') as cliente_nome,
  v.cliente_documento,
  v.descricao,
  v.categoria,
  v.quantidade,
  v.valor_unitario,
  v.desconto,
  v.acrescimo,
  v.valor_total,
  v.status,
  v.observacoes,
  coalesce(prof.full_name, prof.email, 'Operador') as operador_nome,
  coalesce(sum(p.valor - p.troco), 0) as total_recebido,
  coalesce(string_agg(p.forma_pagamento::text, ', ' order by p.recebido_em), '—') as formas_pagamento,
  max(p.referencia_externa) as referencia_pagamento,
  v.created_by,
  v.created_at
from public.caixa_vendas v
join public.caixa_sessoes s on s.id = v.sessao_id
left join public.caixa_pagamentos p on p.venda_id = v.id
left join public.profiles prof on prof.id = v.created_by
group by
  v.id,
  v.codigo,
  v.sessao_id,
  s.codigo,
  v.cliente_nome,
  v.cliente_documento,
  v.descricao,
  v.categoria,
  v.quantidade,
  v.valor_unitario,
  v.desconto,
  v.acrescimo,
  v.valor_total,
  v.status,
  v.observacoes,
  prof.full_name,
  prof.email,
  v.created_by,
  v.created_at;

create or replace view public.vw_caixa_resumo_diario as
select
  current_date as referencia,
  count(distinct v.id) filter (where v.status = 'pago' and v.created_at::date = current_date) as total_vendas,
  coalesce(sum(v.valor_total) filter (where v.status = 'pago' and v.created_at::date = current_date), 0) as valor_total,
  coalesce(sum(p.valor - p.troco) filter (where v.status = 'pago' and p.forma_pagamento = 'dinheiro' and p.recebido_em::date = current_date), 0) as total_dinheiro,
  coalesce(sum(p.valor - p.troco) filter (where v.status = 'pago' and p.forma_pagamento = 'debito' and p.recebido_em::date = current_date), 0) as total_debito,
  coalesce(sum(p.valor - p.troco) filter (where v.status = 'pago' and p.forma_pagamento = 'credito' and p.recebido_em::date = current_date), 0) as total_credito,
  coalesce(sum(p.valor - p.troco) filter (where v.status = 'pago' and p.forma_pagamento = 'pix' and p.recebido_em::date = current_date), 0) as total_pix,
  coalesce(sum(p.valor - p.troco) filter (where v.status = 'pago' and p.forma_pagamento = 'link_pagamento' and p.recebido_em::date = current_date), 0) as total_link_pagamento
from public.caixa_vendas v
left join public.caixa_pagamentos p on p.venda_id = v.id;

create or replace view public.vw_caixa_historico_operador as
select
  s.id,
  s.codigo,
  s.operador_id,
  coalesce(prof.full_name, prof.email, 'Operador') as operador_nome,
  s.status,
  s.valor_abertura,
  s.valor_fechamento_informado,
  s.observacoes,
  s.aberto_em,
  s.fechado_em,
  count(v.id) as total_atendimentos,
  coalesce(sum(v.valor_total) filter (where v.status = 'pago'), 0) as total_pago,
  coalesce(sum(v.valor_total) filter (where v.status = 'estornado'), 0) as total_estornado
from public.caixa_sessoes s
left join public.caixa_vendas v on v.sessao_id = s.id
left join public.profiles prof on prof.id = s.operador_id
group by
  s.id,
  s.codigo,
  s.operador_id,
  prof.full_name,
  prof.email,
  s.status,
  s.valor_abertura,
  s.valor_fechamento_informado,
  s.observacoes,
  s.aberto_em,
  s.fechado_em;

-- ============================================================================
-- RLS / GRANTS
-- ============================================================================

alter table public.caixa_sessoes enable row level security;
alter table public.caixa_vendas enable row level security;
alter table public.caixa_pagamentos enable row level security;

drop policy if exists caixa_sessoes_auth_all on public.caixa_sessoes;
create policy caixa_sessoes_auth_all on public.caixa_sessoes for all to authenticated using (true) with check (true);

drop policy if exists caixa_vendas_auth_all on public.caixa_vendas;
create policy caixa_vendas_auth_all on public.caixa_vendas for all to authenticated using (true) with check (true);

drop policy if exists caixa_pagamentos_auth_all on public.caixa_pagamentos;
create policy caixa_pagamentos_auth_all on public.caixa_pagamentos for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.caixa_sessoes to authenticated;
grant select, insert, update, delete on public.caixa_vendas to authenticated;
grant select, insert, update, delete on public.caixa_pagamentos to authenticated;
grant select on public.vw_caixa_vendas_lista to authenticated;
grant select on public.vw_caixa_resumo_diario to authenticated;
grant select on public.vw_caixa_historico_operador to authenticated;
grant usage, select on sequence public.caixa_sessao_codigo_seq to authenticated;
grant usage, select on sequence public.caixa_venda_codigo_seq to authenticated;

-- ============================================================================
-- CONSULTAS ÚTEIS
-- ============================================================================
-- select * from public.vw_caixa_resumo_diario;
-- select * from public.vw_caixa_vendas_lista order by created_at desc;
-- select * from public.caixa_sessoes order by aberto_em desc;
