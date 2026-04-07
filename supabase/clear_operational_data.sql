-- ============================================================================
-- INOVY SAAS - LIMPEZA DE DADOS OPERACIONAIS
-- Uso: rode este arquivo UMA vez no Supabase SQL Editor para começar do zero.
-- Preserva: usuários/auth, profiles, notification_preferences e system_settings.
-- Remove: empresas, encomendas, histórico, logística, repasses, exportações e notificações.
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.caixa_pagamentos') is not null then
    execute '
      truncate table
        public.report_exports,
        public.caixa_pagamentos,
        public.caixa_vendas,
        public.caixa_sessoes,
        public.repasses,
        public.operacoes_logisticas,
        public.encomenda_historico,
        public.encomendas,
        public.empresas,
        public.notifications
      restart identity cascade
    ';
  else
    execute '
      truncate table
        public.report_exports,
        public.repasses,
        public.operacoes_logisticas,
        public.encomenda_historico,
        public.encomendas,
        public.empresas,
        public.notifications
      restart identity cascade
    ';
  end if;
end $$;

alter sequence if exists public.empresas_codigo_seq restart with 1;
alter sequence if exists public.encomendas_codigo_seq restart with 1;
alter sequence if exists public.logistica_codigo_seq restart with 1;
alter sequence if exists public.repasses_codigo_seq restart with 1;
alter sequence if exists public.caixa_sessao_codigo_seq restart with 1;
alter sequence if exists public.caixa_venda_codigo_seq restart with 1;

commit;

-- Após a limpeza, os próximos cadastros começam em:
-- EMP-001
-- ENC-00001
-- LOG-001
-- REP-0001
