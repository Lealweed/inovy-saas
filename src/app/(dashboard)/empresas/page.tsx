"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL } from "@/lib/formatters";

type EmpresaCard = {
  dbId: string;
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  telefone: string;
  comissao: number;
  status: string;
  encomendas: number;
  receita: string;
};

const initialForm = {
  nome: "",
  cnpj: "",
  contato: "",
  telefone: "",
  email: "",
  comissao: "15",
};

export default function EmpresasPage() {
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [empresasResult, rankingResult] = await Promise.all([
      supabase.from("empresas").select("*").order("nome"),
      supabase.from("vw_ranking_empresas").select("*"),
    ]);

    if (empresasResult.error) {
      setError(empresasResult.error.message);
      setLoading(false);
      return;
    }

    const rankingById = new Map((rankingResult.data ?? []).map((item: any) => [item.id, item]));

    setEmpresas(
      (empresasResult.data ?? []).map((empresa: any) => {
        const stats = rankingById.get(empresa.id);

        return {
          dbId: empresa.id,
          id: empresa.codigo,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          contato: empresa.contato_nome,
          email: empresa.email,
          telefone: empresa.telefone ?? "—",
          comissao: Number(empresa.comissao_pct ?? 0),
          status: empresa.status,
          encomendas: Number(stats?.total_encomendas ?? 0),
          receita: formatCurrencyBRL(stats?.receita_total ?? 0),
        };
      })
    );

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return empresas.filter(
      (empresa) =>
        empresa.nome.toLowerCase().includes(search.toLowerCase()) ||
        empresa.cnpj.includes(search) ||
        empresa.contato.toLowerCase().includes(search.toLowerCase())
    );
  }, [empresas, search]);

  const handleInputChange = (field: keyof typeof initialForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("empresas").insert({
      nome: formData.nome,
      cnpj: formData.cnpj,
      contato_nome: formData.contato,
      telefone: formData.telefone || null,
      email: formData.email,
      comissao_pct: Number(formData.comissao || 15),
      status: "ativo",
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setFormData(initialForm);
    setShowModal(false);
    setSuccess("Empresa cadastrada com sucesso.");
    setSaving(false);
    await loadData();
  };

  const empresasAtivas = empresas.filter((empresa) => empresa.status === "ativo").length;
  const totalEncomendas = empresas.reduce((sum, empresa) => sum + empresa.encomendas, 0);
  const mediaComissao = empresas.length
    ? (empresas.reduce((sum, empresa) => sum + empresa.comissao, 0) / empresas.length).toFixed(1)
    : "0.0";
  const empresasInativas = empresas.filter((empresa) => empresa.status === "inativo").length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Empresas Parceiras
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {empresas.length} parceiros cadastrados · {empresasAtivas} ativos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-nova-empresa">
          + Cadastrar Empresa
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
          { label: "Parceiros Ativos", value: empresasAtivas, icon: "🏢", color: "indigo" },
          { label: "Total Encomendas", value: totalEncomendas, icon: "📦", color: "sky" },
          { label: "Comissão Média", value: `${mediaComissao}%`, icon: "💹", color: "emerald" },
          { label: "Inativos", value: empresasInativas, icon: "⚠️", color: "amber" },
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

      <div className="grid-3" style={{ gap: "14px" }}>
        {loading ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)" }}>
            Carregando empresas...
          </div>
        ) : filtered.map((emp) => (
          <div key={emp.dbId} className="card" style={{ position: "relative" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>📧 E-mail</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "11px", textAlign: "right" }}>{emp.email}</span>
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
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--text-primary)",
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateCompany}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Cadastrar Empresa Parceira</div>
                  <div className="modal-subtitle">Preencha os dados da empresa</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Nome da Empresa *</label>
                    <input type="text" value={formData.nome} onChange={(e) => handleInputChange("nome", e.target.value)} placeholder="Razão social" required />
                  </div>
                  <div className="input-group">
                    <label>CNPJ *</label>
                    <input type="text" value={formData.cnpj} onChange={(e) => handleInputChange("cnpj", e.target.value)} placeholder="00.000.000/0000-00" required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Nome do Contato *</label>
                    <input type="text" value={formData.contato} onChange={(e) => handleInputChange("contato", e.target.value)} placeholder="Responsável" required />
                  </div>
                  <div className="input-group">
                    <label>Telefone *</label>
                    <input type="text" value={formData.telefone} onChange={(e) => handleInputChange("telefone", e.target.value)} placeholder="(00) 00000-0000" required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>E-mail *</label>
                    <input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="email@empresa.com" required />
                  </div>
                  <div className="input-group">
                    <label>Comissão Inovy (%) *</label>
                    <input type="number" value={formData.comissao} onChange={(e) => handleInputChange("comissao", e.target.value)} min="0" max="100" required />
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : "🏢 Cadastrar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
