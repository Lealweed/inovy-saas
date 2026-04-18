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

update public.financeiro_lancamentos
set kind = coalesce(kind, case when categoria::text = 'repasse_motorista' then 'repasse_motorista' else 'manual' end)
where kind is null;

-- ============================================================================
-- VIEW FINANCEIRA COM MOTORISTA/EMPRESA
-- ============================================================================

drop view if exists public.vw_financeiro_lancamentos;
create view public.vw_financeiro_lancamentos as
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

-- ============================================================================
-- RLS / POLICIES / GRANTS
-- ============================================================================

alter table public.drivers enable row level security;

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

grant select, insert, update on public.drivers to authenticated;
revoke delete on public.drivers from authenticated;
grant select on public.vw_financeiro_lancamentos to authenticated;
