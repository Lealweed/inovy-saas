"use client";
import { useEffect, useMemo, useState } from "react";
import EtiquetaModal, { EtiquetaData } from "@/components/EtiquetaModal";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL, formatDateBR, formatWeightKg } from "@/lib/formatters";

const statusMap = {
  pendente: { label: "Pendente", class: "badge-warning" },
  coletado: { label: "Coletado", class: "badge-default" },
  em_transito: { label: "Em Trânsito", class: "badge-info" },
  aguardando_retirada: { label: "Ag. Retirada", class: "badge-warning" },
  entregue: { label: "Entregue", class: "badge-success" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
} as const;

const statusFilters = [
  { label: "Todos", value: "" },
  { label: "Pendente", value: "pendente" },
  { label: "Coletado", value: "coletado" },
  { label: "Em Trânsito", value: "em_transito" },
  { label: "Ag. Retirada", value: "aguardando_retirada" },
  { label: "Entregue", value: "entregue" },
  { label: "Cancelado", value: "cancelado" },
];

type ShipmentStatus = keyof typeof statusMap;

type ShipmentRow = EtiquetaData & {
  dbId: string;
  empresaId: string;
  status: ShipmentStatus;
  valorNumber: number;
  pesoNumber: number;
  previsaoRaw: string;
};

type EmpresaOption = {
  id: string;
  nome: string;
};

const initialForm = {
  remetente: "",
  destinatario: "",
  remetenteCidade: "",
  destinatarioCidade: "",
  remetenteEndereco: "",
  destinatarioEndereco: "",
  destinatarioTelefone: "",
  empresaId: "",
  pesoKg: "",
  valorFrete: "",
  previsaoEntrega: "",
  fragil: false,
  urgente: false,
  observacoes: "",
};

function mapShipment(row: any): ShipmentRow {
  return {
    dbId: row.id,
    id: row.codigo,
    remetente: row.remetente_nome,
    remetenteEndereco: row.remetente_endereco ?? "",
    remetenteCidade: row.remetente_cidade ?? "",
    destinatario: row.destinatario_nome,
    destinatarioEndereco: row.destinatario_endereco ?? "",
    destinatarioCidade: row.destinatario_cidade ?? "",
    destinatarioTelefone: row.destinatario_telefone ?? "",
    empresa: row.empresa_nome ?? "—",
    empresaId: row.empresa_id,
    status: row.status as ShipmentStatus,
    peso: formatWeightKg(row.peso_kg),
    valor: formatCurrencyBRL(row.valor_frete),
    valorNumber: Number(row.valor_frete ?? 0),
    pesoNumber: Number(row.peso_kg ?? 0),
    previsaoRaw: row.previsao_entrega ?? "",
    data: formatDateBR(row.data_postagem),
    previsao: formatDateBR(row.previsao_entrega),
    fragil: Boolean(row.fragil),
    urgente: Boolean(row.urgente),
    observacoes: row.observacoes ?? "",
  };
}

export default function EncomendasPage() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [etiquetaData, setEtiquetaData] = useState<EtiquetaData | null>(null);
  const [items, setItems] = useState<ShipmentRow[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [editingEnc, setEditingEnc] = useState<ShipmentRow | null>(null);
  const [deletingEnc, setDeletingEnc] = useState<ShipmentRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [encomendasResult, empresasResult] = await Promise.all([
      supabase.from("vw_encomendas_lista").select("*").order("data_postagem", { ascending: false }),
      supabase.from("empresas").select("id, nome").eq("status", "ativo").order("nome"),
    ]);

    if (encomendasResult.error) {
      setError(encomendasResult.error.message);
    } else {
      setItems((encomendasResult.data ?? []).map(mapShipment));
    }

    if (empresasResult.error) {
      setError(empresasResult.error.message);
    } else {
      setEmpresas(empresasResult.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((enc) => {
      const query = search.toLowerCase();
      const matchSearch =
        enc.id.toLowerCase().includes(query) ||
        enc.remetente.toLowerCase().includes(query) ||
        enc.destinatario.toLowerCase().includes(query) ||
        enc.empresa.toLowerCase().includes(query);

      const matchStatus = !statusFilter || enc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  const handleOpenEtiqueta = (enc: ShipmentRow) => {
    setEtiquetaData(enc);
  };

  const handleEdit = (enc: ShipmentRow) => {
    setFormData({
      remetente: enc.remetente,
      destinatario: enc.destinatario,
      remetenteCidade: enc.remetenteCidade,
      destinatarioCidade: enc.destinatarioCidade,
      remetenteEndereco: enc.remetenteEndereco,
      destinatarioEndereco: enc.destinatarioEndereco,
      destinatarioTelefone: enc.destinatarioTelefone,
      empresaId: enc.empresaId,
      pesoKg: String(enc.pesoNumber || ""),
      valorFrete: String(enc.valorNumber || ""),
      previsaoEntrega: enc.previsaoRaw,
      fragil: enc.fragil,
      urgente: enc.urgente,
      observacoes: enc.observacoes,
    });
    setEditingEnc(enc);
    setShowModal(true);
  };

  const handleUpdateShipment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEnc) return;
    setSaving(true);
    setError("");
    setSuccess("");

    if (!formData.remetente || !formData.destinatario || !formData.empresaId) {
      setError("Preencha os campos obrigatórios da encomenda.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.from("encomendas").update({
      empresa_id: formData.empresaId,
      remetente_nome: formData.remetente,
      remetente_endereco: formData.remetenteEndereco || null,
      remetente_cidade: formData.remetenteCidade || null,
      destinatario_nome: formData.destinatario,
      destinatario_endereco: formData.destinatarioEndereco || null,
      destinatario_cidade: formData.destinatarioCidade,
      destinatario_telefone: formData.destinatarioTelefone || null,
      peso_kg: Number(formData.pesoKg || 0),
      valor_frete: Number(formData.valorFrete || 0),
      previsao_entrega: formData.previsaoEntrega || null,
      fragil: formData.fragil,
      urgente: formData.urgente,
      observacoes: formData.observacoes || null,
    }).eq("id", editingEnc.dbId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setFormData(initialForm);
    setEditingEnc(null);
    setShowModal(false);
    setSuccess("Encomenda atualizada com sucesso.");
    setSaving(false);
    await loadData();
  };

  const handleDeleteShipment = async () => {
    if (!deletingEnc) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("encomendas").delete().eq("id", deletingEnc.dbId);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      setDeletingEnc(null);
      return;
    }

    setDeletingEnc(null);
    setSuccess("Encomenda excluída com sucesso.");
    setSaving(false);
    await loadData();
  };

  const handleInputChange = (field: keyof typeof initialForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateShipment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!formData.remetente || !formData.destinatario || !formData.empresaId) {
      setError("Preencha os campos obrigatórios da encomenda.");
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("encomendas").insert({
      empresa_id: formData.empresaId,
      remetente_nome: formData.remetente,
      remetente_endereco: formData.remetenteEndereco || null,
      remetente_cidade: formData.remetenteCidade || null,
      destinatario_nome: formData.destinatario,
      destinatario_endereco: formData.destinatarioEndereco || null,
      destinatario_cidade: formData.destinatarioCidade,
      destinatario_telefone: formData.destinatarioTelefone || null,
      status: "pendente",
      peso_kg: Number(formData.pesoKg || 0),
      valor_frete: Number(formData.valorFrete || 0),
      data_postagem: new Date().toISOString().slice(0, 10),
      previsao_entrega: formData.previsaoEntrega || null,
      fragil: formData.fragil,
      urgente: formData.urgente,
      observacoes: formData.observacoes || null,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setFormData(initialForm);
    setShowModal(false);
    setSuccess("Encomenda cadastrada com sucesso.");
    setSaving(false);
    await loadData();
  };

  const totalEmTransito = items.filter((item) => item.status === "em_transito").length;
  const totalAguardando = items.filter((item) => item.status === "aguardando_retirada").length;
  const totalEntregues = items.filter((item) => item.status === "entregue").length;
  const totalCanceladas = items.filter((item) => item.status === "cancelado").length;

  return (
    <div className="animate-fade-in">
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
            {items.length} encomendas no sistema · {totalEmTransito} em trânsito
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

      {(error || success) && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            borderColor: error ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)",
            color: error ? "#fca5a5" : "#86efac",
          }}
        >
          {error || success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total", value: items.length, color: "var(--text-primary)" },
          { label: "Em Trânsito", value: totalEmTransito, color: "#38bdf8" },
          { label: "Ag. Retirada", value: totalAguardando, color: "#fbbf24" },
          { label: "Entregues", value: totalEntregues, color: "#34d399" },
          { label: "Canceladas", value: totalCanceladas, color: "#f87171" },
        ].map((stat, index) => (
          <div key={index} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

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
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className="btn btn-sm"
                style={{
                  background: statusFilter === filter.value ? "rgba(255,255,255,0.08)" : "var(--bg-elevated)",
                  color: statusFilter === filter.value ? "var(--text-primary)" : "var(--text-secondary)",
                  border: `1px solid ${statusFilter === filter.value ? "rgba(255,255,255,0.14)" : "var(--border-subtle)"}`,
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary btn-sm">🖨️ Impr. em Lote</button>
          </div>
        </div>
      </div>

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
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Carregando encomendas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
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
                  const st = statusMap[enc.status] ?? statusMap.pendente;

                  return (
                    <tr key={enc.dbId}>
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
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{enc.remetenteCidade || "—"}</div>
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
                          <button className="btn btn-ghost btn-icon btn-sm" title="Ver detalhes" onClick={() => handleOpenEtiqueta(enc)}>
                            👁️
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={() => handleEdit(enc)}>
                            ✏️
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Excluir" onClick={() => setDeletingEnc(enc)} style={{ color: "#f87171" }}>
                            🗑️
                          </button>
                          <button
                            className="btn btn-sm"
                            title="Gerar Etiqueta"
                            onClick={() => handleOpenEtiqueta(enc)}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "var(--text-primary)",
                              border: "1px solid rgba(255,255,255,0.12)",
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

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {filtered.length} de {items.length} encomendas
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="btn btn-secondary btn-sm">← Anterior</button>
            <button className="btn btn-primary btn-sm">1</button>
            <button className="btn btn-secondary btn-sm">Próxima →</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingEnc(null); setFormData(initialForm); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <form onSubmit={editingEnc ? handleUpdateShipment : handleCreateShipment}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingEnc ? "Editar Encomenda" : "Nova Encomenda"}</div>
                  <div className="modal-subtitle">{editingEnc ? `Editando ${editingEnc.id}` : "Preencha os dados para cadastrar"}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); setEditingEnc(null); setFormData(initialForm); }} style={{ fontSize: "18px" }}>
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Remetente *</label>
                    <input type="text" value={formData.remetente} onChange={(e) => handleInputChange("remetente", e.target.value)} placeholder="Nome completo" required />
                  </div>
                  <div className="input-group">
                    <label>Destinatário *</label>
                    <input type="text" value={formData.destinatario} onChange={(e) => handleInputChange("destinatario", e.target.value)} placeholder="Nome completo" required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Cidade de Origem</label>
                    <input type="text" value={formData.remetenteCidade} onChange={(e) => handleInputChange("remetenteCidade", e.target.value)} placeholder="Cidade, UF" />
                  </div>
                  <div className="input-group">
                    <label>Cidade de Destino *</label>
                    <input type="text" value={formData.destinatarioCidade} onChange={(e) => handleInputChange("destinatarioCidade", e.target.value)} placeholder="Cidade, UF" required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Endereço do Remetente</label>
                    <input type="text" value={formData.remetenteEndereco} onChange={(e) => handleInputChange("remetenteEndereco", e.target.value)} placeholder="Rua, número" />
                  </div>
                  <div className="input-group">
                    <label>Endereço do Destinatário</label>
                    <input type="text" value={formData.destinatarioEndereco} onChange={(e) => handleInputChange("destinatarioEndereco", e.target.value)} placeholder="Rua, número" />
                  </div>
                </div>
                <div className="grid-3">
                  <div className="input-group">
                    <label>Empresa Parceira *</label>
                    <select value={formData.empresaId} onChange={(e) => handleInputChange("empresaId", e.target.value)} required>
                      <option value="">Selecione...</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Peso (kg) *</label>
                    <input type="number" value={formData.pesoKg} onChange={(e) => handleInputChange("pesoKg", e.target.value)} placeholder="0.0" min="0" step="0.1" required />
                  </div>
                  <div className="input-group">
                    <label>Valor do Frete *</label>
                    <input type="number" value={formData.valorFrete} onChange={(e) => handleInputChange("valorFrete", e.target.value)} placeholder="0.00" min="0" step="0.01" required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Telefone do Destinatário</label>
                    <input type="text" value={formData.destinatarioTelefone} onChange={(e) => handleInputChange("destinatarioTelefone", e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="input-group">
                    <label>Previsão de Entrega</label>
                    <input type="date" value={formData.previsaoEntrega} onChange={(e) => handleInputChange("previsaoEntrega", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={formData.fragil} onChange={(e) => handleInputChange("fragil", e.target.checked)} style={{ width: "auto" }} />
                    <span>⚠️ Frágil</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={formData.urgente} onChange={(e) => handleInputChange("urgente", e.target.checked)} style={{ width: "auto" }} />
                    <span>🚨 Urgente</span>
                  </label>
                </div>
                <div className="input-group">
                  <label>Observações</label>
                  <textarea value={formData.observacoes} onChange={(e) => handleInputChange("observacoes", e.target.value)} placeholder="Informações adicionais..." rows={2} style={{ resize: "none" }} />
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingEnc(null); setFormData(initialForm); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : editingEnc ? "💾 Salvar Alterações" : "📦 Cadastrar Encomenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {etiquetaData && (
        <EtiquetaModal
          data={etiquetaData}
          onClose={() => setEtiquetaData(null)}
        />
      )}

      {deletingEnc && (
        <div className="modal-overlay" onClick={() => setDeletingEnc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Excluir Encomenda</div>
                <div className="modal-subtitle">Esta ação não pode ser desfeita</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDeletingEnc(null)} style={{ fontSize: "18px" }}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 8px" }}>
              Tem certeza que deseja excluir a encomenda <strong style={{ color: "var(--text-primary)" }}>{deletingEnc.id}</strong> de{" "}
              <strong style={{ color: "var(--text-primary)" }}>{deletingEnc.remetente}</strong> para{" "}
              <strong style={{ color: "var(--text-primary)" }}>{deletingEnc.destinatario}</strong>?
            </p>
            <div className="divider" />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingEnc(null)}>Cancelar</button>
              <button
                type="button"
                className="btn"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                onClick={handleDeleteShipment}
                disabled={saving}
              >
                {saving ? "Excluindo..." : "🗑️ Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
