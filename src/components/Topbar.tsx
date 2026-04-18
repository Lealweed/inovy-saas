"use client";
import { usePathname } from "next/navigation";

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral da operação" },
  "/encomendas": { title: "Encomendas", subtitle: "Gerenciamento de pacotes" },
  "/logistica": { title: "Retirada & Entrega", subtitle: "Controle logístico" },
  "/caixa": { title: "Central Viagens", subtitle: "Caixa, repasses e fechamentos" },
  "/motoristas": { title: "Central Viagens", subtitle: "Motoristas e vínculo por empresa" },
  "/empresas": { title: "Empresas Parceiras", subtitle: "Gestão de parceiros" },
  "/financeiro": { title: "Financeiro", subtitle: "Repasses e comissões" },
  "/relatorios": { title: "Relatórios", subtitle: "Análises e exportações" },
  "/configuracoes": { title: "Configurações", subtitle: "Preferências do sistema" },
};

export default function Topbar() {
  const pathname = usePathname();

  const routeKey = Object.keys(routeTitles).find(
    (k) => pathname === k || (k !== "/dashboard" && pathname.startsWith(k))
  );
  const info = routeKey ? routeTitles[routeKey] : { title: "Inovy", subtitle: "Plataforma de gestão" };

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>{info.title}</h1>
        <p>{info.subtitle}</p>
      </div>

      <div className="topbar-actions">
        <span style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          padding: "6px 12px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
        }}>
          📅 {dateStr}
        </span>

        <button className="topbar-btn" title="Notificações" id="btn-notifications">
          <span>🔔</span>
        </button>

        <button className="topbar-btn" title="Busca global" id="btn-search">
          <span>🔍</span>
        </button>
      </div>
    </header>
  );
}
