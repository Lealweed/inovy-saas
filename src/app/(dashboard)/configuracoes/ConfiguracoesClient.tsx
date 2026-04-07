"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SettingsState = {
  company_name: string;
  cnpj: string;
  phone: string;
  email: string;
  default_commission_pct: number;
  repasse_prazo_dias: number;
  fechamento_dia: string;
  notify_new_shipments: boolean;
  notify_pickup_delay: boolean;
  notify_overdue_repasses: boolean;
  notify_new_partners: boolean;
  notify_daily_report: boolean;
};

const defaultSettings: SettingsState = {
  company_name: "Inovy Logística Ltda.",
  cnpj: "",
  phone: "",
  email: "",
  default_commission_pct: 15,
  repasse_prazo_dias: 30,
  fechamento_dia: "Último dia do mês",
  notify_new_shipments: true,
  notify_pickup_delay: true,
  notify_overdue_repasses: true,
  notify_new_partners: false,
  notify_daily_report: true,
};

export default function ConfiguracoesClient() {
  const supabase = createClient();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("system_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        company_name: data.company_name ?? defaultSettings.company_name,
        cnpj: data.cnpj ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        default_commission_pct: Number(data.default_commission_pct ?? 15),
        repasse_prazo_dias: Number(data.repasse_prazo_dias ?? 30),
        fechamento_dia: data.fechamento_dia ?? defaultSettings.fechamento_dia,
        notify_new_shipments: Boolean(data.notify_new_shipments),
        notify_pickup_delay: Boolean(data.notify_pickup_delay),
        notify_overdue_repasses: Boolean(data.notify_overdue_repasses),
        notify_new_partners: Boolean(data.notify_new_partners),
        notify_daily_report: Boolean(data.notify_daily_report),
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleFieldChange = (field: keyof SettingsState, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async (message: string) => {
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: upsertError } = await supabase.from("system_settings").upsert({
      id: true,
      ...settings,
    });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSuccess(message);
    setSaving(false);
  };

  const handlePasswordUpdate = async () => {
    setError("");
    setSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação da senha não confere.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Senha atualizada com sucesso.");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
          Configurações do Sistema
        </h2>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
          Gerencie preferências e configurações globais da plataforma
        </p>
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

      <div className="grid-2" style={{ gap: "20px", opacity: loading ? 0.7 : 1 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏢 Perfil da Empresa</div>
              <div className="card-subtitle">Dados cadastrais do sistema</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="input-group">
              <label>Nome da Empresa</label>
              <input type="text" value={settings.company_name} onChange={(e) => handleFieldChange("company_name", e.target.value)} />
            </div>
            <div className="input-group">
              <label>CNPJ</label>
              <input type="text" value={settings.cnpj} onChange={(e) => handleFieldChange("cnpj", e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Telefone</label>
                <input type="text" value={settings.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" value={settings.email} onChange={(e) => handleFieldChange("email", e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => void saveSettings("Perfil da empresa atualizado com sucesso.")} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">💹 Comissões Padrão</div>
              <div className="card-subtitle">Taxas aplicadas nos repasses</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="input-group">
              <label>Comissão Padrão Inovy (%)</label>
              <input type="number" value={settings.default_commission_pct} min="0" max="100" onChange={(e) => handleFieldChange("default_commission_pct", Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Prazo de Repasse (dias)</label>
              <input type="number" value={settings.repasse_prazo_dias} min="1" onChange={(e) => handleFieldChange("repasse_prazo_dias", Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Dia do Fechamento</label>
              <select value={settings.fechamento_dia} onChange={(e) => handleFieldChange("fechamento_dia", e.target.value)}>
                <option>Último dia do mês</option>
                <option>Dia 15</option>
                <option>Dia 20</option>
                <option>Dia 25</option>
              </select>
            </div>
            <div style={{
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}>
              ℹ️ A comissão padrão pode ser sobrescrita por empresa parceira no módulo de Empresas.
            </div>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => void saveSettings("Regras financeiras atualizadas com sucesso.")} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🔔 Notificações</div>
              <div className="card-subtitle">Configure alertas e avisos</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { key: "notify_new_shipments", label: "Novas encomendas recebidas" },
              { key: "notify_pickup_delay", label: "Encomendas aguardando retirada > 24h" },
              { key: "notify_overdue_repasses", label: "Repasses vencidos" },
              { key: "notify_new_partners", label: "Novos parceiros cadastrados" },
              { key: "notify_daily_report", label: "Relatório diário automático" },
            ].map((notif) => {
              const isActive = settings[notif.key as keyof SettingsState] as boolean;

              return (
                <div key={notif.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{notif.label}</span>
                  <button
                    type="button"
                    onClick={() => handleFieldChange(notif.key as keyof SettingsState, !isActive)}
                    style={{
                      width: "36px",
                      height: "20px",
                      background: isActive ? "var(--brand-primary)" : "var(--bg-overlay)",
                      borderRadius: "10px",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      flexShrink: 0,
                      border: "none",
                    }}
                  >
                    <span style={{
                      width: "14px",
                      height: "14px",
                      background: "white",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "3px",
                      left: isActive ? "19px" : "3px",
                      transition: "left 0.2s",
                      display: "block",
                    }} />
                  </button>
                </div>
              )
            })}
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => void saveSettings("Preferências de notificação atualizadas.")} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Preferências"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🔐 Segurança</div>
              <div className="card-subtitle">Configurações de acesso e autenticação</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="input-group">
              <label>Senha Atual</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Nova Senha</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Confirmar Nova Senha</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Autenticação em 2 fatores
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Recomendado para maior segurança</div>
              </div>
              <span className="badge badge-muted">Em breve</span>
            </div>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => void handlePasswordUpdate()}>
              Atualizar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
