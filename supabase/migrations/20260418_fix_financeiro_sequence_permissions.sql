-- ============================================================================
-- INOVY SAAS - FIX DE PERMISSÃO DA SEQUENCE DO FINANCEIRO
-- Data: 2026-04-18
-- Objetivo: liberar o nextval da coluna codigo para usuários autenticados.
-- ============================================================================

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to service_role;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname = 'financeiro_lancamentos_codigo_seq'
  ) then
    execute 'grant usage, select on sequence public.financeiro_lancamentos_codigo_seq to authenticated';
    execute 'grant usage, select on sequence public.financeiro_lancamentos_codigo_seq to service_role';
  end if;
end $$; 
