"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EmpresaOption = {
  id: string;
  nome: string;
};

type DriverCard = {
  dbId: string;
  name: string;
  phone: string;
  companyId: string;
  companyName: string;
  truckModel: string;
  truckPlate: string;
  active: boolean;
};

const initialForm = {
  name: "",
  phone: "",
  companyId: "",
  truckModel: "",
  truckPlate: "",
  active: true,
};

export default function MotoristasPage() {
  const supabase = createClient();
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [companies, setCompanies] = useState<EmpresaOption[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [editingDriver, setEditingDriver] = useState<DriverCard | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [driversResult, companiesResult] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("empresas").select("id, nome").order("nome"),
    ]);

    if (driversResult.error) {
      setError(driversResult.error.message);
      setLoading(false);
      return;
    }

    if (companiesResult.error) {
      setError(companiesResult.error.message);
      setLoading(false);
      return;
    }

    const companyMap = new Map<string, EmpresaOption>((companiesResult.data ?? []).map((item: any) => [item.id, item]));

    setCompanies((companiesResult.data ?? []) as EmpresaOption[]);
    setDrivers(
      ((driversResult.data ?? []) as any[]).map((item) => ({
        dbId: item.id,
        name: item.name,
        phone: item.phone ?? "—",
        companyId: item.company_id,
        companyName: companyMap.get(item.company_id)?.nome ?? "Empresa não encontrada",
        truckModel: item.truck_model ?? "—",
        truckPlate: item.truck_plate ?? "—",
        active: Boolean(item.active),
      })),
    );

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return drivers;

    return drivers.filter((driver) =>
      [driver.name, driver.phone, driver.companyName, driver.truckModel, driver.truckPlate]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [drivers, search]);

  const handleInputChange = (field: keyof typeof initialForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingDriver(null);
    setShowModal(false);
  };

  const handleCreateDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase.from("drivers").insert({
      company_id: formData.companyId,
      name: formData.name,
      phone: formData.phone || null,
      truck_model: formData.truckModel || null,
      truck_plate: formData.truckPlate || null,
      active: formData.active,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess("Motorista cadastrado com sucesso.");
    resetForm();
    await loadData();
  };

  const handleUpdateDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDriver) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("drivers")
      .update({
        company_id: formData.companyId,
        name: formData.name,
        phone: formData.phone || null,
        truck_model: formData.truckModel || null,
        truck_plate: formData.truckPlate || null,
        active: formData.active,
      })
      .eq("id", editingDriver.dbId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess("Motorista atualizado com sucesso.");
    resetForm();
    await loadData();
  };

  const handleEdit = (driver: DriverCard) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone === "—" ? "" : driver.phone,
      companyId: driver.companyId,
      truckModel: driver.truckModel === "—" ? "" : driver.truckModel,
      truckPlate: driver.truckPlate === "—" ? "" : driver.truckPlate,
      active: driver.active,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (driver: DriverCard) => {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase.from("drivers").update({ active: !driver.active }).eq("id", driver.dbId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Motorista ${driver.active ? "inativado" : "ativado"} com sucesso.`);
    await loadData();
  };

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((driver) => driver.active).length;
  const inactiveDrivers = totalDrivers - activeDrivers;
  const withPlate = drivers.filter((driver) => driver.truckPlate !== "—").length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Motoristas
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {totalDrivers} cadastrados · {activeDrivers} ativos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Cadastrar Motorista
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
          { label: "Ativos", value: activeDrivers, icon: "🚚", color: "sky" },
          { label: "Inativos", value: inactiveDrivers, icon: "⏸️", color: "amber" },
          { label: "Com placa", value: withPlate, icon: "🪪", color: "indigo" },
          { label: "Empresas", value: companies.length, icon: "🏢", color: "emerald" },
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

      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nome, empresa, telefone ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "420px", flex: 1 }}
          />
        </div>
      </div>

      <div className="grid-3" style={{ gap: "14px" }}>
        {loading ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)" }}>
            Carregando motoristas...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)" }}>
            Nenhum motorista encontrado.
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div key={driver.dbId} className="card" style={{ position: "relative" }}>
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
                    🚚
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>{driver.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{driver.companyName}</div>
                  </div>
                </div>
                <span className={`badge ${driver.active ? "badge-success" : "badge-muted"}`}>
                  {driver.active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>📱 Telefone</span>
                  <span style={{ color: "var(--text-secondary)" }}>{driver.phone}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>🚛 Caminhão</span>
                  <span style={{ color: "var(--text-secondary)" }}>{driver.truckModel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>🪪 Placa</span>
                  <strong style={{ color: "var(--text-primary)" }}>{driver.truckPlate}</strong>
                </div>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleEdit(driver)}>
                  ✏️ Editar
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => void handleToggleActive(driver)}>
                  {driver.active ? "⏸️ Inativar" : "▶️ Ativar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={editingDriver ? handleUpdateDriver : handleCreateDriver}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingDriver ? "Editar Motorista" : "Cadastrar Motorista"}</div>
                  <div className="modal-subtitle">{editingDriver ? `Atualize os dados de ${editingDriver.name}` : "Vincule o motorista a uma empresa"}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={resetForm}>✕</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Nome *</label>
                    <input type="text" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="Nome do motorista" required />
                  </div>
                  <div className="input-group">
                    <label>Telefone</label>
                    <input type="text" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>Empresa *</label>
                    <select value={formData.companyId} onChange={(e) => handleInputChange("companyId", e.target.value)} required>
                      <option value="">Selecione</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Modelo do Caminhão</label>
                    <input type="text" value={formData.truckModel} onChange={(e) => handleInputChange("truckModel", e.target.value)} placeholder="Ex.: Volvo FH" />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>Placa</label>
                    <input type="text" value={formData.truckPlate} onChange={(e) => handleInputChange("truckPlate", e.target.value.toUpperCase())} placeholder="ABC1D23" />
                  </div>
                  <div className="input-group">
                    <label>Status</label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "42px" }}>
                      <input type="checkbox" checked={formData.active} onChange={(e) => handleInputChange("active", e.target.checked)} />
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Motorista ativo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : editingDriver ? "💾 Salvar alterações" : "🚚 Cadastrar motorista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
