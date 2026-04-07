"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const statusMap = {
  pendente: { label: "Pendente", class: "badge-warning" },
  em_andamento: { label: "Em Andamento", class: "badge-info" },
  concluido: { label: "Concluído", class: "badge-success" },
  cancelado: { label: "Cancelado", class: "badge-danger" },
} as const;

type Tab = "retirada" | "entrega";
type OperationStatus = keyof typeof statusMap;

type OperationRow = {
  dbId: string;
  id: string;
  encomenda: string;
  tipo: Tab;
  responsavel: string;
  veiculo: string;
  destino: string;
  horario: string;
  status: OperationStatus;
};

type ShipmentOption = {
  id: string;
  codigo: string;
  destino: string;
};

const initialForm = {
  tipo: "retirada" as Tab,
  encomendaId: "",
  responsavel: "",
  veiculo: "",
  destino: "",
  horario: "",
};

export default function LogisticaPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("retirada");
  const [showModal, setShowModal] = useState(false);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [shipmentOptions, setShipmentOptions] = useState<ShipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [operationsResult, shipmentsResult] = await Promise.all([
      supabase
        .from("operacoes_logisticas")
        .select("id, codigo, tipo, responsavel_nome, veiculo, destino, horario_previsto, status, encomendas(codigo)")
        .order("horario_previsto", { ascending: true }),
      supabase
        .from("encomendas")
        .select("id, codigo, destinatario_cidade")
        .order("codigo", { ascending: false }),
    ]);

    if (operationsResult.error) {
      setError(operationsResult.error.message);
    } else {
      setOperations(
        (operationsResult.data ?? []).map((item: any) => {
          const relation = Array.isArray(item.encomendas) ? item.encomendas[0] : item.encomendas;
          const date = item.horario_previsto ? new Date(item.horario_previsto) : null;

          return {
            dbId: item.id,
            id: item.codigo,
            encomenda: relation?.codigo ?? "—",
            tipo: item.tipo,
            responsavel: item.responsavel_nome,
            veiculo: item.veiculo ?? "—",
            destino: item.destino ?? "—",
            horario: date
              ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : "—",
            status: item.status as OperationStatus,
          };
        })
      );
    }

    if (shipmentsResult.error) {
      setError(shipmentsResult.error.message);
    } else {
      setShipmentOptions(
        (shipmentsResult.data ?? []).map((item: any) => ({
          id: item.id,
          codigo: item.codigo,
          destino: item.destinatario_cidade ?? "—",
        }))
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const shipment = shipmentOptions.find((item) => item.id === formData.encomendaId);
    if (shipment && !formData.destino) {
      setFormData((prev) => ({ ...prev, destino: shipment.destino }));
    }
  }, [formData.encomendaId, shipmentOptions]);

  const filtered = useMemo(() => operations.filter((item) => item.tipo === tab), [operations, tab]);

  const handleInputChange = (field: keyof typeof initialForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateOperation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("operacoes_logisticas").insert({
      encomenda_id: formData.encomendaId,
      tipo: formData.tipo,
      responsavel_nome: formData.responsavel,
      veiculo: formData.veiculo || null,
      destino: formData.destino || null,
      horario_previsto: new Date(formData.horario).toISOString(),
      status: "pendente",
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setFormData(initialForm);
    setShowModal(false);
    setSuccess("Operação logística agendada com sucesso.");
    setSaving(false);
    await loadData();
  };

  const handleUpdateStatus = async (operation: OperationRow, nextStatus: OperationStatus) => {
    setError("");
    setSuccess("");

    const payload: { status: OperationStatus; concluido_em?: string } = { status: nextStatus };
    if (nextStatus === "concluido") {
      payload.concluido_em = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("operacoes_logisticas")
      .update(payload)
      .eq("id", operation.dbId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Operação ${operation.id} atualizada para ${statusMap[nextStatus].label.toLowerCase()}.`);
    await loadData();
  };

  const retiradasHoje = operations.filter((item) => item.tipo === "retirada").length;
  const entregasHoje = operations.filter((item) => item.tipo === "entrega").length;
  const pendentes = operations.filter((item) => item.status === "pendente").length;
  const concluidas = operations.filter((item) => item.status === "concluido").length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Retirada & Entrega
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Controle logístico de coletas e entregas
          </p>
        </div>
        <button className="btn btn-primary" id="btn-novo-logistica" onClick={() => setShowModal(true)}>
          + Agendar Operação
        </button>
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

      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { icon: "📥", label: "Retiradas Hoje", value: retiradasHoje, color: "indigo" },
          { icon: "📤", label: "Entregas Hoje", value: entregasHoje, color: "sky" },
          { icon: "⏳", label: "Pendentes", value: pendentes, color: "amber" },
          { icon: "✅", label: "Concluídas", value: concluidas, color: "emerald" },
        ].map((kpi, index) => (
          <div key={index} className="kpi-card">
            <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {(["retirada", "entrega"] as const).map((type) => (
          <button
            key={type}
            className="btn"
            style={{
              background: tab === type ? "rgba(255,255,255,0.08)" : "var(--bg-surface)",
              color: tab === type ? "var(--text-primary)" : "var(--text-muted)",
              border: `1px solid ${tab === type ? "rgba(255,255,255,0.14)" : "var(--border-subtle)"}`,
            }}
            onClick={() => setTab(type)}
          >
            {type === "retirada" ? "📥 Retiradas" : "📤 Entregas"}
          </button>
        ))}
      </div>

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
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Carregando operações...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Nenhuma operação cadastrada para esta aba.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const st = statusMap[item.status] ?? statusMap.pendente;

                  return (
                    <tr key={item.dbId}>
                      <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{item.id}</strong></td>
                      <td style={{ color: "var(--brand-primary-light)", fontSize: "12px", fontFamily: "monospace" }}>{item.encomenda}</td>
                      <td><strong>{item.responsavel}</strong></td>
                      <td style={{ fontSize: "12px" }}>{item.veiculo}</td>
                      <td style={{ fontSize: "12px" }}>{item.destino}</td>
                      <td style={{ fontSize: "12px" }}>{item.horario}</td>
                      <td><span className={`badge ${st.class}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void handleUpdateStatus(item, "concluido")} title="Concluir">
                            ✅
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void handleUpdateStatus(item, "em_andamento")} title="Iniciar">
                            ▶️
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void handleUpdateStatus(item, "cancelado")} title="Cancelar">
                            🗑️
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
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateOperation}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Agendar Operação</div>
                  <div className="modal-subtitle">Crie uma retirada ou entrega vinculada a uma encomenda</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Tipo *</label>
                    <select value={formData.tipo} onChange={(e) => handleInputChange("tipo", e.target.value)} required>
                      <option value="retirada">Retirada</option>
                      <option value="entrega">Entrega</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Encomenda *</label>
                    <select value={formData.encomendaId} onChange={(e) => handleInputChange("encomendaId", e.target.value)} required>
                      <option value="">Selecione...</option>
                      {shipmentOptions.map((shipment) => (
                        <option key={shipment.id} value={shipment.id}>{shipment.codigo}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Responsável *</label>
                    <input type="text" value={formData.responsavel} onChange={(e) => handleInputChange("responsavel", e.target.value)} placeholder="Nome do motorista/entregador" required />
                  </div>
                  <div className="input-group">
                    <label>Veículo</label>
                    <input type="text" value={formData.veiculo} onChange={(e) => handleInputChange("veiculo", e.target.value)} placeholder="ABC-1234" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Destino</label>
                    <input type="text" value={formData.destino} onChange={(e) => handleInputChange("destino", e.target.value)} placeholder="Cidade, UF" />
                  </div>
                  <div className="input-group">
                    <label>Data e horário *</label>
                    <input type="datetime-local" value={formData.horario} onChange={(e) => handleInputChange("horario", e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : "🚚 Agendar Operação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
