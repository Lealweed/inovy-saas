"use client";
import { useState } from "react";

const repasses = [
  { id: "REP-0089", empresa: "Expressa Log", periodo: "Mar/2026", encomendas: 412, bruto: "R$ 18.540,00", comissao: "R$ 2.781,00", liquido: "R$ 15.759,00", status: "pago", dataPag: "31/03/2026" },
  { id: "REP-0090", empresa: "Rota Brasil", periodo: "Mar/2026", encomendas: 298, bruto: "R$ 13.410,00", comissao: "R$ 1.609,20", liquido: "R$ 11.800,80", status: "pago", dataPag: "31/03/2026" },
  { id: "REP-0091", empresa: "Sul Expresso", periodo: "Mar/2026", encomendas: 187, bruto: "R$ 8.415,00", comissao: "R$ 1.514,70", liquido: "R$ 6.900,30", status: "pendente", dataPag: "—" },
  { id: "REP-0092", empresa: "Nordeste Log", periodo: "Mar/2026", encomendas: 156, bruto: "R$ 7.020,00", comissao: "R$ 982,80", liquido: "R$ 6.037,20", status: "pendente", dataPag: "—" },
  { id: "REP-0093", empresa: "Norte Express", periodo: "Mar/2026", encomendas: 98, bruto: "R$ 4.410,00", comissao: "R$ 705,60", liquido: "R$ 3.704,40", status: "atrasado", dataPag: "—" },
  { id: "REP-0094", empresa: "Centro Trans", periodo: "Mar/2026", encomendas: 72, bruto: "R$ 3.240,00", comissao: "R$ 421,20", liquido: "R$ 2.818,80", status: "pendente", dataPag: "—" },
];

const statusMap: Record<string, { label: string; class: string }> = {
  pago: { label: "Pago", class: "badge-success" },
  pendente: { label: "Pendente", class: "badge-warning" },
  atrasado: { label: "Atrasado", class: "badge-danger" },
};

export default function FinanceiroPage() {
  const pendentes = repasses.filter((r) => r.status !== "pago");
  const totalPendente = pendentes.length;
  const valorPendente = "R$ 30.261,70";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Financeiro — Repasses
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Controle de comissões e repasses às empresas parceiras
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" id="btn-export-financeiro">📥 Exportar</button>
          <button className="btn btn-primary" id="btn-processar-repasse">💸 Processar Repasses</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { label: "Repasses Pagos (mês)", value: "R$ 27.560,10", icon: "✅", color: "emerald", sub: "2 empresas" },
          { label: "Pendentes de Pagamento", value: valorPendente, icon: "⏳", color: "amber", sub: `${totalPendente} empresas` },
          { label: "Atrasados", value: "R$ 3.704,40", icon: "⚠️", color: "rose", sub: "1 empresa" },
          { label: "Receita Inovy (comissões)", value: "R$ 8.014,50", icon: "💹", color: "indigo", sub: "este mês" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                {kpi.value}
              </div>
              <div className="kpi-label">{kpi.label}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {["Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026"].map((periodo) => (
              <button
                key={periodo}
                className="btn btn-sm"
                style={{
                  background: periodo === "Mar/2026" ? "rgba(255,255,255,0.08)" : "var(--bg-elevated)",
                  color: periodo === "Mar/2026" ? "var(--text-primary)" : "var(--text-muted)",
                  border: `1px solid ${periodo === "Mar/2026" ? "rgba(255,255,255,0.14)" : "var(--border-subtle)"}`,
                }}
              >
                {periodo}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)" }}>
            Período de referência: <strong style={{ color: "var(--text-secondary)" }}>Março 2026</strong>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="card-title">Relatório de Repasses — Mar/2026</div>
          <div className="card-subtitle">Comissão Inovy aplicada por empresa conforme contrato</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Repasse</th>
                <th>Empresa</th>
                <th>Período</th>
                <th>Encomendas</th>
                <th>Receita Bruta</th>
                <th>Comissão Inovy</th>
                <th>Repasse Líquido</th>
                <th>Status</th>
                <th>Data Pagamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {repasses.map((rep) => {
                const st = statusMap[rep.status];
                return (
                  <tr key={rep.id}>
                    <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{rep.id}</strong></td>
                    <td><strong>{rep.empresa}</strong></td>
                    <td style={{ fontSize: "12px" }}>{rep.periodo}</td>
                    <td style={{ textAlign: "right", fontSize: "12px" }}>{rep.encomendas}</td>
                    <td style={{ fontSize: "12px" }}>{rep.bruto}</td>
                    <td style={{ color: "#f87171", fontSize: "12px" }}>- {rep.comissao}</td>
                    <td>
                      <strong style={{ color: "var(--brand-success)", fontSize: "13px" }}>{rep.liquido}</strong>
                    </td>
                    <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                    <td style={{ fontSize: "12px" }}>{rep.dataPag}</td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {rep.status !== "pago" && (
                          <button className="btn btn-sm" style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.2)",
                            fontSize: "11px",
                          }}>
                            💸 Pagar
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm">📋</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Totals */}
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "32px",
          background: "var(--bg-elevated)",
        }}>
          {[
            { label: "Total Bruto", value: "R$ 55.035,00", color: "var(--text-primary)" },
            { label: "Total Comissões Inovy", value: "R$ 8.014,50", color: "var(--text-primary)" },
            { label: "Total Repasses", value: "R$ 47.020,50", color: "var(--brand-success)" },
          ].map((total, i) => (
            <div key={i}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {total.label}
              </div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: total.color, marginTop: "2px" }}>
                {total.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
