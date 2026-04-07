"use client";
import { useState } from "react";

const empresas = [
  { id: "EMP-001", nome: "Expressa Log", cnpj: "12.345.678/0001-90", contato: "Felipe Mendes", email: "ops@expressalog.com.br", telefone: "(11) 99999-0001", comissao: 15, status: "ativo", encomendas: 412, receita: "R$ 18.540" },
  { id: "EMP-002", nome: "Rota Brasil", cnpj: "23.456.789/0001-01", contato: "Sandra Lima", email: "contato@rotabrasil.com.br", telefone: "(21) 99999-0002", comissao: 12, status: "ativo", encomendas: 298, receita: "R$ 13.410" },
  { id: "EMP-003", nome: "Sul Expresso", cnpj: "34.567.890/0001-12", contato: "Rodrigo Santos", email: "admin@sulexpresso.com.br", telefone: "(51) 99999-0003", comissao: 18, status: "ativo", encomendas: 187, receita: "R$ 8.415" },
  { id: "EMP-004", nome: "Nordeste Log", cnpj: "45.678.901/0001-23", contato: "Fernanda Costa", email: "fern@nordestelog.com.br", telefone: "(81) 99999-0004", comissao: 14, status: "ativo", encomendas: 156, receita: "R$ 7.020" },
  { id: "EMP-005", nome: "Norte Express", cnpj: "56.789.012/0001-34", contato: "Gabriel Sousa", email: "gabriel@nortexpress.com.br", telefone: "(92) 99999-0005", comissao: 16, status: "inativo", encomendas: 98, receita: "R$ 4.410" },
  { id: "EMP-006", nome: "Centro Trans", cnpj: "67.890.123/0001-45", contato: "Priscila Martins", email: "ops@centrotrans.com.br", telefone: "(62) 99999-0006", comissao: 13, status: "ativo", encomendas: 72, receita: "R$ 3.240" },
];

export default function EmpresasPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj.includes(search) ||
      e.contato.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Empresas Parceiras
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {empresas.length} parceiros cadastrados · {empresas.filter(e => e.status === "ativo").length} ativos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-nova-empresa">
          + Cadastrar Empresa
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { label: "Parceiros Ativos", value: empresas.filter(e => e.status === "ativo").length, icon: "🏢", color: "indigo" },
          { label: "Total Encomendas", value: empresas.reduce((a, e) => a + e.encomendas, 0), icon: "📦", color: "sky" },
          { label: "Comissão Média", value: `${(empresas.reduce((a, e) => a + e.comissao, 0) / empresas.length).toFixed(1)}%`, icon: "💹", color: "emerald" },
          { label: "Inativos", value: empresas.filter(e => e.status === "inativo").length, icon: "⚠️", color: "amber" },
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

      {/* Search */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍  Buscar por nome, CNPJ ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "380px", flex: 1 }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary btn-sm">📥 Exportar</button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid-3" style={{ gap: "14px" }}>
        {filtered.map((emp) => (
          <div key={emp.id} className="card" style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  background: "var(--gradient-brand-soft)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}>
                  🏢
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>{emp.nome}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{emp.cnpj}</div>
                </div>
              </div>
              <span className={`badge ${emp.status === "ativo" ? "badge-success" : "badge-muted"}`}>
                {emp.status === "ativo" ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>👤 Contato</span>
                <span style={{ color: "var(--text-secondary)" }}>{emp.contato}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>📧 E-mail</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{emp.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>📱 Telefone</span>
                <span style={{ color: "var(--text-secondary)" }}>{emp.telefone}</span>
              </div>
              <div className="divider" />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>📦 Encomendas</span>
                <strong style={{ color: "var(--text-primary)" }}>{emp.encomendas}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>💰 Receita Total</span>
                <strong style={{ color: "var(--brand-success)" }}>{emp.receita}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>💹 Comissão Inovy</span>
                <span style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "var(--brand-primary-light)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontWeight: "700",
                }}>
                  {emp.comissao}%
                </span>
              </div>
            </div>

            <div className="divider" />
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>✏️ Editar</button>
              <button className="btn btn-ghost btn-sm">📊</button>
              <button className="btn btn-ghost btn-sm">💸</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Cadastrar Empresa Parceira</div>
                <div className="modal-subtitle">Preencha os dados da empresa</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="grid-2">
                <div className="input-group">
                  <label>Nome da Empresa *</label>
                  <input type="text" placeholder="Razão social" />
                </div>
                <div className="input-group">
                  <label>CNPJ *</label>
                  <input type="text" placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label>Nome do Contato *</label>
                  <input type="text" placeholder="Responsável" />
                </div>
                <div className="input-group">
                  <label>Telefone *</label>
                  <input type="text" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label>E-mail *</label>
                  <input type="email" placeholder="email@empresa.com" />
                </div>
                <div className="input-group">
                  <label>Comissão Inovy (%) *</label>
                  <input type="number" placeholder="15" min="0" max="100" />
                </div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>🏢 Cadastrar Empresa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
