-- ============================================================================
-- INOVY SAAS - MOTORISTAS + REPASSE VINCULADO
-- Data: 2026-04-18
-- Objetivo: cadastrar motoristas e registrar repasses vinculados por empresa.
-- ============================================================================

-- ============================================================================
-- ENUM / AJUSTES DO FINANCEIRO
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'financeiro_lancamento_categoria'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'financeiro_lancamento_categoria'
      and e.enumlabel = 'repasse_motorista'
  ) then
    alter type public.financeiro_lancamento_categoria add value 'repasse_motorista';
  end if;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- RLS direto via profiles
-- Evita dependência de funções auxiliares e conflitos com schemas antigos.
-- ============================================================================

-- ============================================================================
-- TABELA: MOTORISTAS
-- ============================================================================

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  office_id uuid null,
  company_id uuid not null references public.empresas(id) on delete restrict,
  name text not null,
  phone text null,
  truck_model text null,
  truck_plate text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drivers add column if not exists tenant_id uuid null;
alter table public.drivers add column if not exists office_id uuid null;
alter table public.drivers add column if not exists company_id uuid;
alter table public.drivers add column if not exists name text;
alter table public.drivers add column if not exists phone text null;
alter table public.drivers add column if not exists truck_model text null;
alter table public.drivers add column if not exists truck_plate text null;
alter table public.drivers add column if not exists active boolean not null default true;
alter table public.drivers add column if not exists created_at timestamptz not null default now();
alter table public.drivers add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_drivers_company_id on public.drivers(company_id);
create index if not exists idx_drivers_office_id on public.drivers(office_id);
create index if not exists idx_drivers_name on public.drivers(name);
create unique index if not exists idx_drivers_company_plate_unique
  on public.drivers(company_id, truck_plate)
  where truck_plate is not null;

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

alter table public.financeiro_lancamentos
  add column if not exists driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists company_id uuid references public.empresas(id) on delete set null,
  add column if not exists kind text default 'manual',
  add column if not exists payment_method text;

create index if not exists idx_financeiro_lancamentos_driver_id
  on public.financeiro_lancamentos(driver_id);

create index if not exists idx_financeiro_lancamentos_company_id
  on public.financeiro_lancamentos(company_id);

create index if not exists idx_financeiro_lancamentos_kind
  on public.financeiro_lancamentos(kind);

create index if not exists idx_financeiro_lancamentos_driver_created_at
  on public.financeiro_lancamentos(driver_id, created_at desc);

create index if not exists idx_financeiro_lancamentos_company_created_at
  on public.financeiro_lancamentos(company_id, created_at desc);

create index if not exists idx_financeiro_lancamentos_kind_created_at
  on public.financeiro_lancamentos(kind, created_at desc);

update public.financeiro_lancamentos
set kind = coalesce(kind, case when categoria::text = 'repasse_motorista' then 'repasse_motorista' else 'manual' end)
where kind is null;

-- ============================================================================
-- VIEW FINANCEIRA COM MOTORISTA/EMPRESA
-- ============================================================================

drop view if exists public.vw_financeiro_lancamentos;
create view public.vw_financeiro_lancamentos
with (security_invoker = true) as
select
  fl.id,
  fl.codigo,
  fl.tipo,
  fl.categoria,
  fl.descricao,
  fl.favorecido_nome,
  fl.valor,
  fl.percentual,
  fl.referencia_mes,
  fl.data_lancamento,
  fl.data_pagamento,
  fl.status,
  fl.observacoes,
  fl.created_at,
  fl.kind,
  fl.company_id,
  fl.driver_id,
  fl.payment_method,
  d.name as driver_name,
  e.nome as company_name
from public.financeiro_lancamentos fl
left join public.drivers d on d.id = fl.driver_id
left join public.empresas e on e.id = fl.company_id
order by fl.data_lancamento desc, fl.created_at desc;

drop view if exists public.v_cash_closing_history;
create view public.v_cash_closing_history
with (security_invoker = true) as
select
  s.id,
  coalesce(s.fechado_em::date, s.aberto_em::date) as date,
  null::uuid as office_id,
  s.operador_id as user_id,
  coalesce(p.full_name, p.email, 'Operador') as operador,
  coalesce(ss.company_name, 'Central Viagens') as company,
  coalesce(s.valor_fechamento_informado, 0) as total_informado,
  round((coalesce(s.valor_abertura, 0) + coalesce(h.total_dinheiro, 0) - coalesce(h.total_sangria, 0) + coalesce(h.total_reforco, 0))::numeric, 2) as total_lancado,
  round((coalesce(s.valor_fechamento_informado, 0) - (coalesce(s.valor_abertura, 0) + coalesce(h.total_dinheiro, 0) - coalesce(h.total_sangria, 0) + coalesce(h.total_reforco, 0)))::numeric, 2) as diferenca,
  case
    when s.status = 'aberto' then 'aberto'
    when coalesce(s.valor_fechamento_informado, 0) = (coalesce(s.valor_abertura, 0) + coalesce(h.total_dinheiro, 0) - coalesce(h.total_sangria, 0) + coalesce(h.total_reforco, 0)) then 'conferido'
    when coalesce(s.valor_fechamento_informado, 0) > (coalesce(s.valor_abertura, 0) + coalesce(h.total_dinheiro, 0) - coalesce(h.total_sangria, 0) + coalesce(h.total_reforco, 0)) then 'sobra'
    else 'falta'
  end as status,
  s.created_at,
  s.codigo,
  s.aberto_em,
  s.fechado_em,
  coalesce(s.valor_abertura, 0) as valor_abertura,
  coalesce(h.total_pago, 0) as total_pago,
  coalesce(h.total_estornado, 0) as total_estornado,
  coalesce(h.total_sangria, 0) as total_sangria,
  coalesce(h.total_reforco, 0) as total_reforco,
  coalesce(s.observacoes, '') as observacoes
