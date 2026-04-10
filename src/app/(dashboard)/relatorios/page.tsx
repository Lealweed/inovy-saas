import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relatórios | Inovy",
};

const reportCards = [
  {
    icon: "📦",
    title: "Encomendas por Período",
    desc: "Volume de encomendas com filtro por empresa, status e data",
    tags: ["Operacional", "Mensal"],
    color: "indigo",
  },
  {
    icon: "💰",
    title: "Repasses Financeiros",
    desc: "Demonstrativo de repasses e comissões por empresa parceira",
    tags: ["Financeiro", "Mensal"],
    color: "emerald",
  },
  {
    icon: "🚚",
    title: "Desempenho Logístico",
    desc: "Taxa de entregas no prazo, atrasos e cancelamentos",
    tags: ["Logística", "Semanal"],
    color: "sky",
  },
  {
    icon: "🏢",
    title: "Ranking de Parceiros",
    desc: "Performance das empresas parceiras por volume e receita",
    tags: ["Parceiros", "Mensal"],
    color: "violet",
  },
  {
    icon: "⚡",
    title: "Tempo Médio de Entrega",
    desc: "Análise de SLA por rota, empresa e tipo de encomenda",
    tags: ["SLA", "Semanal"],
    color: "amber",
  },
  {
    icon: "📈",
    title: "Crescimento Mensal",
    desc: "Evolução do volume e receita mês a mês com comparativos",
    tags: ["Executive", "Anual"],
    color: "sky",
  },
];

export default function RelatoriosPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
          Relatórios & Analytics
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
          Gere relatórios detalhados para análise e tomada de decisão
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        {[
          { label: "Relatórios Gerados", value: "0", icon: "📋", sub: "este mês" },
          { label: "Exportações PDF", value: "0", icon: "📄", sub: "este mês" },
          { label: "Exportações Excel", value: "0", icon: "📊", sub: "este mês" },
          { label: "Último Relatório", value: "—", icon: "🕐", sub: "Nenhum gerado" },
        ].map((stat, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon indigo">{stat.icon}</div>
            <div>
              <div className="kpi-value">{stat.value}</div>
              <div className="kpi-label">{stat.label}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
          Relatórios Disponíveis
        </div>
        <div className="grid-3" style={{ gap: "14px" }}>
          {reportCards.map((rep, i) => (
            <div key={i} className="card" style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div className={`kpi-icon ${rep.color}`} style={{ width: "44px", height: "44px", fontSize: "22px" }}>
                  {rep.icon}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {rep.tags.map((tag) => (
                    <span key={tag} className="badge badge-muted">{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", marginBottom: "6px" }}>
                {rep.title}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "14px" }}>
                {rep.desc}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📊 Gerar</button>
                <button className="btn btn-ghost btn-sm">📄 PDF</button>
                <button className="btn btn-ghost btn-sm">📥 Excel</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
