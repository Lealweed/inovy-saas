"use client";
import { useState } from "react";
import EtiquetaModal, { EtiquetaData } from "@/components/EtiquetaModal";

const statusMap: Record<string, { label: string; class: string }> = {
  pendente: { label: "Pendente", class: "badge-warning" },
  coletado: { label: "Coletado", class: "badge-default" },
  em_transito: { label: "Em Trânsito", class: "badge-info" },
  aguardando_retirada: { label: "Ag. Retirada", class: "badge-warning" },
  entregue: { label: "Entregue", class: "badge-success" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
};

const mockData = [
  {
    id: "ENC-20480",
    remetente: "João Silva",
    remetenteEndereco: "Rua das Flores, 123",
    remetenteCidade: "São Paulo, SP",
    destinatario: "Maria Santos",
    destinatarioEndereco: "Av. Atlântica, 456",
    destinatarioCidade: "Rio de Janeiro, RJ",
    destinatarioTelefone: "(21) 99999-1234",
    empresa: "Expressa Log",
    status: "em_transito",
    peso: "2.5 kg",
    valor: "R$ 85,00",
    data: "07/04/2026",
    previsao: "09/04/2026",
    fragil: false,
    urgente: false,
    observacoes: "",
  },
  {
    id: "ENC-20479",
    remetente: "Carlos Lima",
    remetenteEndereco: "Av. Afonso Pena, 800",
    remetenteCidade: "Belo Horizonte, MG",
    destinatario: "Ana Ferreira",
    destinatarioEndereco: "SQLN 304, Bloco A",
    destinatarioCidade: "Brasília, DF",
    destinatarioTelefone: "(61) 98888-5678",
    empresa: "Rota Brasil",
    status: "aguardando_retirada",
    peso: "5.0 kg",
    valor: "R$ 120,00",
    data: "07/04/2026",
    previsao: "08/04/2026",
    fragil: true,
    urgente: false,
    observacoes: "Eletrônico — manusear com cuidado",
  },
  {
    id: "ENC-20478",
    remetente: "Pedro Costa",
    remetenteEndereco: "Rua XV de Novembro, 200",
    remetenteCidade: "Curitiba, PR",
    destinatario: "Luiz Oliveira",
    destinatarioEndereco: "Av. Beira-Mar Norte, 50",
    destinatarioCidade: "Florianópolis, SC",
    destinatarioTelefone: "(48) 97777-9012",
    empresa: "Sul Expresso",
    status: "entregue",
    peso: "1.2 kg",
    valor: "R$ 65,00",
    data: "06/04/2026",
    previsao: "08/04/2026",
    fragil: false,
    urgente: false,
    observacoes: "",
  },
  {
    id: "ENC-20477",
    remetente: "Sandra Melo",
    remetenteEndereco: "Av. Sete de Setembro, 175",
    remetenteCidade: "Salvador, BA",
    destinatario: "Paulo Ramos",
    destinatarioEndereco: "Rua do Bom Jesus, 99",
    destinatarioCidade: "Recife, PE",
    destinatarioTelefone: "(81) 96666-3456",
    empresa: "Nordeste Log",
    status: "entregue",
    peso: "3.8 kg",
    valor: "R$ 95,00",
    data: "06/04/2026",
    previsao: "07/04/2026",
    fragil: false,
    urgente: true,
    observacoes: "Entregar somente ao destinatário",
  },
  {
    id: "ENC-20476",
    remetente: "Teresa Gomes",
    remetenteEndereco: "Rua dos Andradas, 500",
    remetenteCidade: "Porto Alegre, RS",
    destinatario: "Roberto Dias",
    destinatarioEndereco: "Al. Santos, 1000",
    destinatarioCidade: "São Paulo, SP",
    destinatarioTelefone: "(11) 95555-7890",
    empresa: "Expressa Log",
    status: "em_transito",
    peso: "8.2 kg",
    valor: "R$ 140,00",
    data: "05/04/2026",
    previsao: "10/04/2026",
    fragil: false,
    urgente: false,
    observacoes: "",
  },
  {
    id: "ENC-20475",
    remetente: "Marcos Nunes",
    remetenteEndereco: "Av. Eduardo Ribeiro, 300",
    remetenteCidade: "Manaus, AM",
    destinatario: "Juliana Barros",
    destinatarioEndereco: "Tv. Padre Eutíquio, 77",
    destinatarioCidade: "Belém, PA",
    destinatarioTelefone: "(91) 94444-2345",
    empresa: "Norte Express",
    status: "coletado",
    peso: "12.0 kg",
    valor: "R$ 210,00",
    data: "05/04/2026",
    previsao: "12/04/2026",
    fragil: true,
    urgente: true,
    observacoes: "Produto frágil e urgente — cuidado no manuseio",
  },
  {
    id: "ENC-20474",
    remetente: "Fátima Cruz",
    remetenteEndereco: "Rua Floriano Peixoto, 50",
    remetenteCidade: "Fortaleza, CE",
    destinatario: "Wellington Pinto",
    destinatarioEndereco: "Rua Oscar Freire, 2200",
    destinatarioCidade: "São Paulo, SP",
    destinatarioTelefone: "(11) 93333-6789",
    empresa: "Nordeste Log",
    status: "pendente",
    peso: "0.8 kg",
    valor: "R$ 55,00",
    data: "04/04/2026",
    previsao: "11/04/2026",
    fragil: false,
    urgente: false,
    observacoes: "",
  },
  {
    id: "ENC-20473",
    remetente: "Ricardo Vieira",
    remetenteEndereco: "Av. Goiás, 1200",
    remetenteCidade: "Goiânia, GO",
    destinatario: "Camila Torres",
    destinatarioEndereco: "SQS 108, Bloco D",
    destinatarioCidade: "Brasília, DF",
    destinatarioTelefone: "(61) 92222-1357",
    empresa: "Rota Brasil",
    status: "cancelado",
    peso: "2.0 kg",
    valor: "R$ 45,00",
    data: "04/04/2026",
    previsao: "—",
    fragil: false,
    urgente: false,
    observacoes: "",
  },
];

const statusFilters = [
  { label: "Todos", value: "" },
  { label: "Pendente", value: "pendente" },
  { label: "Em Trânsito", value: "em_transito" },
  { label: "Ag. Retirada", value: "aguardando_retirada" },
  { label: "Entregue", value: "entregue" },
  { label: "Cancelado", value: "cancelado" },
];

export default function EncomendasPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [etiquetaData, setEtiquetaData] = useState<EtiquetaData | null>(null);

  const filtered = mockData.filter((enc) => {
    const matchSearch =
      enc.id.toLowerCase().includes(search.toLowerCase()) ||
      enc.remetente.toLowerCase().includes(search.toLowerCase()) ||
      enc.destinatario.toLowerCase().includes(search.toLowerCase()) ||
      enc.empresa.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || enc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenEtiqueta = (enc: typeof mockData[0]) => {
    setEtiquetaData(enc as EtiquetaData);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div className="breadcrumb" style={{ marginBottom: "6px" }}>
            <span className="breadcrumb-item">Dashboard</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-active">Encomendas</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Gestão de Encomendas
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {mockData.length} encomendas no sistema ·{" "}
            {mockData.filter((e) => e.status === "em_transito").length} em trânsito
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" id="btn-exportar-csv">
            📥 Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-nova-encomenda">
            + Nova Encomenda
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total", value: mockData.length, color: "var(--text-primary)" },
          { label: "Em Trânsito", value: mockData.filter((e) => e.status === "em_transito").length, color: "#38bdf8" },
          { label: "Ag. Retirada", value: mockData.filter((e) => e.status === "aguardando_retirada").length, color: "#fbbf24" },
          { label: "Entregues", value: mockData.filter((e) => e.status === "entregue").length, color: "#34d399" },
          { label: "Canceladas", value: mockData.filter((e) => e.status === "cancelado").length, color: "#f87171" },
        ].map((stat, i) => (
          <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍  Buscar por código, remetente, destinatário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "340px", flex: "1" }}
            id="input-search-encomendas"
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="btn btn-sm"
                style={{
                  background: statusFilter === f.value ? "rgba(99,102,241,0.2)" : "var(--bg-elevated)",
                  color: statusFilter === f.value ? "var(--brand-primary-light)" : "var(--text-secondary)",
                  border: `1px solid ${statusFilter === f.value ? "rgba(99,102,241,0.4)" : "var(--border-subtle)"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary btn-sm">🖨️ Impr. em Lote</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: "0" }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Remetente</th>
                <th>Destinatário</th>
                <th>Empresa</th>
                <th>Rota</th>
                <th>Peso</th>
                <th>Previsão</th>
                <th>Status</th>
                <th>Valor</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3>Nenhuma encomenda encontrada</h3>
                      <p>Ajuste os filtros ou cadastre uma nova encomenda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((enc) => {
                  const st = statusMap[enc.status];
                  return (
                    <tr key={enc.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--brand-primary-light)" }}>
                            {enc.id}
                          </strong>
                          {enc.fragil && <span title="Frágil" style={{ fontSize: "10px" }}>⚠️</span>}
                          {enc.urgente && <span title="Urgente" style={{ fontSize: "10px" }}>🚨</span>}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{enc.data}</div>
                      </td>
                      <td style={{ fontSize: "12px" }}><strong>{enc.remetente}</strong></td>
                      <td style={{ fontSize: "12px" }}>{enc.destinatario}</td>
                      <td style={{ fontSize: "12px" }}>{enc.empresa}</td>
                      <td>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{enc.remetenteCidade}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>→ {enc.destinatarioCidade}</div>
                      </td>
                      <td style={{ fontSize: "12px" }}>{enc.peso}</td>
                      <td style={{ fontSize: "12px" }}>{enc.previsao}</td>
                      <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                      <td>
                        <strong style={{ color: "var(--brand-success)", fontSize: "12px" }}>{enc.valor}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Ver detalhes"
                          >
                            👁️
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-sm"
                            title="Gerar Etiqueta"
                            onClick={() => handleOpenEtiqueta(enc)}
                            style={{
                              background: "rgba(99,102,241,0.1)",
                              color: "var(--brand-primary-light)",
                              border: "1px solid rgba(99,102,241,0.2)",
                              fontSize: "11px",
                              gap: "4px",
                              padding: "4px 8px",
                            }}
                          >
                            🏷️ Etiqueta
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {filtered.length} de {mockData.length} encomendas
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="btn btn-secondary btn-sm">← Anterior</button>
            <button className="btn btn-primary btn-sm">1</button>
            <button className="btn btn-secondary btn-sm">Próxima →</button>
          </div>
        </div>
      </div>

      {/* Modal Nova Encomenda */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Nova Encomenda</div>
                <div className="modal-subtitle">Preencha os dados para cadastrar</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} style={{ fontSize: "18px" }}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="grid-2">
                <div className="input-group"><label>Remetente *</label><input type="text" placeholder="Nome completo" /></div>
                <div className="input-group"><label>Destinatário *</label><input type="text" placeholder="Nome completo" /></div>
              </div>
              <div className="grid-2">
                <div className="input-group"><label>Cidade de Origem *</label><input type="text" placeholder="Cidade, UF" /></div>
                <div className="input-group"><label>Cidade de Destino *</label><input type="text" placeholder="Cidade, UF" /></div>
              </div>
              <div className="grid-2">
                <div className="input-group"><label>Endereço do Remetente</label><input type="text" placeholder="Rua, número" /></div>
                <div className="input-group"><label>Endereço do Destinatário</label><input type="text" placeholder="Rua, número" /></div>
              </div>
              <div className="grid-3">
                <div className="input-group">
                  <label>Empresa Parceira *</label>
                  <select>
                    <option value="">Selecione...</option>
                    <option>Expressa Log</option>
                    <option>Rota Brasil</option>
                    <option>Sul Expresso</option>
                    <option>Nordeste Log</option>
                    <option>Norte Express</option>
                  </select>
                </div>
                <div className="input-group"><label>Peso (kg) *</label><input type="number" placeholder="0.0" min="0" step="0.1" /></div>
                <div className="input-group"><label>Valor do Frete *</label><input type="text" placeholder="R$ 0,00" /></div>
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" style={{ width: "auto" }} />
                  <span>⚠️ Frágil</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" style={{ width: "auto" }} />
                  <span>🚨 Urgente</span>
                </label>
              </div>
              <div className="input-group">
                <label>Observações</label>
                <textarea placeholder="Informações adicionais..." rows={2} style={{ resize: "none" }} />
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>📦 Cadastrar Encomenda</button>
            </div>
          </div>
        </div>
      )}

      {/* Etiqueta Modal */}
      {etiquetaData && (
        <EtiquetaModal
          data={etiquetaData}
          onClose={() => setEtiquetaData(null)}
        />
      )}
    </div>
  );
}
