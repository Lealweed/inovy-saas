import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Inovy",
};

const kpiData = [
  {
    icon: "📦",
    color: "indigo",
    value: "1.284",
    label: "Encomendas Ativas",
    trend: "+8.2%",
    trendDir: "up",
    sub: "vs. mês anterior",
  },
  {
    icon: "🚚",
    color: "sky",
    value: "347",
    label: "Em Trânsito",
    trend: "+12.4%",
    trendDir: "up",
    sub: "hoje",
  },
  {
    icon: "✅",
    color: "emerald",
    value: "938",
    label: "Entregas Concluídas",
    trend: "+5.1%",
    trendDir: "up",
    sub: "este mês",
  },
  {
    icon: "⏳",
    color: "amber",
    value: "63",
    label: "Aguardando Retirada",
    trend: "-3.8%",
    trendDir: "down",
    sub: "pendentes",
  },
  {
    icon: "🏢",
    color: "violet",
    value: "28",
    label: "Empresas Parceiras",
    trend: "+2",
    trendDir: "up",
    sub: "novas este mês",
  },
  {
    icon: "💰",
    color: "emerald",
    value: "R$ 48.720",
    label: "Repasses Pendentes",
    trend: "",
    trendDir: "up",
    sub: "a pagar",
  },
];

const recentPackages = [
  { id: "ENC-20480", origem: "São Paulo, SP", destino: "Rio de Janeiro, RJ", empresa: "Expressa Log", status: "em_transito", valor: "R$ 85,00", data: "07/04/2026" },
  { id: "ENC-20479", origem: "Belo Horizonte, MG", destino: "Brasília, DF", empresa: "Rota Brasil", status: "aguardando", valor: "R$ 120,00", data: "07/04/2026" },
  { id: "ENC-20478", origem: "Curitiba, PR", destino: "Florianópolis, SC", empresa: "Sul Expresso", status: "entregue", valor: "R$ 65,00", data: "06/04/2026" },
  { id: "ENC-20477", origem: "Salvador, BA", destino: "Recife, PE", empresa: "Nordeste Log", status: "entregue", valor: "R$ 95,00", data: "06/04/2026" },
  { id: "ENC-20476", origem: "Porto Alegre, RS", destino: "São Paulo, SP", empresa: "Expressa Log", status: "em_transito", valor: "R$ 140,00", data: "05/04/2026" },
  { id: "ENC-20475", origem: "Manaus, AM", destino: "Belém, PA", empresa: "Norte Express", status: "coletado", valor: "R$ 210,00", data: "05/04/2026" },
];

const statusMap: Record<string, { label: string; class: string }> = {
  em_transito: { label: "Em Trânsito", class: "badge-info" },
  aguardando: { label: "Aguardando", class: "badge-warning" },
  entregue: { label: "Entregue", class: "badge-success" },
  coletado: { label: "Coletado", class: "badge-default" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
};

const topEmpresas = [
  { name: "Expressa Log", volume: 412, receita: "R$ 18.540", repass: "R$ 15.759", pct: 82 },
  { name: "Rota Brasil", volume: 298, receita: "R$ 13.410", repass: "R$ 11.399", pct: 65 },
  { name: "Sul Expresso", volume: 187, receita: "R$ 8.415", repass: "R$ 7.153", pct: 47 },
  { name: "Nordeste Log", volume: 156, receita: "R$ 7.020", repass: "R$ 5.967", pct: 38 },
  { name: "Norte Express", volume: 98, receita: "R$ 4.410", repass: "R$ 3.749", pct: 24 },
];

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      {/* KPI Grid */}
      <div className="grid-6" style={{ marginBottom: "24px" }}>
        {kpiData.map((kpi, i) => (
          <div key={i} className="kpi-card">
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

      {/* Main Grid: Table + Sidebar */}
      <div className="grid-3" style={{ gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Recent Packages */}
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
                  const st = statusMap[pkg.status];
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

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Top Empresas */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Top Parceiros</div>
                <div className="card-subtitle">Volume este mês</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topEmpresas.map((emp, i) => (
                <div key={i}>
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
                        {i + 1}
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
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Receita: {emp.receita}</span>
                    <span style={{ fontSize: "10px", color: "var(--brand-success)" }}>Repasse: {emp.repass}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Ações Rápidas</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { href: "/encomendas/nova", icon: "📦", label: "Nova Encomenda", color: "var(--brand-primary)" },
                { href: "/logistica", icon: "🚚", label: "Registrar Entrega", color: "#38bdf8" },
                { href: "/financeiro", icon: "💸", label: "Processar Repasse", color: "var(--brand-success)" },
                { href: "/relatorios", icon: "📊", label: "Gerar Relatório", color: "#f5f5f5" },
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

          {/* Status do Sistema */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Status do Sistema</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "API Principal", status: "active", info: "99.9% uptime" },
                { label: "Rastreamento", status: "active", info: "Tempo real" },
                { label: "Integrações", status: "active", info: "3/3 ativas" },
                { label: "Backups", status: "active", info: "Última: 03:00" },
              ].map((svc, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
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
