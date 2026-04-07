-- ============================================================================
-- INOVY SAAS - ESTRUTURA INICIAL DO BANCO (SUPABASE / POSTGRES)
-- Data: 2026-04-07
-- Rode este arquivo no Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('admin', 'operacional', 'financeiro', 'logistica');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.empresa_status as enum ('ativo', 'inativo', 'bloqueado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.encomenda_status as enum (
    'pendente',
    'coletado',
    'em_transito',
    'aguardando_retirada',
    'entregue',
    'cancelado'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.operacao_tipo as enum ('retirada', 'entrega');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.operacao_status as enum ('pendente', 'em_andamento', 'concluido', 'cancelado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.repasse_status as enum ('pendente', 'pago', 'atrasado', 'cancelado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum ('info', 'success', 'warning', 'error');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.calculate_repasse_values()
returns trigger
language plpgsql
as $$
begin
  if new.valor_comissao is null then
    new.valor_comissao := round((new.valor_bruto * (new.comissao_pct / 100.0))::numeric, 2);
  end if;

  new.valor_liquido := round((new.valor_bruto - new.valor_comissao)::numeric, 2);
  return new;
end;
$$;

-- ============================================================================
-- SEQUENCES DE CÓDIGO AMIGÁVEL
-- ============================================================================

create sequence if not exists public.empresas_codigo_seq start with 1 increment by 1;
create sequence if not exists public.encomendas_codigo_seq start with 1 increment by 1;
create sequence if not exists public.logistica_codigo_seq start with 1 increment by 1;
create sequence if not exists public.repasses_codigo_seq start with 1 increment by 1;

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email citext unique,
  phone text,
  role public.user_role not null default 'operacional',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade com tabelas `profiles` já existentes no projeto.
alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email citext;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role public.user_role not null default 'operacional';
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_id'
  ) then
    execute 'update public.profiles set id = coalesce(id, user_id) where user_id is not null';
  end if;
end $$;

create unique index if not exists idx_profiles_id_unique on public.profiles(id);

create table if not exists public.system_settings (
  id boolean primary key default true check (id = true),
  company_name text not null default 'Inovy Logística Ltda.',
  cnpj text,
  phone text,
  email citext,
  default_commission_pct numeric(5,2) not null default 15.00 check (default_commission_pct >= 0 and default_commission_pct <= 100),
  repasse_prazo_dias integer not null default 30 check (repasse_prazo_dias > 0),
  fechamento_dia text not null default 'Último dia do mês',
  notify_new_shipments boolean not null default true,
  notify_pickup_delay boolean not null default true,
  notify_overdue_repasses boolean not null default true,
  notify_new_partners boolean not null default false,
  notify_daily_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_new_shipments boolean not null default true,
  notify_pickup_delay boolean not null default true,
  notify_overdue_repasses boolean not null default true,
  notify_new_partners boolean not null default false,
  notify_daily_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('EMP-' || lpad(nextval('public.empresas_codigo_seq')::text, 3, '0')),
  nome text not null,
  cnpj text not null unique,
  contato_nome text not null,
  email citext not null,
  telefone text,
  cidade_base text,
  comissao_pct numeric(5,2) not null default 15.00 check (comissao_pct >= 0 and comissao_pct <= 100),
  status public.empresa_status not null default 'ativo',
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.encomendas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('ENC-' || lpad(nextval('public.encomendas_codigo_seq')::text, 5, '0')),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  remetente_nome text not null,
  remetente_endereco text,
  remetente_cidade text,
  destinatario_nome text not null,
  destinatario_endereco text,
  destinatario_cidade text not null,
  destinatario_telefone text,
  status public.encomenda_status not null default 'pendente',
  peso_kg numeric(10,3) not null default 0 check (peso_kg >= 0),
  valor_frete numeric(12,2) not null default 0 check (valor_frete >= 0),
  data_postagem date not null default current_date,
  previsao_entrega date,
  entregue_em timestamptz,
  fragil boolean not null default false,
  urgente boolean not null default false,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.encomenda_historico (
  id uuid primary key default gen_random_uuid(),
  encomenda_id uuid not null references public.encomendas(id) on delete cascade,
  status public.encomenda_status not null,
  descricao text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.operacoes_logisticas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('LOG-' || lpad(nextval('public.logistica_codigo_seq')::text, 3, '0')),
  encomenda_id uuid not null references public.encomendas(id) on delete cascade,
  tipo public.operacao_tipo not null,
  responsavel_nome text not null,
  veiculo text,
  destino text,
  horario_previsto timestamptz not null,
  status public.operacao_status not null default 'pendente',
  observacoes text,
  concluido_em timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repasses (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('REP-' || lpad(nextval('public.repasses_codigo_seq')::text, 4, '0')),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  referencia_mes date not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  total_encomendas integer not null default 0 check (total_encomendas >= 0),
  valor_bruto numeric(12,2) not null default 0 check (valor_bruto >= 0),
  comissao_pct numeric(5,2) not null default 15.00 check (comissao_pct >= 0 and comissao_pct <= 100),
  valor_comissao numeric(12,2),
  valor_liquido numeric(12,2),
  status public.repasse_status not null default 'pendente',
  data_pagamento date,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  formato text not null check (formato in ('pdf', 'excel', 'csv')),
  filtros jsonb not null default '{}'::jsonb,
  arquivo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_empresas_status on public.empresas(status);
create index if not exists idx_empresas_nome on public.empresas(nome);
create index if not exists idx_encomendas_empresa on public.encomendas(empresa_id);
create index if not exists idx_encomendas_status on public.encomendas(status);
create index if not exists idx_encomendas_data_postagem on public.encomendas(data_postagem desc);
create index if not exists idx_logistica_encomenda on public.operacoes_logisticas(encomenda_id);
create index if not exists idx_logistica_status on public.operacoes_logisticas(status);
create index if not exists idx_logistica_horario on public.operacoes_logisticas(horario_previsto);
create index if not exists idx_repasses_empresa on public.repasses(empresa_id);
create index if not exists idx_repasses_status on public.repasses(status);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at, created_at desc);

-- ============================================================================
-- TRIGGERS DE ATUALIZAÇÃO
-- ============================================================================

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_empresas_updated_at on public.empresas;
create trigger trg_empresas_updated_at
before update on public.empresas
for each row execute function public.set_updated_at();

drop trigger if exists trg_encomendas_updated_at on public.encomendas;
create trigger trg_encomendas_updated_at
before update on public.encomendas
for each row execute function public.set_updated_at();

drop trigger if exists trg_logistica_updated_at on public.operacoes_logisticas;
create trigger trg_logistica_updated_at
before update on public.operacoes_logisticas
for each row execute function public.set_updated_at();

drop trigger if exists trg_repasses_updated_at on public.repasses;
create trigger trg_repasses_updated_at
before update on public.repasses
for each row execute function public.set_updated_at();

drop trigger if exists trg_repasses_calculate on public.repasses;
create trigger trg_repasses_calculate
before insert or update of valor_bruto, comissao_pct, valor_comissao on public.repasses
for each row execute function public.calculate_repasse_values();

-- ============================================================================
-- AUTOMAÇÕES DE DOMÍNIO
-- ============================================================================

create or replace function public.log_encomenda_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.encomenda_historico (encomenda_id, status, descricao, created_by)
    values (new.id, new.status, 'Encomenda criada no sistema', new.created_by);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.encomenda_historico (encomenda_id, status, descricao, created_by)
    values (
      new.id,
      new.status,
      'Status alterado de ' || old.status::text || ' para ' || new.status::text,
      coalesce(new.created_by, old.created_by)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_encomenda_status_log on public.encomendas;
create trigger trg_encomenda_status_log
after insert or update on public.encomendas
for each row execute function public.log_encomenda_status_change();

create or replace function public.sync_encomenda_from_logistica()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'em_andamento' and new.tipo = 'entrega' then
    update public.encomendas
       set status = 'em_transito',
           updated_at = now()
     where id = new.encomenda_id
       and status in ('pendente', 'coletado', 'aguardando_retirada');
  elsif new.status = 'concluido' and new.tipo = 'retirada' then
    update public.encomendas
       set status = 'coletado',
           updated_at = now()
     where id = new.encomenda_id;
  elsif new.status = 'concluido' and new.tipo = 'entrega' then
    update public.encomendas
       set status = 'entregue',
           entregue_em = coalesce(new.concluido_em, now()),
           updated_at = now()
     where id = new.encomenda_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_encomenda_from_logistica on public.operacoes_logisticas;
create trigger trg_sync_encomenda_from_logistica
after insert or update on public.operacoes_logisticas
for each row execute function public.sync_encomenda_from_logistica();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'operacional';
  v_name text;
begin
  if not exists (select 1 from public.profiles limit 1) then
    v_role := 'admin';
  end if;

  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_id'
  ) then
    execute $sql$
      insert into public.profiles (id, user_id, full_name, email, role)
      values ($1, $1, $2, $3, $4)
      on conflict (id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          role = excluded.role
    $sql$
    using new.id, v_name, new.email, v_role;
  else
    insert into public.profiles (id, full_name, email, role)
    values (new.id, v_name, new.email, v_role)
    on conflict (id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          role = excluded.role;
  end if;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- VIEWS PARA DASHBOARD / RELATÓRIOS
-- ============================================================================

create or replace view public.vw_encomendas_lista as
select
  e.id,
  e.codigo,
  e.status,
  e.remetente_nome,
  e.remetente_endereco,
  e.remetente_cidade,
  e.destinatario_nome,
  e.destinatario_endereco,
  e.destinatario_cidade,
  e.destinatario_telefone,
  e.peso_kg,
  e.valor_frete,
  e.data_postagem,
  e.previsao_entrega,
  e.fragil,
  e.urgente,
  e.observacoes,
  emp.id as empresa_id,
  emp.nome as empresa_nome,
  emp.codigo as empresa_codigo
from public.encomendas e
join public.empresas emp on emp.id = e.empresa_id;

create or replace view public.vw_dashboard_resumo as
select
  (select count(*) from public.encomendas) as total_encomendas,
  (select count(*) from public.encomendas where status = 'em_transito') as encomendas_em_transito,
  (select count(*) from public.encomendas where status = 'aguardando_retirada') as aguardando_retirada,
  (select count(*) from public.encomendas where status = 'entregue') as entregues,
  (select count(*) from public.empresas where status = 'ativo') as empresas_ativas,
  (select coalesce(sum(valor_frete), 0) from public.encomendas) as receita_total_fretes,
  (select coalesce(sum(valor_liquido), 0) from public.repasses where status in ('pendente', 'atrasado')) as repasses_pendentes;

create or replace view public.vw_ranking_empresas as
select
  emp.id,
  emp.codigo,
  emp.nome,
  emp.status,
  count(enc.id) as total_encomendas,
  coalesce(sum(enc.valor_frete), 0) as receita_total,
  coalesce(avg(emp.comissao_pct), 0) as comissao_media,
  coalesce(sum(rep.valor_liquido) filter (where rep.status in ('pendente', 'pago', 'atrasado')), 0) as total_repasses
from public.empresas emp
left join public.encomendas enc on enc.empresa_id = emp.id
left join public.repasses rep on rep.empresa_id = emp.id
group by emp.id, emp.codigo, emp.nome, emp.status;

create or replace view public.vw_financeiro_resumo as
select
  rep.id,
  rep.codigo,
  emp.nome as empresa,
  rep.referencia_mes,
  rep.total_encomendas,
  rep.valor_bruto,
  rep.comissao_pct,
  rep.valor_comissao,
  rep.valor_liquido,
  rep.status,
  rep.data_pagamento
from public.repasses rep
join public.empresas emp on emp.id = rep.empresa_id;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- Inicialmente liberado para qualquer usuário autenticado.
-- Depois podemos endurecer por papel/cargo.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.empresas enable row level security;
alter table public.encomendas enable row level security;
alter table public.encomenda_historico enable row level security;
alter table public.operacoes_logisticas enable row level security;
alter table public.repasses enable row level security;
alter table public.report_exports enable row level security;

drop policy if exists profiles_auth_all on public.profiles;
create policy profiles_auth_all on public.profiles for all to authenticated using (true) with check (true);

drop policy if exists settings_auth_all on public.system_settings;
create policy settings_auth_all on public.system_settings for all to authenticated using (true) with check (true);

drop policy if exists notif_pref_auth_all on public.notification_preferences;
create policy notif_pref_auth_all on public.notification_preferences for all to authenticated using (true) with check (true);

drop policy if exists notifications_auth_all on public.notifications;
create policy notifications_auth_all on public.notifications for all to authenticated using (true) with check (true);

drop policy if exists empresas_auth_all on public.empresas;
create policy empresas_auth_all on public.empresas for all to authenticated using (true) with check (true);

drop policy if exists encomendas_auth_all on public.encomendas;
create policy encomendas_auth_all on public.encomendas for all to authenticated using (true) with check (true);

drop policy if exists encomenda_historico_auth_all on public.encomenda_historico;
create policy encomenda_historico_auth_all on public.encomenda_historico for all to authenticated using (true) with check (true);

drop policy if exists logistica_auth_all on public.operacoes_logisticas;
create policy logistica_auth_all on public.operacoes_logisticas for all to authenticated using (true) with check (true);

drop policy if exists repasses_auth_all on public.repasses;
create policy repasses_auth_all on public.repasses for all to authenticated using (true) with check (true);

drop policy if exists report_exports_auth_all on public.report_exports;
create policy report_exports_auth_all on public.report_exports for all to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================================
-- CONFIGURAÇÃO PADRÃO DO SISTEMA
-- ============================================================================

insert into public.system_settings (
  id,
  company_name,
  cnpj,
  phone,
  email,
  default_commission_pct,
  repasse_prazo_dias,
  fechamento_dia,
  notify_new_shipments,
  notify_pickup_delay,
  notify_overdue_repasses,
  notify_new_partners,
  notify_daily_report
)
values (
  true,
  'Inovy Logística Ltda.',
  '12.345.678/0001-99',
  '(11) 3000-0000',
  'contato@inovy.com.br',
  15.00,
  30,
  'Último dia do mês',
  true,
  true,
  true,
  false,
  true
)
on conflict (id) do update
set
  company_name = excluded.company_name,
  cnpj = excluded.cnpj,
  phone = excluded.phone,
  email = excluded.email,
  default_commission_pct = excluded.default_commission_pct,
  repasse_prazo_dias = excluded.repasse_prazo_dias,
  fechamento_dia = excluded.fechamento_dia,
  notify_new_shipments = excluded.notify_new_shipments,
  notify_pickup_delay = excluded.notify_pickup_delay,
  notify_overdue_repasses = excluded.notify_overdue_repasses,
  notify_new_partners = excluded.notify_new_partners,
  notify_daily_report = excluded.notify_daily_report,
  updated_at = now();

-- ============================================================================
-- BASE OPERACIONAL INICIAL
-- ============================================================================
-- O projeto passa a iniciar sem dados fictícios.
-- Cadastre empresas, encomendas, operações e repasses com dados reais pelo painel
-- ou por importação após a criação da base.

-- ============================================================================
-- CONSULTAS ÚTEIS
-- ============================================================================
-- select * from public.vw_dashboard_resumo;
-- select * from public.vw_encomendas_lista order by data_postagem desc;
-- select * from public.vw_ranking_empresas order by receita_total desc;
-- select * from public.vw_financeiro_resumo order by referencia_mes desc, empresa asc;
-- update public.profiles set role = 'admin' where email = 'seuemail@dominio.com';
