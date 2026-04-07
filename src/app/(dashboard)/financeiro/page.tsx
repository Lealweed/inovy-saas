"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL, formatDateBR, formatMonthYearBR } from "@/lib/formatters";

const statusMap = {
  pago: { label: "Pago", class: "badge-success" },
  pendente: { label: "Pendente", class: "badge-warning" },
  atrasado: { label: "Atrasado", class: "badge-danger" },
  cancelado: { label: "Cancelado", class: "badge-muted" },
} as const;

type RepasseStatus = keyof typeof statusMap;

type RepasseRow = {
  dbId: string;
  id: string;
  empresa: string;
  periodo: string;
  periodoKey: string;
  encomendas: number;
  bruto: string;
  brutoNumber: number;
  comissao: string;
  comissaoNumber: number;
  liquido: string;
  liquidoNumber: number;
  status: RepasseStatus;
  dataPag: string;
};

export default function FinanceiroPage() {
  const supabase = createClient();
  const [repasses, setRepasses] = useState<RepasseRow[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("vw_financeiro_resumo")
      .select("*")
      .order("referencia_mes", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((item: any) => ({
      dbId: item.id,
      id: item.codigo,
      empresa: item.empresa,
      periodo: formatMonthYearBR(item.referencia_mes),
      periodoKey: String(item.referencia_mes ?? "").slice(0, 7),
      encomendas: Number(item.total_encomendas ?? 0),
      bruto: formatCurrencyBRL(item.valor_bruto),
      brutoNumber: Number(item.valor_bruto ?? 0),
      comissao: formatCurrencyBRL(item.valor_comissao),
      comissaoNumber: Number(item.valor_comissao ?? 0),
      liquido: formatCurrencyBRL(item.valor_liquido),
      liquidoNumber: Number(item.valor_liquido ?? 0),
      status: item.status as RepasseStatus,
      dataPag: formatDateBR(item.data_pagamento),
    }));

    setRepasses(mapped);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const periodOptions = useMemo(() => {
    return Array.from(new Set(repasses.map((item) => item.periodoKey))).filter(Boolean);
  }, [repasses]);

  useEffect(() => {
    if (!selectedPeriod && periodOptions.length > 0) {
      setSelectedPeriod(periodOptions[0]);
    }
  }, [periodOptions, selectedPeriod]);

  const filtered = useMemo(() => {
    if (!selectedPeriod) return repasses;
    return repasses.filter((item) => item.periodoKey === selectedPeriod);
  }, [repasses, selectedPeriod]);

  const handleMarkAsPaid = async (repasse: RepasseRow) => {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("repasses")
      .update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) })
      .eq("id", repasse.dbId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Repasse ${repasse.id} marcado como pago.`);
    await loadData();
  };

  const handleProcessPending = async () => {
    const pendentesIds = filtered.filter((item) => item.status !== "pago").map((item) => item.dbId);
    if (pendentesIds.length === 0) {
      setSuccess("Não há repasses pendentes para processar neste período.");
      return;
    }

    const { error: updateError } = await supabase
      .from("repasses")
      .update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) })
      .in("id", pendentesIds);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Repasses pendentes processados com sucesso.");
    await loadData();
  };

  const pendentes = filtered.filter((item) => item.status !== "pago");
  const totalPendente = pendentes.length;
  const valorPendente = formatCurrencyBRL(pendentes.reduce((sum, item) => sum + item.liquidoNumber, 0));
  const valorPago = formatCurrencyBRL(filtered.filter((item) => item.status === "pago").reduce((sum, item) => sum + item.liquidoNumber, 0));
  const valorAtrasado = formatCurrencyBRL(filtered.filter((item) => item.status === "atrasado").reduce((sum, item) => sum + item.liquidoNumber, 0));
  const totalComissao = formatCurrencyBRL(filtered.reduce((sum, item) => sum + item.comissaoNumber, 0));
  const totalBruto = formatCurrencyBRL(filtered.reduce((sum, item) => sum + item.brutoNumber, 0));
  const totalLiquido = formatCurrencyBRL(filtered.reduce((sum, item) => sum + item.liquidoNumber, 0));

  return (
    <div className="animate-fade-in">
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
          <button className="btn btn-primary" id="btn-processar-repasse" onClick={() => void handleProcessPending()}>💸 Processar Repasses</button>
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

      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { label: "Repasses Pagos (mês)", value: valorPago, icon: "✅", color: "emerald", sub: `${filtered.filter((item) => item.status === "pago").length} empresas` },
          { label: "Pendentes de Pagamento", value: valorPendente, icon: "⏳", color: "amber", sub: `${totalPendente} empresas` },
          { label: "Atrasados", value: valorAtrasado, icon: "⚠️", color: "rose", sub: `${filtered.filter((item) => item.status === "atrasado").length} empresas` },
          { label: "Receita Inovy (comissões)", value: totalComissao, icon: "💹", color: "indigo", sub: "este período" },
        ].map((kpi, index) => (
          <div key={index} className="kpi-card">
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

      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {periodOptions.map((periodo) => (
              <button
                key={periodo}
                className="btn btn-sm"
                style={{
                  background: periodo === selectedPeriod ? "rgba(255,255,255,0.08)" : "var(--bg-elevated)",
                  color: periodo === selectedPeriod ? "var(--text-primary)" : "var(--text-muted)",
                  border: `1px solid ${periodo === selectedPeriod ? "rgba(255,255,255,0.14)" : "var(--border-subtle)"}`,
                }}
                onClick={() => setSelectedPeriod(periodo)}
              >
                {formatMonthYearBR(`${periodo}-01`)}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)" }}>
            Período de referência: <strong style={{ color: "var(--text-secondary)" }}>{selectedPeriod ? formatMonthYearBR(`${selectedPeriod}-01`) : "Todos"}</strong>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="card-title">Relatório de Repasses — {selectedPeriod ? formatMonthYearBR(`${selectedPeriod}-01`) : "Geral"}</div>
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
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Carregando repasses...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Nenhum repasse encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                filtered.map((rep) => {
                  const st = statusMap[rep.status] ?? statusMap.pendente;

                  return (
                    <tr key={rep.dbId}>
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
                            <button
                              className="btn btn-sm"
                              style={{
                                background: "rgba(16,185,129,0.1)",
                                color: "#34d399",
                                border: "1px solid rgba(16,185,129,0.2)",
                                fontSize: "11px",
                              }}
                              onClick={() => void handleMarkAsPaid(rep)}
                            >
                              💸 Pagar
                            </button>
                          )}
                          <button className="btn btn-ghost btn-icon btn-sm">📋</button>
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
          padding: "16px 20px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "32px",
          background: "var(--bg-elevated)",
          flexWrap: "wrap",
        }}>
          {[
            { label: "Total Bruto", value: totalBruto, color: "var(--text-primary)" },
            { label: "Total Comissões Inovy", value: totalComissao, color: "var(--text-primary)" },
            { label: "Total Repasses", value: totalLiquido, color: "var(--brand-success)" },
          ].map((total, index) => (
            <div key={index}>
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
