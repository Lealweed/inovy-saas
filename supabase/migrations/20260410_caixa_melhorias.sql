-- ============================================================================
-- INOVY SAAS - MELHORIAS DO MÓDULO DE CAIXA
-- Data: 2026-04-10
-- Rode este arquivo no Supabase SQL Editor após o módulo de caixa inicial.
-- ============================================================================

-- ============================================================================
-- ENUM: tipo de movimentação de caixa (sangria/reforço)
-- ============================================================================

do $$ begin
  create type public.caixa_movimentacao_tipo as enum ('sangria', 'reforco');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- TABELA: Movimentações de caixa (sangria / reforço)
-- ============================================================================

create table if not exists public.caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.caixa_sessoes(id) on delete restrict,
  tipo public.caixa_movimentacao_tipo not null,
  valor numeric(12,2) not null check (valor > 0),
  motivo text not null,
  operador_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_caixa_movimentacoes_sessao
  on public.caixa_movimentacoes(sessao_id, created_at desc);

-- ============================================================================
-- TABELA: Log de auditoria do caixa
-- ============================================================================

create table if not exists public.caixa_audit_log (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  acao text not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_caixa_audit_log_registro
  on public.caixa_audit_log(tabela, registro_id, created_at desc);

create index if not exists idx_caixa_audit_log_usuario
  on public.caixa_audit_log(usuario_id, created_at desc);

-- ============================================================================
-- FUNÇÃO: Trigger de auditoria para vendas
-- ============================================================================

create or replace function public.caixa_vendas_audit()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.caixa_audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id)
    values (
      'caixa_vendas',
      new.id,
      case
        when old.status != new.status then 'status_' || new.status::text
        else 'update'
      end,
      to_jsonb(old),
      to_jsonb(new),
      auth.uid()
    );
  elsif tg_op = 'DELETE' then
    insert into public.caixa_audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id)
    values ('caixa_vendas', old.id, 'delete', to_jsonb(old), null, auth.uid());
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_caixa_vendas_audit on public.caixa_vendas;
create trigger trg_caixa_vendas_audit
after update or delete on public.caixa_vendas
for each row execute function public.caixa_vendas_audit();

-- ============================================================================
-- FUNÇÃO: Trigger de auditoria para sessões
-- ============================================================================

create or replace function public.caixa_sessoes_audit()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.caixa_audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id)
    values (
      'caixa_sessoes',
      new.id,
      case
        when old.status != new.status then 'status_' || new.status::text
        else 'update'
      end,
      to_jsonb(old),
      to_jsonb(new),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_caixa_sessoes_audit on public.caixa_sessoes;
create trigger trg_caixa_sessoes_audit
after update on public.caixa_sessoes
for each row execute function public.caixa_sessoes_audit();

-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_caixa_vendas_created_at
  on public.caixa_vendas(created_at desc);

create index if not exists idx_caixa_vendas_sessao_status
  on public.caixa_vendas(sessao_id, status);

-- ============================================================================
-- RLS: Movimentações e Audit Log
-- ============================================================================

alter table public.caixa_movimentacoes enable row level security;
alter table public.caixa_audit_log enable row level security;

drop policy if exists caixa_movimentacoes_auth_all on public.caixa_movimentacoes;
create policy caixa_movimentacoes_auth_all on public.caixa_movimentacoes
  for all to authenticated using (true) with check (true);

drop policy if exists caixa_audit_log_select on public.caixa_audit_log;
create policy caixa_audit_log_select on public.caixa_audit_log
  for select to authenticated using (true);

drop policy if exists caixa_audit_log_insert on public.caixa_audit_log;
create policy caixa_audit_log_insert on public.caixa_audit_log
  for insert to authenticated with check (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

grant select, insert on public.caixa_movimentacoes to authenticated;
grant select, insert on public.caixa_audit_log to authenticated;

-- ============================================================================
-- VIEW: Atualizar vw_caixa_historico_operador com sangrias
-- ============================================================================

drop view if exists public.vw_caixa_historico_operador;

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
  count(distinct v.id) as total_atendimentos,
  coalesce(sum(v.valor_total) filter (where v.status = 'pago'), 0) as total_pago,
  coalesce(sum(v.valor_total) filter (where v.status = 'estornado'), 0) as total_estornado,
  coalesce((select sum(m.valor) from public.caixa_movimentacoes m where m.sessao_id = s.id and m.tipo = 'sangria'), 0) as total_sangria,
  coalesce((select sum(m.valor) from public.caixa_movimentacoes m where m.sessao_id = s.id and m.tipo = 'reforco'), 0) as total_reforco
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

grant select on public.vw_caixa_historico_operador to authenticated;