from public.caixa_sessoes s
left join public.profiles p on p.id = s.operador_id
left join (
  select
    sessao_id,
    coalesce(sum(valor_total) filter (where status = 'pago'), 0) as total_pago,
    coalesce(sum(valor_total) filter (where status = 'estornado'), 0) as total_estornado,
    0::numeric as total_dinheiro,
    0::numeric as total_sangria,
    0::numeric as total_reforco
  from public.caixa_vendas
  group by sessao_id
) v on v.sessao_id = s.id
left join (
  select
    venda.sessao_id,
    coalesce(sum(pg.valor - pg.troco) filter (where pg.forma_pagamento = 'dinheiro'), 0) as total_dinheiro
  from public.caixa_pagamentos pg
  join public.caixa_vendas venda on venda.id = pg.venda_id
  group by venda.sessao_id
) pg on pg.sessao_id = s.id
left join (
  select
    sessao_id,
    coalesce(sum(valor) filter (where tipo = 'sangria'), 0) as total_sangria,
    coalesce(sum(valor) filter (where tipo = 'reforco'), 0) as total_reforco
  from public.caixa_movimentacoes
  group by sessao_id
) mov on mov.sessao_id = s.id
left join lateral (
  select
    coalesce(v.total_pago, 0) as total_pago,
    coalesce(v.total_estornado, 0) as total_estornado,
    coalesce(pg.total_dinheiro, 0) as total_dinheiro,
    coalesce(mov.total_sangria, 0) as total_sangria,
    coalesce(mov.total_reforco, 0) as total_reforco
) h on true
left join public.system_settings ss on ss.id = true;

-- ============================================================================
-- RLS / POLICIES / GRANTS
-- ============================================================================

alter table public.drivers enable row level security;
alter table public.financeiro_lancamentos enable row level security;
alter table public.caixa_sessoes enable row level security;
alter table public.caixa_movimentacoes enable row level security;

drop policy if exists drivers_admin_all on public.drivers;
create policy drivers_admin_all on public.drivers
  for all to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists drivers_operacional_select on public.drivers;
create policy drivers_operacional_select on public.drivers
  for select to authenticated
  using (
    active = true
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'financeiro')
    )
  );

drop policy if exists financeiro_lancamentos_auth_all on public.financeiro_lancamentos;
drop policy if exists financeiro_lancamentos_admin_all on public.financeiro_lancamentos;
create policy financeiro_lancamentos_admin_all on public.financeiro_lancamentos
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  );

drop policy if exists financeiro_lancamentos_operador_select_own on public.financeiro_lancamentos;
create policy financeiro_lancamentos_operador_select_own on public.financeiro_lancamentos
  for select to authenticated
  using (created_by = auth.uid());

drop policy if exists financeiro_lancamentos_operador_insert_own on public.financeiro_lancamentos;
create policy financeiro_lancamentos_operador_insert_own on public.financeiro_lancamentos
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists financeiro_lancamentos_operador_update_own on public.financeiro_lancamentos;
create policy financeiro_lancamentos_operador_update_own on public.financeiro_lancamentos
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists caixa_sessoes_auth_all on public.caixa_sessoes;
drop policy if exists caixa_sessoes_admin_all on public.caixa_sessoes;
create policy caixa_sessoes_admin_all on public.caixa_sessoes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  );

drop policy if exists caixa_sessoes_operador_select_own on public.caixa_sessoes;
create policy caixa_sessoes_operador_select_own on public.caixa_sessoes
  for select to authenticated
  using (operador_id = auth.uid());

drop policy if exists caixa_sessoes_operador_insert_own on public.caixa_sessoes;
create policy caixa_sessoes_operador_insert_own on public.caixa_sessoes
  for insert to authenticated
  with check (operador_id = auth.uid());

drop policy if exists caixa_sessoes_operador_update_own on public.caixa_sessoes;
create policy caixa_sessoes_operador_update_own on public.caixa_sessoes
  for update to authenticated
  using (operador_id = auth.uid())
  with check (operador_id = auth.uid());

drop policy if exists caixa_movimentacoes_auth_all on public.caixa_movimentacoes;
drop policy if exists caixa_movimentacoes_admin_all on public.caixa_movimentacoes;
create policy caixa_movimentacoes_admin_all on public.caixa_movimentacoes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'financeiro')
    )
  );

drop policy if exists caixa_movimentacoes_operador_select_own on public.caixa_movimentacoes;
create policy caixa_movimentacoes_operador_select_own on public.caixa_movimentacoes
  for select to authenticated
  using (operador_id = auth.uid());

drop policy if exists caixa_movimentacoes_operador_insert_own on public.caixa_movimentacoes;
create policy caixa_movimentacoes_operador_insert_own on public.caixa_movimentacoes
  for insert to authenticated
  with check (operador_id = auth.uid());

grant select, insert, update on public.drivers to authenticated;
revoke delete on public.drivers from authenticated;
grant select, insert, update on public.financeiro_lancamentos to authenticated;
grant usage, select on sequence public.financeiro_lancamentos_codigo_seq to authenticated;
grant usage, select on sequence public.financeiro_lancamentos_codigo_seq to service_role;
grant select, insert, update on public.caixa_sessoes to authenticated;
grant select, insert on public.caixa_movimentacoes to authenticated;
grant select on public.vw_financeiro_lancamentos to authenticated;
grant select on public.v_cash_closing_history to authenticated;
