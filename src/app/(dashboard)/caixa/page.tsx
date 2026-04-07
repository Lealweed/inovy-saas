"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL } from "@/lib/formatters";

type PaymentMethod = "dinheiro" | "debito" | "credito" | "pix" | "link_pagamento";

type PaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
};

const paymentOptions: Array<{ value: PaymentMethod; label: string; icon: string }> = [
  { value: "dinheiro", label: "Dinheiro", icon: "💵" },
  { value: "debito", label: "Débito", icon: "💳" },
  { value: "credito", label: "Crédito", icon: "💳" },
  { value: "pix", label: "PIX", icon: "📲" },
  { value: "link_pagamento", label: "Link de Pagamento", icon: "🔗" },
];

type SaleStatus = "pago" | "cancelado" | "estornado";

const saleStatusMap: Record<SaleStatus, { label: string; className: string }> = {
  pago: { label: "Pago", className: "badge-success" },
  cancelado: { label: "Cancelado", className: "badge-muted" },
  estornado: { label: "Estornado", className: "badge-danger" },
};

const initialSaleForm = {
  customerName: "",
  customerDocument: "",
  description: "",
  category: "balcao",
  quantity: "1",
  unitPrice: "0",
  discount: "0",
  surcharge: "0",
  notes: "",
};

function createPaymentLine(method: PaymentMethod = "pix"): PaymentLine {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method,
    amount: "",
    reference: "",
  };
}

