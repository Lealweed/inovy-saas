"use client";
import { useState } from "react";

const entregas = [
  { id: "LOG-001", encomenda: "ENC-20479", tipo: "retirada", responsavel: "João Motorista", veiculo: "ABC-1234", destino: "Brasília, DF", horario: "09:00", status: "pendente" },
  { id: "LOG-002", encomenda: "ENC-20480", tipo: "entrega", responsavel: "Pedro Entregador", veiculo: "XYZ-5678", destino: "Rio de Janeiro, RJ", horario: "10:30", status: "em_andamento" },
  { id: "LOG-003", encomenda: "ENC-20476", tipo: "entrega", responsavel: "Maria Motorista", veiculo: "DEF-9012", destino: "São Paulo, SP", horario: "08:00", status: "concluido" },
  { id: "LOG-004", encomenda: "ENC-20475", tipo: "retirada", responsavel: "Carlos Entregador", veiculo: "GHI-3456", destino: "Belém, PA", horario: "11:00", status: "pendente" },
  { id: "LOG-005", encomenda: "ENC-20474", tipo: "entrega", responsavel: "Ana Motorista", veiculo: "JKL-7890", destino: "São Paulo, SP", horario: "14:00", status: "pendente" },
];

const statusMap: Record<string, { label: string; class: string }> = {
  pendente: { label: "Pendente", class: "badge-warning" },
  em_andamento: { label: "Em Andamento", class: "badge-info" },
  concluido: { label: "Concluído", class: "badge-success" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
};

export default function LogisticaPage() {
  const [tab, setTab] = useState<"retirada" | "entrega">("retirada");

  const filtered = entregas.filter((e) => e.tipo === tab);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Retirada & Entrega
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Controle logístico de coletas e entregas
          </p>
        </div>
        <button className="btn btn-primary" id="btn-novo-logistica">
          + Agendar Operação
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { icon: "📥", label: "Retiradas Hoje", value: "8", color: "indigo" },
          { icon: "📤", label: "Entregas Hoje", value: "14", color: "sky" },
          { icon: "⏳", label: "Pendentes", value: "5", color: "amber" },
          { icon: "✅", label: "Concluídas", value: "17", color: "emerald" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {(["retirada", "entrega"] as const).map((t) => (
          <button
            key={t}
            className="btn"
            style={{
              background: tab === t ? "rgba(255,255,255,0.08)" : "var(--bg-surface)",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(255,255,255,0.14)" : "var(--border-subtle)"}`,
            }}
            onClick={() => setTab(t)}
          >
            {t === "retirada" ? "📥 Retiradas" : "📤 Entregas"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Encomenda</th>
                <th>Responsável</th>
                <th>Veículo</th>
                <th>Destino</th>
                <th>Horário</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const st = statusMap[item.status];
                return (
                  <tr key={item.id}>
                    <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{item.id}</strong></td>
                    <td style={{ color: "var(--brand-primary-light)", fontSize: "12px", fontFamily: "monospace" }}>{item.encomenda}</td>
                    <td><strong>{item.responsavel}</strong></td>
                    <td style={{ fontSize: "12px" }}>{item.veiculo}</td>
                    <td style={{ fontSize: "12px" }}>{item.destino}</td>
                    <td style={{ fontSize: "12px" }}>{item.horario}</td>
                    <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="btn btn-ghost btn-icon btn-sm">✅</button>
                        <button className="btn btn-ghost btn-icon btn-sm">✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
