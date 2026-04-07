import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dashboard | Inovy",
};

const statusMap: Record<string, { label: string; class: string }> = {
  em_transito: { label: "Em Trânsito", class: "badge-info" },
  aguardando_retirada: { label: "Aguardando Retirada", class: "badge-warning" },
  entregue: { label: "Entregue", class: "badge-success" },
  coletado: { label: "Coletado", class: "badge-default" },
  pendente: { label: "Pendente", class: "badge-warning" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [summaryResult, recentResult, rankingResult] = await Promise.all([
    supabase.from("vw_dashboard_resumo").select("*").limit(1).maybeSingle(),
    supabase.from("vw_encomendas_lista").select("*").order("data_postagem", { ascending: false }).limit(6),
    supabase.from("vw_ranking_empresas").select("*").order("receita_total", { ascending: false }).limit(5),
  ]);

  const summary = summaryResult.data ?? {
    total_encomendas: 0,
    encomendas_em_transito: 0,
    aguardando_retirada: 0,
    entregues: 0,
    empresas_ativas: 0,
    receita_total_fretes: 0,
    repasses_pendentes: 0,
  };

  const kpiData = [
    {
      icon: "📦",
      color: "indigo",
      value: String(summary.total_encomendas ?? 0),
      label: "Encomendas Ativas",
      trend: "",
      trendDir: "up",
      sub: "no sistema",
    },
    {
      icon: "🚚",
      color: "sky",
      value: String(summary.encomendas_em_transito ?? 0),
      label: "Em Trânsito",
      trend: "",
      trendDir: "up",
      sub: "em andamento",
    },
    {
      icon: "✅",
      color: "emerald",
      value: String(summary.entregues ?? 0),
      label: "Entregas Concluídas",
      trend: "",
      trendDir: "up",
      sub: "registradas",
    },
    {
      icon: "⏳",
      color: "amber",
      value: String(summary.aguardando_retirada ?? 0),
      label: "Aguardando Retirada",
      trend: "",
      trendDir: "down",
      sub: "pendentes",
    },
    {
      icon: "🏢",
      color: "violet",
      value: String(summary.empresas_ativas ?? 0),
      label: "Empresas Parceiras",
      trend: "",
      trendDir: "up",
      sub: "ativas",
    },
    {
      icon: "💰",
      color: "emerald",
      value: formatCurrencyBRL(summary.repasses_pendentes ?? 0),
      label: "Repasses Pendentes",
      trend: "",
      trendDir: "up",
      sub: "a pagar",
    },
  ];

  const recentPackages = (recentResult.data ?? []).map((pkg: any) => ({
    id: pkg.codigo,
    origem: pkg.remetente_cidade ?? "—",
    destino: pkg.destinatario_cidade ?? "—",
    empresa: pkg.empresa_nome ?? "—",
    status: pkg.status,
    valor: formatCurrencyBRL(pkg.valor_frete),
    data: formatDateBR(pkg.data_postagem),
  }));

  const rankingItems = (rankingResult.data ?? []).map((item: any) => ({
    id: item.id,
    name: item.nome,
    volume: Number(item.total_encomendas ?? 0),
    receita: Number(item.receita_total ?? 0),
    repass: Number(item.total_repasses ?? 0),
  }));

  const maxReceita = Math.max(...rankingItems.map((item) => item.receita), 1);
  const topEmpresas = rankingItems.map((item) => ({
    ...item,
    pct: Math.max(8, Math.round((item.receita / maxReceita) * 100)),
    receitaLabel: formatCurrencyBRL(item.receita),
    repasseLabel: formatCurrencyBRL(item.repass),
  }));

  return (
    <div className="animate-fade-in">
      <div className="grid-6" style={{ marginBottom: "24px" }}>
        {kpiData.map((kpi, index) => (
          <div key={index} className="kpi-card">
            <div className="flex items-center justify-between">
              <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
              {kpi.trend && (
                <span className={`kpi-trend ${kpi.trendDir}`}>
                  {kpi.trendDir === "up" ? "↑" : "↓"} {kpi.trend}
                </span>
              )}
            </div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label" style={{ marginTop: "4px" }}>{kpi.label}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Encomendas Recentes</div>
              <div className="card-subtitle">Últimas movimentações</div>
            </div>
            <a href="/encomendas" className="btn btn-secondary btn-sm">
              Ver todas →
            </a>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Origem / Destino</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentPackages.map((pkg) => {
                  const st = statusMap[pkg.status] ?? statusMap.pendente;

                  return (
                    <tr key={pkg.id}>
                      <td>
                        <strong style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {pkg.id}
                        </strong>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{pkg.data}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{pkg.origem}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>→ {pkg.destino}</div>
                      </td>
                      <td style={{ fontSize: "12px" }}>{pkg.empresa}</td>
                      <td>
                        <span className={`badge ${st.class}`}>{st.label}</span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--brand-success)", fontSize: "12px" }}>
                          {pkg.valor}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Top Parceiros</div>
                <div className="card-subtitle">Volume este mês</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topEmpresas.map((emp, index) => (
                <div key={emp.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "20px",
                        height: "20px",
                        background: "var(--bg-overlay)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>
                        {emp.name}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {emp.volume} enc.
                    </span>
                  </div>
                  <div style={{
                    height: "4px",
                    background: "var(--bg-overlay)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${emp.pct}%`,
                      background: "var(--gradient-brand)",
                      borderRadius: "2px",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Receita: {emp.receitaLabel}</span>
                    <span style={{ fontSize: "10px", color: "var(--brand-success)" }}>Repasse: {emp.repasseLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Ações Rápidas</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { href: "/encomendas", icon: "📦", label: "Nova Encomenda" },
                { href: "/logistica", icon: "🚚", label: "Registrar Entrega" },
                { href: "/financeiro", icon: "💸", label: "Processar Repasse" },
                { href: "/relatorios", icon: "📊", label: "Gerar Relatório" },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "flex-start",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{action.icon}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{action.label}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "11px" }}>→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Status do Sistema</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "API Principal", status: "active", info: "99.9% uptime" },
                { label: "Rastreamento", status: "active", info: "Tempo real" },
                { label: "Integrações", status: "active", info: `${summary.empresas_ativas ?? 0} parceiras ativas` },
                { label: "Backups", status: "active", info: "Última: 03:00" },
              ].map((svc, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={`status-dot ${svc.status}`} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{svc.label}</span>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{svc.info}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