function toNumber(value: string | number | null | undefined) {
  const amount = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDateTimeBR(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function CaixaPage() {
  const supabase = createClient();
  const [openSession, setOpenSession] = useState<any | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [operatorHistory, setOperatorHistory] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [openingSession, setOpeningSession] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openingValue, setOpeningValue] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingValue, setClosingValue] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [saleForm, setSaleForm] = useState(initialSaleForm);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([createPaymentLine("pix")]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user ? { id: user.id, email: user.email ?? "operador@inovy.com" } : null);

    const historyQuery = user?.id
      ? supabase
          .from("vw_caixa_historico_operador")
          .select("*")
          .eq("operador_id", user.id)
          .order("aberto_em", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [], error: null });

    const [sessionResult, salesResult, paymentsResult, historyResult] = await Promise.all([
      supabase
        .from("caixa_sessoes")
        .select("*")
        .eq("status", "aberto")
        .order("aberto_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("vw_caixa_vendas_lista")
        .select("*")
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("caixa_pagamentos")
        .select("forma_pagamento, valor, troco, recebido_em, caixa_vendas!inner(status)")
        .eq("caixa_vendas.status", "pago")
        .gte("recebido_em", todayIso)
        .order("recebido_em", { ascending: false }),
      historyQuery,
    ]);

    const firstError = sessionResult.error ?? salesResult.error ?? paymentsResult.error ?? historyResult.error;

    if (firstError) {
      const message = firstError.message ?? "Erro ao carregar o módulo de caixa.";
      const isMissingStructure =
        message.toLowerCase().includes("caixa") ||
        message.toLowerCase().includes("does not exist") ||
        message.toLowerCase().includes("could not find") ||
        String((firstError as any).code ?? "").includes("42P01");

      setError(
        isMissingStructure
          ? "O módulo de caixa completo ainda não foi criado no banco. Rode o SQL `supabase/migrations/20260407_add_caixa_module.sql` no Supabase SQL Editor."
          : message
      );
      setLoading(false);
      return;
    }

    setOpenSession(sessionResult.data ?? null);
    setSales(salesResult.data ?? []);
    setPayments(paymentsResult.data ?? []);
    setOperatorHistory(historyResult.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saleTotal = useMemo(() => {
    const subtotal = toNumber(saleForm.quantity) * toNumber(saleForm.unitPrice);
    return Math.max(subtotal + toNumber(saleForm.surcharge) - toNumber(saleForm.discount), 0);
  }, [saleForm]);

  const paymentTotal = useMemo(() => {
    return paymentLines.reduce((sum, line) => sum + toNumber(line.amount), 0);
  }, [paymentLines]);

  const difference = useMemo(() => {
    return Math.round((saleTotal - paymentTotal) * 100) / 100;
  }, [paymentTotal, saleTotal]);

  const totalsByMethod = useMemo(() => {
    return paymentOptions.reduce((acc, option) => {
      acc[option.value] = payments
        .filter((payment) => payment.forma_pagamento === option.value)
        .reduce((sum, payment) => sum + toNumber(payment.valor) - toNumber(payment.troco), 0);
      return acc;
    }, {} as Record<PaymentMethod, number>);
  }, [payments]);

  const paidSales = sales.filter((sale) => sale.status === "pago");
  const refundedSales = sales.filter((sale) => sale.status === "estornado");
  const totalSales = paidSales.reduce((sum, sale) => sum + toNumber(sale.valor_total), 0);
  const ticketMedio = paidSales.length ? totalSales / paidSales.length : 0;
  const operatorTotal = operatorHistory.reduce((sum, session) => sum + toNumber(session.total_pago), 0);

  const resetSaleForm = () => {
    setSaleForm(initialSaleForm);
    setPaymentLines([createPaymentLine("pix")]);
  };

  const handleSaleFieldChange = (field: keyof typeof initialSaleForm, value: string) => {
    setSaleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (lineId: string, field: keyof PaymentLine, value: string) => {
    setPaymentLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line))
    );
  };

  const handleAddPaymentLine = () => {
    setPaymentLines((prev) => [...prev, createPaymentLine("dinheiro")]);
  };

  const handleRemovePaymentLine = (lineId: string) => {
    setPaymentLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const handleOpenSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpeningSession(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("caixa_sessoes").insert({
      operador_id: user?.id ?? null,
      valor_abertura: toNumber(openingValue),
      observacoes: openingNotes || null,
      status: "aberto",
    });

    if (insertError) {
      setError(insertError.message);
      setOpeningSession(false);
      return;
    }

    setSuccess("Caixa aberto com sucesso.");
    setOpeningValue("0");
    setOpeningNotes("");
    setOpeningSession(false);
    await loadData();
  };

  const handleCloseSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!openSession) {
      setError("Nenhum caixa aberto para fechamento.");
      return;
    }

    setClosingSession(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("caixa_sessoes")
      .update({
        status: "fechado",
        valor_fechamento_informado: toNumber(closingValue || totalSales),
        observacoes: closingNotes || openSession.observacoes || null,
        fechado_em: new Date().toISOString(),
      })
      .eq("id", openSession.id);

    if (updateError) {
      setError(updateError.message);
      setClosingSession(false);
      return;
    }

    setSuccess("Caixa fechado com sucesso.");
    setClosingValue("");
    setClosingNotes("");
    setClosingSession(false);
    await loadData();
  };

  const handleCreateSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingSale(true);
    setError("");
    setSuccess("");

    if (!openSession) {
      setError("Abra um caixa antes de registrar atendimentos no balcão.");
      setSubmittingSale(false);
      return;
    }

    if (!saleForm.description.trim()) {
      setError("Informe a descrição do atendimento ou serviço.");
      setSubmittingSale(false);
      return;
    }

    const filledPayments = paymentLines.filter((line) => toNumber(line.amount) > 0);
    if (filledPayments.length === 0) {
      setError("Informe pelo menos uma forma de pagamento.");
      setSubmittingSale(false);
      return;
    }

    if (Math.abs(difference) > 0.01) {
      setError("A soma dos pagamentos precisa fechar exatamente o valor da venda.");
      setSubmittingSale(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: sale, error: saleError } = await supabase
      .from("caixa_vendas")
      .insert({
        sessao_id: openSession.id,
        cliente_nome: saleForm.customerName || null,
        cliente_documento: saleForm.customerDocument || null,
        descricao: saleForm.description,
        categoria: saleForm.category,
        quantidade: Math.max(1, Math.round(toNumber(saleForm.quantity))),
        valor_unitario: toNumber(saleForm.unitPrice),
        desconto: toNumber(saleForm.discount),
        acrescimo: toNumber(saleForm.surcharge),
        observacoes: saleForm.notes || null,
        created_by: user?.id ?? null,
      })
      .select("id, codigo, valor_total")
      .single();

    if (saleError || !sale) {
      setError(saleError?.message ?? "Não foi possível registrar a venda.");
      setSubmittingSale(false);
      return;
    }

    const paymentsPayload = filledPayments.map((line) => ({
      venda_id: sale.id,
      forma_pagamento: line.method,
      valor: toNumber(line.amount),
      troco: 0,
      referencia_externa: line.reference || null,
      observacoes: saleForm.notes || null,
    }));

    const { error: paymentsError } = await supabase.from("caixa_pagamentos").insert(paymentsPayload);

    if (paymentsError) {
      await supabase.from("caixa_vendas").delete().eq("id", sale.id);
      setError(paymentsError.message);
      setSubmittingSale(false);
      return;
    }

    resetSaleForm();
    setSuccess(`Venda ${sale.codigo} registrada com sucesso.`);
    setSubmittingSale(false);
    await loadData();
  };

  const handlePrintReceipt = (sale: any) => {
    if (typeof window === "undefined") return;

    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) {
      setError("Permita pop-ups no navegador para imprimir o comprovante.");
      return;
    }

    const methods = String(sale.formas_pagamento ?? "—").replaceAll("_", " ");
    const operatorName = sale.operador_nome ?? currentUser?.email ?? "Operador";
    const reference = sale.referencia_pagamento ? `<p><strong>Referência:</strong> ${escapeHtml(String(sale.referencia_pagamento))}</p>` : "";
    const notes = sale.observacoes ? `<p><strong>Obs.:</strong> ${escapeHtml(String(sale.observacoes))}</p>` : "";

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Comprovante ${escapeHtml(String(sale.codigo))}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .box { max-width: 360px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 20px; }
            h1 { font-size: 18px; margin: 0 0 6px; }
            p { font-size: 12px; margin: 6px 0; }
            .total { font-size: 18px; font-weight: bold; margin-top: 12px; }
            .divider { border-top: 1px dashed #aaa; margin: 12px 0; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Inovy • Comprovante</h1>
            <p>${formatDateTimeBR(sale.created_at)}</p>
            <div class="divider"></div>
            <p><strong>Código:</strong> ${escapeHtml(String(sale.codigo))}</p>
            <p><strong>Cliente:</strong> ${escapeHtml(String(sale.cliente_nome ?? "Cliente balcão"))}</p>
            <p><strong>Serviço:</strong> ${escapeHtml(String(sale.descricao ?? "Atendimento balcão"))}</p>
            <p><strong>Pagamento:</strong> ${escapeHtml(methods)}</p>
            <p><strong>Operador:</strong> ${escapeHtml(String(operatorName))}</p>
            ${reference}
            ${notes}
            <div class="divider"></div>
            <p class="total">Total: ${formatCurrencyBRL(sale.valor_total)}</p>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const handleRefundSale = async (sale: any) => {
    if (sale.status !== "pago") {
      setError("Apenas vendas pagas podem ser estornadas.");
      return;
    }

    const reason = window.prompt(`Informe o motivo do estorno da venda ${sale.codigo}:`, "");
    if (reason === null) return;

    if (!reason.trim()) {
      setError("Informe o motivo do estorno para continuar.");
      return;
    }

    setError("");
    setSuccess("");

    const refundNote = `[ESTORNO ${new Date().toLocaleString("pt-BR")}]: ${reason.trim()}`;
    const nextObservation = [sale.observacoes, refundNote].filter(Boolean).join("\n");

    const { error: updateError } = await supabase
      .from("caixa_vendas")
      .update({
        status: "estornado",
        observacoes: nextObservation,
      })
      .eq("id", sale.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Venda ${sale.codigo} estornada com sucesso.`);
    await loadData();
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Caixa de Balcão
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Receba pagamentos em dinheiro, débito, crédito, PIX e link de pagamento.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span className={`badge ${openSession ? "badge-success" : "badge-muted"}`}>
            {openSession ? `Caixa ${openSession.codigo} aberto` : "Nenhum caixa aberto"}
          </span>
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
          { label: "Vendas Pagas", value: paidSales.length, icon: "🧾", color: "indigo", sub: "atendimentos concluídos" },
          { label: "Total Recebido", value: formatCurrencyBRL(totalSales), icon: "💰", color: "emerald", sub: "somatório do dia" },
          { label: "Estornos Hoje", value: refundedSales.length, icon: "↩️", color: "rose", sub: "vendas revertidas" },
          { label: "Ticket Médio", value: formatCurrencyBRL(ticketMedio), icon: "📈", color: "amber", sub: "por atendimento" },
        ].map((item, index) => (
          <div key={index} className="kpi-card">
            <div className={`kpi-icon ${item.color}`}>{item.icon}</div>
            <div>
              <div className="kpi-value">{item.value}</div>
              <div className="kpi-label">{item.label}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Novo Atendimento de Caixa</div>
                <div className="card-subtitle">Lance cobranças rápidas para clientes no balcão</div>
              </div>
            </div>

            <form onSubmit={handleCreateSale} style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
              <div className="grid-2">
                <div className="input-group">
                  <label>Nome do Cliente</label>
                  <input
                    type="text"
                    placeholder="Cliente balcão"
                    value={saleForm.customerName}
                    onChange={(e) => handleSaleFieldChange("customerName", e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Documento</label>
                  <input
                    type="text"
                    placeholder="CPF/CNPJ (opcional)"
                    value={saleForm.customerDocument}
                    onChange={(e) => handleSaleFieldChange("customerDocument", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Serviço / Cobrança *</label>
                  <input
                    type="text"
                    placeholder="Ex.: envio expresso, embalagem, coleta"
                    value={saleForm.description}
                    onChange={(e) => handleSaleFieldChange("description", e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Categoria</label>
                  <select value={saleForm.category} onChange={(e) => handleSaleFieldChange("category", e.target.value)}>
                    <option value="balcao">Balcão</option>
                    <option value="frete">Frete</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="servico">Serviço</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid-4">
                <div className="input-group">
                  <label>Qtd.</label>
                  <input type="number" min="1" value={saleForm.quantity} onChange={(e) => handleSaleFieldChange("quantity", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Valor Unitário</label>
                  <input type="number" min="0" step="0.01" value={saleForm.unitPrice} onChange={(e) => handleSaleFieldChange("unitPrice", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Desconto</label>
                  <input type="number" min="0" step="0.01" value={saleForm.discount} onChange={(e) => handleSaleFieldChange("discount", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Acréscimo</label>
                  <input type="number" min="0" step="0.01" value={saleForm.surcharge} onChange={(e) => handleSaleFieldChange("surcharge", e.target.value)} />
                </div>
              </div>

              <div className="card" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Formas de pagamento</div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPaymentLine}>
                    + Adicionar forma
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {paymentLines.map((line, index) => (
                    <div key={line.id} className="grid-3" style={{ alignItems: "end" }}>
                      <div className="input-group">
                        <label>Método #{index + 1}</label>
                        <select value={line.method} onChange={(e) => handlePaymentChange(line.id, "method", e.target.value)}>
                          {paymentOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.icon} {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Valor</label>
                        <input type="number" min="0" step="0.01" value={line.amount} onChange={(e) => handlePaymentChange(line.id, "amount", e.target.value)} />
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "end" }}>
                        <div className="input-group" style={{ flex: 1 }}>
                          <label>Ref./Link</label>
                          <input type="text" placeholder="Código / URL" value={line.reference} onChange={(e) => handlePaymentChange(line.id, "reference", e.target.value)} />
                        </div>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => handleRemovePaymentLine(line.id)} title="Remover">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Observações</label>
                  <textarea
                    rows={3}
                    style={{ resize: "none" }}
                    placeholder="Ex.: pagamento aprovado via link, atendimento VIP, observações do balcão"
                    value={saleForm.notes}
                    onChange={(e) => handleSaleFieldChange("notes", e.target.value)}
                  />
                </div>
                <div className="card" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                      <strong>{formatCurrencyBRL(toNumber(saleForm.quantity) * toNumber(saleForm.unitPrice))}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Desconto</span>
                      <strong>- {formatCurrencyBRL(toNumber(saleForm.discount))}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Acréscimo</span>
                      <strong>+ {formatCurrencyBRL(toNumber(saleForm.surcharge))}</strong>
                    </div>
                    <div className="divider" />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Total da Venda</span>
                      <strong style={{ color: "var(--brand-success)" }}>{formatCurrencyBRL(saleTotal)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Total dos pagamentos</span>
                      <strong>{formatCurrencyBRL(paymentTotal)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: Math.abs(difference) <= 0.01 ? "#86efac" : "#fca5a5" }}>
                      <span>Diferença</span>
                      <strong>{formatCurrencyBRL(difference)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={resetSaleForm}>
                  Limpar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingSale || loading || !openSession}>
                  {submittingSale ? "Registrando..." : "💸 Registrar cobrança"}
                </button>
              </div>
            </form>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="card-title">Movimentações de Hoje</div>
              <div className="card-subtitle">Últimos recebimentos registrados no caixa</div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        Carregando caixa...
                      </td>
                    </tr>
                  ) : sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        Nenhuma venda lançada hoje.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => {
                      const saleStatus = saleStatusMap[(sale.status as SaleStatus) ?? "pago"] ?? saleStatusMap.pago;

                      return (
                        <tr key={sale.id}>
                          <td>
                            <strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{sale.codigo}</strong>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{sale.sessao_codigo}</div>
                          </td>
                          <td style={{ fontSize: "12px" }}>{sale.cliente_nome ?? "Cliente balcão"}</td>
                          <td>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{sale.descricao}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize" }}>{sale.categoria}</div>
                          </td>
                          <td style={{ fontSize: "11px", textTransform: "capitalize" }}>
                            {(sale.formas_pagamento ?? "—").replaceAll("_", " ")}
                            {sale.referencia_pagamento && (
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                                Ref.: {sale.referencia_pagamento}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${saleStatus.className}`}>{saleStatus.label}</span>
                          </td>
                          <td>
                            <strong style={{ color: sale.status === "estornado" ? "#fca5a5" : "var(--brand-success)", fontSize: "12px" }}>
                              {formatCurrencyBRL(sale.valor_total)}
                            </strong>
                          </td>
                          <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTimeBR(sale.created_at)}</td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handlePrintReceipt(sale)} title="Imprimir comprovante">
                                🖨️
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => void handleRefundSale(sale)}
                                title="Estornar venda"
                                disabled={sale.status !== "pago"}
                                style={{ opacity: sale.status === "pago" ? 1 : 0.45 }}
                              >
                                ↩️
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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Controle do Caixa</div>
                <div className="card-subtitle">Abertura, fechamento e conferência</div>
              </div>
            </div>

            {!openSession ? (
              <form onSubmit={handleOpenSession} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="input-group">
                  <label>Valor de abertura</label>
                  <input type="number" min="0" step="0.01" value={openingValue} onChange={(e) => setOpeningValue(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Observações</label>
                  <textarea rows={3} style={{ resize: "none" }} value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} placeholder="Ex.: troco inicial disponível no balcão" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={openingSession}>
                  {openingSession ? "Abrindo..." : "🔓 Abrir caixa"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCloseSession} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Sessão</span>
                    <strong>{openSession.codigo}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Abertura</span>
                    <strong>{formatCurrencyBRL(openSession.valor_abertura)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Aberto em</span>
                    <strong>{formatDateTimeBR(openSession.aberto_em)}</strong>
                  </div>
                </div>
                <div className="divider" />
                <div className="input-group">
                  <label>Valor conferido no fechamento</label>
                  <input type="number" min="0" step="0.01" value={closingValue} onChange={(e) => setClosingValue(e.target.value)} placeholder={String(totalSales)} />
                </div>
                <div className="input-group">
                  <label>Observações do fechamento</label>
                  <textarea rows={3} style={{ resize: "none" }} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Ex.: conferência ok, pendência de comprovante, etc." />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={closingSession}>
                  {closingSession ? "Fechando..." : "🔒 Fechar caixa"}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Resumo por Forma de Pagamento</div>
                <div className="card-subtitle">Totais do dia para conferência rápida</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {paymentOptions.map((option) => (
                <div key={option.value} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    {option.icon} {option.label}
                  </span>
                  <strong>{formatCurrencyBRL(totalsByMethod[option.value] ?? 0)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Histórico do Operador</div>
                <div className="card-subtitle">Sessões recentes de {currentUser?.email ?? "operador atual"}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Sessões registradas</span>
                <strong>{operatorHistory.length}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Total movimentado</span>
                <strong>{formatCurrencyBRL(operatorTotal)}</strong>
              </div>
              <div className="divider" />
              {operatorHistory.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Ainda não há sessões registradas para este operador.
                </div>
              ) : (
                operatorHistory.map((session) => (
                  <div key={session.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "10px", background: "var(--bg-elevated)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "12px" }}>{session.codigo}</strong>
                      <span className={`badge ${session.status === "aberto" ? "badge-success" : "badge-muted"}`}>
                        {session.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {formatDateTimeBR(session.aberto_em)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Atendimentos: {session.total_atendimentos}</span>
                      <strong>{formatCurrencyBRL(session.total_pago)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Fluxo recomendado</div>
                <div className="card-subtitle">Operação diária do balcão</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <div>1. Abra o caixa com o valor inicial disponível.</div>
              <div>2. Registre cada atendimento com a forma de pagamento recebida.</div>
              <div>3. Imprima o comprovante para entregar ao cliente no balcão.</div>
              <div>4. Use estorno com motivo sempre que precisar reverter uma cobrança.</div>
              <div>5. Feche o caixa no final do turno com a conferência do valor total.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
