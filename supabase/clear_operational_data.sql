-- ============================================================================
-- INOVY SAAS - LIMPEZA DE DADOS OPERACIONAIS
-- Uso: rode este arquivo UMA vez no Supabase SQL Editor para começar do zero.
-- Preserva: usuários/auth, profiles, notification_preferences e system_settings.
-- Remove: empresas, encomendas, histórico, logística, repasses, exportações e notificações.
-- ============================================================================

begin;

truncate table
  public.report_exports,
  public.repasses,
  public.operacoes_logisticas,
  public.encomenda_historico,
  public.encomendas,
  public.empresas,
  public.notifications
restart identity cascade;

alter sequence if exists public.empresas_codigo_seq restart with 1;
alter sequence if exists public.encomendas_codigo_seq restart with 1;
alter sequence if exists public.logistica_codigo_seq restart with 1;
alter sequence if exists public.repasses_codigo_seq restart with 1;

commit;

-- Após a limpeza, os próximos cadastros começam em:
-- EMP-001
-- ENC-00001
-- LOG-001
-- REP-0001
