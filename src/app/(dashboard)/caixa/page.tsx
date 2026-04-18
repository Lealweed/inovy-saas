"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL } from "@/lib/formatters";

// ============================================================================
// TIPOS
// ============================================================================

type PaymentMethod = "dinheiro" | "debito" | "credito" | "pix" | "link_pagamento";
type SaleStatus = "pago" | "cancelado" | "estornado";
type MovimentacaoTipo = "sangria" | "reforco";

interface CaixaSessao {
  id: string;
  codigo: string;
  operador_id: string | null;
  status: "aberto" | "fechado";
  valor_abertura: number;
  valor_fechamento_informado: number | null;
  observacoes: string | null;
  aberto_em: string;
  fechado_em: string | null;
  created_at: string;
  updated_at: string;
}

interface CaixaVendaLista {
  id: string;
  codigo: string;
  sessao_id: string;
  sessao_codigo: string;
  cliente_nome: string | null;
  cliente_documento: string | null;
  descricao: string;
  categoria: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  acrescimo: number;
  valor_total: number;
  status: SaleStatus;
  observacoes: string | null;
  operador_nome: string;
  total_recebido: number;
  formas_pagamento: string;
  referencia_pagamento: string | null;
  created_by: string | null;
  created_at: string;
}

interface CaixaMovimentacao {
  id: string;
  sessao_id: string;
  tipo: MovimentacaoTipo;
  valor: number;
  motivo: string;
  operador_id: string | null;
  created_at: string;
}

interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
}

interface SessionSummary {
  totalVendas: number;
  totalPago: number;
  totalEstornado: number;
  qtdPago: number;
  qtdEstornado: number;
  totalSangria: number;
  totalReforco: number;
  dinheiro: number;
  debito: number;
  credito: number;
  pix: number;
  link_pagamento: number;
}

interface CaixaEmpresaOption {
  id: string;
  nome: string;
}

interface CaixaDriverOption {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  truck_plate: string | null;
  active: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const paymentOptions: Array<{ value: PaymentMethod; label: string; icon: string }> = [
  { value: "dinheiro", label: "Dinheiro", icon: "💵" },
  { value: "debito", label: "Débito", icon: "💳" },
  { value: "credito", label: "Crédito", icon: "💳" },
  { value: "pix", label: "PIX", icon: "📲" },
  { value: "link_pagamento", label: "Link de Pagamento", icon: "🔗" },
];

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

const initialDriverRepasseForm = {
  companyId: "",
  driverId: "",
  amount: "",
  paymentMethod: "pix" as PaymentMethod,
  notes: "",
};

const emptySessionSummary: SessionSummary = {
  totalVendas: 0, totalPago: 0, totalEstornado: 0,
  qtdPago: 0, qtdEstornado: 0,
  totalSangria: 0, totalReforco: 0,
  dinheiro: 0, debito: 0, credito: 0, pix: 0, link_pagamento: 0,
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function createPaymentLine(method: PaymentMethod = "pix"): PaymentLine {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, method, amount: "", reference: "" };
}

function toNumber(value: string | number | null | undefined) {
  const amount = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDateTimeBR(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTodayISOLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CaixaPage() {
  const supabase = createClient();

  // Estado principal
  const [openSession, setOpenSession] = useState<CaixaSessao | null>(null);
  const [sales, setSales] = useState<CaixaVendaLista[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
  const [dailySummary, setDailySummary] = useState<Record<string, number>>({});
  const [operatorHistory, setOperatorHistory] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>(emptySessionSummary);
  const [companies, setCompanies] = useState<CaixaEmpresaOption[]>([]);
  const [drivers, setDrivers] = useState<CaixaDriverOption[]>([]);

  // UI
  const messageRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [openingSession, setOpeningSession] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [showClosingConfirm, setShowClosingConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formulários
  const [openingValue, setOpeningValue] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingValue, setClosingValue] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [saleForm, setSaleForm] = useState(initialSaleForm);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([createPaymentLine("pix")]);
  const [repasseForm, setRepasseForm] = useState(initialDriverRepasseForm);
  const [submittingDriverRepasse, setSubmittingDriverRepasse] = useState(false);

  // Modais
  const [editingS, setEditingS] = useState<CaixaVendaLista | null>(null);
  const [editForm, setEditForm] = useState(initialSaleForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingS, setDeletingS] = useState<CaixaVendaLista | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [refundingS, setRefundingS] = useState<CaixaVendaLista | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [sangriaType, setSangriaType] = useState<MovimentacaoTipo>("sangria");
  const [sangriaValue, setSangriaValue] = useState("");
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [submittingSangria, setSubmittingSangria] = useState(false);

  // ============================================================================
  // LOAD DATA
  // Auto-scroll ao exibir mensagem
  useEffect(() => {
    if ((error || success) && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error, success]);

  // ============================================================================

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const todayIso = getTodayISOLocal();

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user ? { id: user.id, email: user.email ?? "operador@inovy.com" } : null);

      const historyQuery = user?.id
        ? supabase.from("vw_caixa_historico_operador").select("*").eq("operador_id", user.id).order("aberto_em", { ascending: false }).limit(6)
        : Promise.resolve({ data: [], error: null });

      const [sessionResult, salesResult, paymentsResult, historyResult, companiesResult, driversResult] = await Promise.all([
        supabase.from("caixa_sessoes").select("*").eq("status", "aberto").order("aberto_em", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("vw_caixa_vendas_lista").select("*").gte("created_at", todayIso).order("created_at", { ascending: false }).limit(50),
        supabase.from("vw_caixa_resumo_diario").select("total_dinheiro, total_debito, total_credito, total_pix, total_link_pagamento").maybeSingle(),
        historyQuery,
        supabase.from("empresas").select("id, nome").order("nome"),
        supabase.from("drivers").select("id, company_id, name, phone, truck_plate, active").eq("active", true).order("name"),
      ]);

      const criticalError = sessionResult.error ?? salesResult.error;
      if (criticalError) {
        const message = criticalError.message ?? "Erro ao carregar o módulo de caixa.";
        const errorCode = String((criticalError as any).code ?? "");
        const isTableMissing = errorCode === "42P01";
        setError(isTableMissing
          ? "O módulo de caixa ainda não foi criado no banco. Rode os SQLs de migrations no Supabase SQL Editor."
          : `Erro ao carregar o caixa: ${message}${errorCode ? ` (código ${errorCode})` : ""}`);
        setLoading(false);
        return;
      }

      // Queries não-críticas: falhas não bloqueiam o módulo
      if (paymentsResult.error) console.warn("Erro ao carregar resumo diário:", paymentsResult.error.message);
      if (historyResult.error) console.warn("Erro ao carregar histórico do operador:", historyResult.error.message);
      if (companiesResult.error) console.warn("Erro ao carregar empresas:", companiesResult.error.message);
      if (driversResult.error) console.warn("Erro ao carregar motoristas:", driversResult.error.message);

      const session = (sessionResult.data ?? null) as CaixaSessao | null;
      const allSales = (salesResult.data ?? []) as CaixaVendaLista[];

      setOpenSession(session);
      setSales(allSales);
      setDailySummary(paymentsResult.data ?? {});
      setOperatorHistory(historyResult.data ?? []);
      setCompanies((companiesResult.data ?? []) as CaixaEmpresaOption[]);
      setDrivers((driversResult.data ?? []) as CaixaDriverOption[]);

      // Carregar movimentações e resumo da sessão
      if (session) {
        const sessionSales = allSales.filter((s) => s.sessao_id === session.id);
        const paid = sessionSales.filter((s) => s.status === "pago");
        const refunded = sessionSales.filter((s) => s.status === "estornado");

        const paidIds = paid.length > 0 ? paid.map((s) => s.id) : ["00000000-0000-0000-0000-000000000000"];

        const [payResult, movResult] = await Promise.all([
          supabase.from("caixa_pagamentos").select("forma_pagamento, valor, troco, venda_id").in("venda_id", paidIds),
          supabase.from("caixa_movimentacoes").select("*").eq("sessao_id", session.id).order("created_at", { ascending: false }),
        ]);

        const movs = (movResult.data ?? []) as CaixaMovimentacao[];
        setMovimentacoes(movs);

        const byMethod: Record<string, number> = { dinheiro: 0, debito: 0, credito: 0, pix: 0, link_pagamento: 0 };
        (payResult.data ?? []).forEach((p: any) => {
          const key = p.forma_pagamento as string;
          if (key in byMethod) byMethod[key] += toNumber(p.valor) - toNumber(p.troco);
        });

        const totalSangria = movs.filter((m) => m.tipo === "sangria").reduce((s, m) => s + toNumber(m.valor), 0);
        const totalReforco = movs.filter((m) => m.tipo === "reforco").reduce((s, m) => s + toNumber(m.valor), 0);

        setSessionSummary({
          totalVendas: sessionSales.length,
          totalPago: paid.reduce((sum, s) => sum + toNumber(s.valor_total), 0),
          totalEstornado: refunded.reduce((sum, s) => sum + toNumber(s.valor_total), 0),
          qtdPago: paid.length,
          qtdEstornado: refunded.length,
          totalSangria,
          totalReforco,
          dinheiro: byMethod.dinheiro,
          debito: byMethod.debito,
          credito: byMethod.credito,
          pix: byMethod.pix,
          link_pagamento: byMethod.link_pagamento,
        });
      } else {
        setMovimentacoes([]);
        setSessionSummary(emptySessionSummary);
      }
    } catch (err) {
      console.error("Erro inesperado no loadData:", err);
      setError("Erro inesperado ao carregar dados do caixa. Recarregue a página.");
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("caixa-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "caixa_vendas" }, () => { void loadData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "caixa_sessoes" }, () => { void loadData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "caixa_movimentacoes" }, () => { void loadData(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [supabase, loadData]);

  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  const saleTotal = useMemo(() => {
    const subtotal = toNumber(saleForm.quantity) * toNumber(saleForm.unitPrice);
    return Math.max(subtotal + toNumber(saleForm.surcharge) - toNumber(saleForm.discount), 0);
  }, [saleForm]);

  const paymentTotal = useMemo(() => paymentLines.reduce((sum, l) => sum + toNumber(l.amount), 0), [paymentLines]);

  const changeAmount = useMemo(() => {
    const diff = paymentTotal - saleTotal;
    return diff > 0.001 ? Math.round(diff * 100) / 100 : 0;
  }, [paymentTotal, saleTotal]);

  const paymentShortage = useMemo(() => {
    const diff = saleTotal - paymentTotal;
    return diff > 0.001 ? Math.round(diff * 100) / 100 : 0;
  }, [paymentTotal, saleTotal]);

  const totalsByMethod = useMemo((): Record<PaymentMethod, number> => ({
    dinheiro: toNumber(dailySummary.total_dinheiro),
    debito: toNumber(dailySummary.total_debito),
    credito: toNumber(dailySummary.total_credito),
    pix: toNumber(dailySummary.total_pix),
    link_pagamento: toNumber(dailySummary.total_link_pagamento),
  }), [dailySummary]);

  const availableRepasseDrivers = useMemo(
    () => drivers.filter((driver) => !repasseForm.companyId || driver.company_id === repasseForm.companyId),
    [drivers, repasseForm.companyId],
  );

  const selectedRepasseDriver = useMemo(
    () => drivers.find((driver) => driver.id === repasseForm.driverId) ?? null,
    [drivers, repasseForm.driverId],
  );

  const paidSales = sales.filter((s) => s.status === "pago");
  const refundedSales = sales.filter((s) => s.status === "estornado");
  const totalSales = paidSales.reduce((sum, s) => sum + toNumber(s.valor_total), 0);
  const ticketMedio = paidSales.length ? totalSales / paidSales.length : 0;
  const operatorTotal = operatorHistory.reduce((sum: number, s: any) => sum + toNumber(s.total_pago), 0);

  // Valor esperado = abertura + dinheiro recebido - sangrias + reforços
  const expectedCashAmount = useMemo(() =>
    toNumber(openSession?.valor_abertura) + sessionSummary.dinheiro - sessionSummary.totalSangria + sessionSummary.totalReforco,
    [openSession, sessionSummary]);

  const closingVariance = useMemo(() => {
    if (!closingValue) return 0;
    return Math.round((toNumber(closingValue) - expectedCashAmount) * 100) / 100;
  }, [closingValue, expectedCashAmount]);

  // ============================================================================
  // HANDLERS — FORMULÁRIO DE VENDA
  // ============================================================================

  const resetSaleForm = () => { setSaleForm(initialSaleForm); setPaymentLines([createPaymentLine("pix")]); };

  const handleSaleFieldChange = (field: keyof typeof initialSaleForm, value: string) => {
    setSaleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (lineId: string, field: keyof PaymentLine, value: string) => {
    setPaymentLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l)));
  };

  const handleAddPaymentLine = () => {
    if (paymentLines.length >= 5) return;
    setPaymentLines((prev) => [...prev, createPaymentLine("dinheiro")]);
  };

  const handleRemovePaymentLine = (lineId: string) => {
    setPaymentLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== lineId)));
  };

  const handleRepasseFieldChange = (field: keyof typeof initialDriverRepasseForm, value: string) => {
    setRepasseForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "companyId") next.driverId = "";
      return next;
    });
  };

  const handleSaveDriverRepasse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingDriverRepasse(true);
    setError("");
    setSuccess("");

    if (!openSession) {
      setError("Abra o caixa antes de registrar um repasse de motorista.");
      setSubmittingDriverRepasse(false);
      return;
    }

    if (!repasseForm.companyId || !repasseForm.driverId || toNumber(repasseForm.amount) <= 0) {
      setError("Selecione empresa, motorista e informe um valor válido.");
      setSubmittingDriverRepasse(false);
      return;
    }

    const driver = drivers.find((item) => item.id === repasseForm.driverId);
    const company = companies.find((item) => item.id === repasseForm.companyId);

    if (!driver) {
      setError("Motorista não encontrado para o repasse informado.");
      setSubmittingDriverRepasse(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const today = new Date().toISOString().slice(0, 10);
    const referenceMonth = today.slice(0, 7);

    const { error: insertError } = await supabase.from("financeiro_lancamentos").insert({
      tipo: "saida",
      categoria: "repasse_motorista",
      kind: "repasse_motorista",
      driver_id: driver.id,
      company_id: repasseForm.companyId,
      favorecido_nome: driver.name,
      descricao: `Repasse de motorista — ${driver.name}`,
      valor: toNumber(repasseForm.amount),
      payment_method: repasseForm.paymentMethod,
      referencia_mes: `${referenceMonth}-01`,
      data_lancamento: today,
      data_pagamento: today,
      status: "pago",
      observacoes: repasseForm.notes || `Repasse registrado no caixa${company ? ` para ${company.nome}` : ""}.`,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmittingDriverRepasse(false);
      return;
    }

    setRepasseForm(initialDriverRepasseForm);
    setSubmittingDriverRepasse(false);
    setSuccess(`Repasse para ${driver.name} registrado com sucesso.`);
    await loadData();
  };

  // ============================================================================
  // HANDLERS — SESSÃO (ABRIR / FECHAR)
  // ============================================================================

  const handleOpenSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpeningSession(true);
    setError(""); setSuccess("");

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("caixa_sessoes").insert({
      operador_id: user?.id ?? null,
      valor_abertura: toNumber(openingValue),
      observacoes: openingNotes || null,
      status: "aberto",
    });

    if (insertError) {
      setError(insertError.message.includes("idx_caixa_sessao_aberta_unica")
        ? "Já existe um caixa aberto. Feche-o antes de abrir outro."
        : insertError.message);
      setOpeningSession(false);
      return;
    }

    setSuccess("Caixa aberto com sucesso.");
    setOpeningValue("0"); setOpeningNotes("");
    setOpeningSession(false);
    await loadData();
  };

  const handleCloseSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!openSession) { setError("Nenhum caixa aberto para fechamento."); return; }
    if (!showClosingConfirm) { setShowClosingConfirm(true); return; }

    setClosingSession(true);
    setError(""); setSuccess("");

    const informedValue = toNumber(closingValue || String(expectedCashAmount));

    const { error: updateError } = await supabase.from("caixa_sessoes").update({
      status: "fechado",
      valor_fechamento_informado: informedValue,
      observacoes: closingNotes || openSession.observacoes || null,
      fechado_em: new Date().toISOString(),
    }).eq("id", openSession.id);

    if (updateError) { setError(updateError.message); setClosingSession(false); return; }

    const closedData = {
      codigo: openSession.codigo, aberto_em: openSession.aberto_em,
      fechado_em: new Date().toISOString(),
      valor_abertura: toNumber(openSession.valor_abertura),
      valor_fechamento_informado: informedValue,
      expectedCash: expectedCashAmount,
      variance: Math.round((informedValue - expectedCashAmount) * 100) / 100,
      operador: currentUser?.email ?? "Operador",
      summary: { ...sessionSummary },
      notes: closingNotes || "",
    };

    setSuccess("Caixa fechado com sucesso.");
    setClosingValue(""); setClosingNotes("");
    setClosingSession(false); setShowClosingConfirm(false);
    await loadData();
    handlePrintClosingReport(closedData);
  };

  // ============================================================================
  // HANDLER — CRIAR VENDA (com suporte a troco)
  // ============================================================================

  const handleCreateSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingSale(true);
    setError(""); setSuccess("");

    if (!openSession) { setError("Abra um caixa antes de registrar atendimentos."); setSubmittingSale(false); return; }
    if (!saleForm.description.trim()) { setError("Informe a descrição do serviço."); setSubmittingSale(false); return; }
    if (saleTotal <= 0) { setError("O valor total da venda precisa ser maior que zero."); setSubmittingSale(false); return; }

    const filledPayments = paymentLines.filter((l) => toNumber(l.amount) > 0);
    if (filledPayments.length === 0) { setError("Informe pelo menos uma forma de pagamento."); setSubmittingSale(false); return; }
    if (paymentShortage > 0.01) { setError(`Faltam ${formatCurrencyBRL(paymentShortage)} para cobrir o valor da venda.`); setSubmittingSale(false); return; }

    // Troco só é permitido em dinheiro
    if (changeAmount > 0) {
      const hasCash = filledPayments.some((l) => l.method === "dinheiro");
      if (!hasCash) { setError("Troco só é permitido para pagamentos em dinheiro."); setSubmittingSale(false); return; }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: sale, error: saleError } = await supabase.from("caixa_vendas").insert({
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
      }).select("id, codigo, valor_total").single();

      if (saleError || !sale) { setError(saleError?.message ?? "Não foi possível registrar a venda."); setSubmittingSale(false); return; }

      // Calcular troco para pagamento em dinheiro
      const saleValue = toNumber(sale.valor_total);
      let remainingChange = Math.max(paymentTotal - saleValue, 0);

      const paymentsPayload = filledPayments.map((line) => {
        let troco = 0;
        if (line.method === "dinheiro" && remainingChange > 0) {
          troco = Math.min(remainingChange, toNumber(line.amount));
          remainingChange -= troco;
        }
        return {
          venda_id: sale.id,
          forma_pagamento: line.method,
          valor: toNumber(line.amount),
          troco: Math.round(troco * 100) / 100,
          referencia_externa: line.reference || null,
          observacoes: saleForm.notes || null,
        };
      });

      const { error: paymentsError } = await supabase.from("caixa_pagamentos").insert(paymentsPayload);

      if (paymentsError) {
        await supabase.from("caixa_vendas").delete().eq("id", sale.id);
        setError(paymentsError.message); setSubmittingSale(false); return;
      }

      resetSaleForm();
      setSuccess(`Venda ${sale.codigo} registrada.${changeAmount > 0 ? ` Troco: ${formatCurrencyBRL(changeAmount)}` : ""}`);
      setSubmittingSale(false);
      await loadData();
    } catch (err) {
      console.error("Erro ao registrar venda:", err);
      setError(err instanceof Error ? err.message : "Erro inesperado ao registrar a venda. Tente novamente.");
      setSubmittingSale(false);
    }
  };

  // ============================================================================
  // HANDLER — EDITAR VENDA
  // ============================================================================

  const openEditModal = (sale: CaixaVendaLista) => {
    if (sale.status !== "pago") { setError("Apenas vendas pagas podem ser editadas."); return; }
    setEditingS(sale);
    setEditForm({
      customerName: sale.cliente_nome ?? "",
      customerDocument: sale.cliente_documento ?? "",
      description: sale.descricao,
      category: sale.categoria,
      quantity: String(sale.quantidade),
      unitPrice: String(sale.valor_unitario),
      discount: String(sale.desconto),
      surcharge: String(sale.acrescimo),
      notes: sale.observacoes ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingS) return;
    if (!editForm.description.trim()) { setError("A descrição não pode ser vazia."); return; }

    setSavingEdit(true);
    setError(""); setSuccess("");

    const { error: updateError } = await supabase.from("caixa_vendas").update({
      cliente_nome: editForm.customerName || null,
      cliente_documento: editForm.customerDocument || null,
      descricao: editForm.description,
      categoria: editForm.category,
      quantidade: Math.max(1, Math.round(toNumber(editForm.quantity))),
      valor_unitario: toNumber(editForm.unitPrice),
      desconto: toNumber(editForm.discount),
      acrescimo: toNumber(editForm.surcharge),
      observacoes: editForm.notes || null,
    }).eq("id", editingS.id);

    if (updateError) { setError(updateError.message); setSavingEdit(false); return; }

    setSuccess(`Venda ${editingS.codigo} atualizada.`);
    setEditingS(null); setSavingEdit(false);
    await loadData();
  };

  // ============================================================================
  // HANDLER — EXCLUIR VENDA
  // ============================================================================

  const openDeleteModal = (sale: CaixaVendaLista) => {
    setDeletingS(sale);
  };

  const handleConfirmDelete = async () => {
    if (!deletingS) return;
    setConfirmingDelete(true);
    setError(""); setSuccess("");

    await supabase.from("caixa_pagamentos").delete().eq("venda_id", deletingS.id);
    const { error: deleteError } = await supabase.from("caixa_vendas").delete().eq("id", deletingS.id);

    if (deleteError) { setError(deleteError.message); setConfirmingDelete(false); return; }

    setSuccess(`Venda ${deletingS.codigo} excluída.`);
    setDeletingS(null); setConfirmingDelete(false);
    await loadData();
  };

  // ============================================================================
  // HANDLER — ESTORNAR VENDA (modal)
  // ============================================================================

  const openRefundModal = (sale: CaixaVendaLista) => {
    if (sale.status !== "pago") { setError("Apenas vendas pagas podem ser estornadas."); return; }
    setRefundingS(sale);
    setRefundReason("");
  };

  const handleConfirmRefund = async () => {
    if (!refundingS) return;
    if (!refundReason.trim()) { setError("Informe o motivo do estorno."); return; }

    setSubmittingRefund(true);
    setError(""); setSuccess("");

    const refundNote = `[ESTORNO ${new Date().toLocaleString("pt-BR")}]: ${refundReason.trim()}`;
    const nextObs = [refundingS.observacoes, refundNote].filter(Boolean).join("\n");

    const { error: updateError } = await supabase.from("caixa_vendas").update({
      status: "estornado",
      observacoes: nextObs,
    }).eq("id", refundingS.id);

    if (updateError) { setError(updateError.message); setSubmittingRefund(false); return; }

    setSuccess(`Venda ${refundingS.codigo} estornada.`);
    setRefundingS(null); setRefundReason(""); setSubmittingRefund(false);
    await loadData();
  };

  // ============================================================================
  // HANDLER — SANGRIA / REFORÇO
  // ============================================================================

  const openSangriaModal = (tipo: MovimentacaoTipo) => {
    setSangriaType(tipo);
    setSangriaValue(""); setSangriaMotivo("");
    setShowSangriaModal(true);
  };

  const handleConfirmSangria = async () => {
    if (!openSession) return;
    if (toNumber(sangriaValue) <= 0) { setError("Informe um valor positivo."); return; }
    if (!sangriaMotivo.trim()) { setError("Informe o motivo da movimentação."); return; }

    setSubmittingSangria(true);
    setError(""); setSuccess("");

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("caixa_movimentacoes").insert({
      sessao_id: openSession.id,
      tipo: sangriaType,
      valor: toNumber(sangriaValue),
      motivo: sangriaMotivo.trim(),
      operador_id: user?.id ?? null,
    });

    if (insertError) { setError(insertError.message); setSubmittingSangria(false); return; }

    setSuccess(`${sangriaType === "sangria" ? "Sangria" : "Reforço"} de ${formatCurrencyBRL(toNumber(sangriaValue))} registrado.`);
    setShowSangriaModal(false); setSubmittingSangria(false);
    await loadData();
  };

  // ============================================================================
  // IMPRESSÃO — COMPROVANTE
  // ============================================================================

  const handlePrintReceipt = (sale: CaixaVendaLista) => {
    if (typeof window === "undefined") return;
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) { setError("Permita pop-ups para imprimir."); return; }

    const methods = String(sale.formas_pagamento ?? "—").replaceAll("_", " ");
    const opName = sale.operador_nome ?? currentUser?.email ?? "Operador";
    const ref = sale.referencia_pagamento ? `<p><strong>Referência:</strong> ${escapeHtml(String(sale.referencia_pagamento))}</p>` : "";
    const notes = sale.observacoes ? `<p><strong>Obs.:</strong> ${escapeHtml(String(sale.observacoes))}</p>` : "";

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Comprovante ${escapeHtml(sale.codigo)}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}.box{max-width:360px;margin:0 auto;border:1px solid #ddd;border-radius:12px;padding:20px}h1{font-size:18px;margin:0 0 6px}p{font-size:12px;margin:6px 0}.total{font-size:18px;font-weight:bold;margin-top:12px}.divider{border-top:1px dashed #aaa;margin:12px 0}</style></head>
    <body><div class="box"><h1>Inovy • Comprovante</h1><p>${formatDateTimeBR(sale.created_at)}</p><div class="divider"></div>
    <p><strong>Código:</strong> ${escapeHtml(sale.codigo)}</p>
    <p><strong>Cliente:</strong> ${escapeHtml(sale.cliente_nome ?? "Cliente balcão")}</p>
    <p><strong>Serviço:</strong> ${escapeHtml(sale.descricao ?? "Atendimento balcão")}</p>
    <p><strong>Pagamento:</strong> ${escapeHtml(methods)}</p>
    <p><strong>Operador:</strong> ${escapeHtml(opName)}</p>${ref}${notes}
    <div class="divider"></div><p class="total">Total: ${formatCurrencyBRL(sale.valor_total)}</p></div></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  // ============================================================================
  // IMPRESSÃO — RELATÓRIO DE FECHAMENTO
  // ============================================================================

  const handlePrintClosingReport = (data: {
    codigo: string; aberto_em: string; fechado_em: string; valor_abertura: number;
    valor_fechamento_informado: number; expectedCash: number; variance: number;
    operador: string; summary: SessionSummary; notes: string;
  }) => {
    if (typeof window === "undefined") return;
    const w = window.open("", "_blank", "width=520,height=800");
    if (!w) { setError("Permita pop-ups para imprimir o relatório."); return; }

    const vc = data.variance === 0 ? "#22c55e" : data.variance > 0 ? "#3b82f6" : "#ef4444";
    const vl = data.variance === 0 ? "Conferido" : data.variance > 0 ? "Sobra" : "Falta";

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Fechamento ${escapeHtml(data.codigo)}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:13px}.box{max-width:440px;margin:0 auto;border:1px solid #ddd;border-radius:12px;padding:24px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 8px;color:#555}.row{display:flex;justify-content:space-between;padding:4px 0}.row .label{color:#666}.row .value{font-weight:bold}.divider{border-top:1px dashed #aaa;margin:12px 0}.variance{font-size:16px;font-weight:bold;text-align:center;padding:10px;border-radius:8px;margin:12px 0}.total{font-size:16px;font-weight:bold}.notes{font-style:italic;color:#666;margin-top:8px;font-size:12px}.footer{text-align:center;margin-top:20px;font-size:11px;color:#999}.signature{margin-top:40px;display:flex;gap:40px}.signature div{flex:1;text-align:center;border-top:1px solid #999;padding-top:8px;font-size:11px;color:#666}</style></head>
    <body><div class="box">
    <h1>Inovy • Fechamento de Caixa</h1>
    <p style="color:#666;margin:0 0 4px">Sessão ${escapeHtml(data.codigo)}</p>
    <p style="color:#666;margin:0">Operador: ${escapeHtml(data.operador)}</p>
    <div class="divider"></div>
    <div class="row"><span class="label">Abertura</span><span class="value">${formatDateTimeBR(data.aberto_em)}</span></div>
    <div class="row"><span class="label">Fechamento</span><span class="value">${formatDateTimeBR(data.fechado_em)}</span></div>
    <div class="row"><span class="label">Valor de Abertura</span><span class="value">${formatCurrencyBRL(data.valor_abertura)}</span></div>
    <h2>Resumo da Sessão</h2>
    <div class="row"><span class="label">Vendas Pagas</span><span class="value">${data.summary.qtdPago} — ${formatCurrencyBRL(data.summary.totalPago)}</span></div>
    <div class="row"><span class="label">Estornos</span><span class="value">${data.summary.qtdEstornado} — ${formatCurrencyBRL(data.summary.totalEstornado)}</span></div>
    <div class="row"><span class="label">Sangrias</span><span class="value">- ${formatCurrencyBRL(data.summary.totalSangria)}</span></div>
    <div class="row"><span class="label">Reforços</span><span class="value">+ ${formatCurrencyBRL(data.summary.totalReforco)}</span></div>
    <h2>Por Forma de Pagamento</h2>
    <div class="row"><span class="label">💵 Dinheiro</span><span class="value">${formatCurrencyBRL(data.summary.dinheiro)}</span></div>
    <div class="row"><span class="label">💳 Débito</span><span class="value">${formatCurrencyBRL(data.summary.debito)}</span></div>
    <div class="row"><span class="label">💳 Crédito</span><span class="value">${formatCurrencyBRL(data.summary.credito)}</span></div>
    <div class="row"><span class="label">📲 PIX</span><span class="value">${formatCurrencyBRL(data.summary.pix)}</span></div>
    <div class="row"><span class="label">🔗 Link Pgto</span><span class="value">${formatCurrencyBRL(data.summary.link_pagamento)}</span></div>
    <div class="divider"></div>
    <h2>Conferência de Caixa (Dinheiro)</h2>
    <div class="row"><span class="label">Esperado em caixa</span><span class="value total">${formatCurrencyBRL(data.expectedCash)}</span></div>
    <div class="row"><span class="label">Valor conferido</span><span class="value total">${formatCurrencyBRL(data.valor_fechamento_informado)}</span></div>
    <div class="variance" style="background:${vc}15;color:${vc};border:1px solid ${vc}33">${vl}: ${formatCurrencyBRL(Math.abs(data.variance))}</div>
    ${data.notes ? `<div class="notes">Obs.: ${escapeHtml(data.notes)}</div>` : ""}
    <div class="signature"><div>Operador</div><div>Supervisor</div></div>
    <div class="footer">Documento gerado em ${new Date().toLocaleString("pt-BR")} — Inovy SaaS</div>
    </div></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="animate-fade-in">
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Caixa de Balcão</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Receba pagamentos em dinheiro, débito, crédito, PIX e link de pagamento.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span className={`badge ${openSession ? "badge-success" : "badge-muted"}`}>
            {openSession ? `Caixa ${openSession.codigo} aberto` : "Nenhum caixa aberto"}
          </span>
        </div>
      </div>

      {/* MENSAGENS */}
      {(error || success) && (
        <div ref={messageRef} className="card" style={{ marginBottom: "16px", borderColor: error ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)", color: error ? "#fca5a5" : "#86efac" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error || success}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setError(""); setSuccess(""); }} style={{ fontSize: "16px", padding: "0 6px" }}>✕</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { label: "Vendas Pagas", value: paidSales.length, icon: "🧾", color: "indigo", sub: "atendimentos concluídos" },
          { label: "Total Recebido", value: formatCurrencyBRL(totalSales), icon: "💰", color: "emerald", sub: "somatório do dia" },
          { label: "Estornos Hoje", value: refundedSales.length, icon: "↩️", color: "rose", sub: "vendas revertidas" },
          { label: "Ticket Médio", value: formatCurrencyBRL(ticketMedio), icon: "📈", color: "amber", sub: "por atendimento" },
        ].map((item, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon ${item.color}`}>{item.icon}</div>
            <div>
              <div className="kpi-value">{item.value}</div>
              <div className="kpi-label">{item.label}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* LAYOUT PRINCIPAL */}
      <div className="grid-3" style={{ gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* FORMULÁRIO DE VENDA */}
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
                  <input type="text" placeholder="Cliente balcão" value={saleForm.customerName} onChange={(e) => handleSaleFieldChange("customerName", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Documento</label>
                  <input type="text" placeholder="CPF/CNPJ (opcional)" value={saleForm.customerDocument} onChange={(e) => handleSaleFieldChange("customerDocument", e.target.value)} />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Serviço / Cobrança *</label>
                  <input type="text" placeholder="Ex.: envio expresso, embalagem" value={saleForm.description} onChange={(e) => handleSaleFieldChange("description", e.target.value)} required />
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
                <div className="input-group"><label>Qtd.</label><input type="number" min="1" value={saleForm.quantity} onChange={(e) => handleSaleFieldChange("quantity", e.target.value)} /></div>
                <div className="input-group"><label>Valor Unitário</label><input type="number" min="0" step="0.01" value={saleForm.unitPrice} onChange={(e) => handleSaleFieldChange("unitPrice", e.target.value)} /></div>
                <div className="input-group"><label>Desconto</label><input type="number" min="0" step="0.01" value={saleForm.discount} onChange={(e) => handleSaleFieldChange("discount", e.target.value)} /></div>
                <div className="input-group"><label>Acréscimo</label><input type="number" min="0" step="0.01" value={saleForm.surcharge} onChange={(e) => handleSaleFieldChange("surcharge", e.target.value)} /></div>
              </div>

              {/* PAGAMENTOS */}
              <div className="card" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Formas de pagamento</div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPaymentLine} disabled={paymentLines.length >= 5}>+ Adicionar</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {paymentLines.map((line, index) => (
                    <div key={line.id} className="grid-3" style={{ alignItems: "end" }}>
                      <div className="input-group">
                        <label>Método #{index + 1}</label>
                        <select value={line.method} onChange={(e) => handlePaymentChange(line.id, "method", e.target.value)}>
                          {paymentOptions.map((o) => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                        </select>
                      </div>
                      <div className="input-group"><label>Valor</label><input type="number" min="0" step="0.01" value={line.amount} onChange={(e) => handlePaymentChange(line.id, "amount", e.target.value)} /></div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "end" }}>
                        <div className="input-group" style={{ flex: 1 }}><label>Ref./Link</label><input type="text" placeholder="Código / URL" value={line.reference} onChange={(e) => handlePaymentChange(line.id, "reference", e.target.value)} /></div>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => handleRemovePaymentLine(line.id)} title="Remover">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RESUMO DA VENDA */}
              <div className="grid-2">
                <div className="input-group">
                  <label>Observações</label>
                  <textarea rows={3} style={{ resize: "none" }} placeholder="Observações do balcão" value={saleForm.notes} onChange={(e) => handleSaleFieldChange("notes", e.target.value)} />
                </div>
                <div className="card" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Subtotal</span><strong>{formatCurrencyBRL(toNumber(saleForm.quantity) * toNumber(saleForm.unitPrice))}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Desconto</span><strong>- {formatCurrencyBRL(toNumber(saleForm.discount))}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Acréscimo</span><strong>+ {formatCurrencyBRL(toNumber(saleForm.surcharge))}</strong></div>
                    <div className="divider" />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Total da Venda</span>
                      <strong style={{ color: "var(--brand-success)" }}>{formatCurrencyBRL(saleTotal)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Pagamentos</span><strong>{formatCurrencyBRL(paymentTotal)}</strong></div>
                    {changeAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#93c5fd" }}>
                        <span>Troco</span><strong>{formatCurrencyBRL(changeAmount)}</strong>
                      </div>
                    )}
                    {paymentShortage > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#fca5a5" }}>
                        <span>Falta</span><strong>{formatCurrencyBRL(paymentShortage)}</strong>
                      </div>
                    )}
                    {paymentShortage <= 0.01 && changeAmount <= 0.01 && paymentTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#86efac" }}>
                        <span>Status</span><strong>✓ Exato</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={resetSaleForm}>Limpar</button>
                <button type="submit" className="btn btn-primary" disabled={submittingSale || loading || !openSession}>
                  {submittingSale ? "Registrando..." : "💸 Registrar cobrança"}
                </button>
              </div>
            </form>
          </div>

          {/* TABELA DE VENDAS */}
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
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>Carregando caixa...</td></tr>
                  ) : sales.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>Nenhuma venda lançada hoje.</td></tr>
                  ) : (
                    sales.map((sale) => {
                      const st = saleStatusMap[sale.status] ?? saleStatusMap.pago;
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
                            {sale.referencia_pagamento && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Ref.: {sale.referencia_pagamento}</div>}
                          </td>
                          <td><span className={`badge ${st.className}`}>{st.label}</span></td>
                          <td><strong style={{ color: sale.status === "estornado" ? "#fca5a5" : "var(--brand-success)", fontSize: "12px" }}>{formatCurrencyBRL(sale.valor_total)}</strong></td>
                          <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTimeBR(sale.created_at)}</td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handlePrintReceipt(sale)} title="Imprimir">🖨️</button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(sale)} title="Editar" disabled={sale.status !== "pago"} style={{ opacity: sale.status === "pago" ? 1 : 0.35 }}>✏️</button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => openRefundModal(sale)} title="Estornar" disabled={sale.status !== "pago"} style={{ opacity: sale.status === "pago" ? 1 : 0.35 }}>↩️</button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => openDeleteModal(sale)} title="Excluir" style={{ opacity: 0.6 }}>🗑️</button>
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

          {/* MOVIMENTAÇÕES (SANGRIA/REFORÇO) DA SESSÃO */}
          {openSession && movimentacoes.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="card-title">Sangrias e Reforços</div>
                <div className="card-subtitle">Movimentações de caixa da sessão {openSession.codigo}</div>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Tipo</th><th>Valor</th><th>Motivo</th><th>Data</th></tr></thead>
                  <tbody>
                    {movimentacoes.map((m) => (
                      <tr key={m.id}>
                        <td><span className={`badge ${m.tipo === "sangria" ? "badge-danger" : "badge-success"}`}>{m.tipo === "sangria" ? "Sangria" : "Reforço"}</span></td>
                        <td><strong style={{ color: m.tipo === "sangria" ? "#fca5a5" : "var(--brand-success)", fontSize: "12px" }}>{m.tipo === "sangria" ? "- " : "+ "}{formatCurrencyBRL(m.valor)}</strong></td>
                        <td style={{ fontSize: "12px" }}>{m.motivo}</td>
                        <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTimeBR(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA — SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* CONTROLE DO CAIXA */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Controle do Caixa</div>
                <div className="card-subtitle">Abertura, fechamento e conferência</div>
              </div>
            </div>

            {!openSession ? (
              <form onSubmit={handleOpenSession} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="input-group"><label>Valor de abertura</label><input type="number" min="0" step="0.01" value={openingValue} onChange={(e) => setOpeningValue(e.target.value)} /></div>
                <div className="input-group"><label>Observações</label><textarea rows={3} style={{ resize: "none" }} value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} placeholder="Ex.: troco inicial" /></div>
                <button type="submit" className="btn btn-primary" disabled={openingSession}>{openingSession ? "Abrindo..." : "🔓 Abrir caixa"}</button>
              </form>
            ) : (
              <form onSubmit={handleCloseSession} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Info da sessão */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Sessão</span><strong>{openSession.codigo}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Abertura</span><strong>{formatCurrencyBRL(openSession.valor_abertura)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Aberto em</span><strong>{formatDateTimeBR(openSession.aberto_em)}</strong></div>
                </div>
                <div className="divider" />

                {/* Resumo da sessão */}
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resumo da Sessão</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Vendas pagas</span><strong style={{ color: "var(--brand-success)" }}>{sessionSummary.qtdPago} — {formatCurrencyBRL(sessionSummary.totalPago)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Estornos</span><strong style={{ color: "#fca5a5" }}>{sessionSummary.qtdEstornado} — {formatCurrencyBRL(sessionSummary.totalEstornado)}</strong></div>
                  {(sessionSummary.totalSangria > 0 || sessionSummary.totalReforco > 0) && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Sangrias</span><strong style={{ color: "#fca5a5" }}>- {formatCurrencyBRL(sessionSummary.totalSangria)}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Reforços</span><strong style={{ color: "#93c5fd" }}>+ {formatCurrencyBRL(sessionSummary.totalReforco)}</strong></div>
                    </>
                  )}
                </div>
                <div className="divider" />

                {/* Por forma de pagamento */}
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Por Forma de Pagamento</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px" }}>
                  {paymentOptions.map((opt) => (
                    <div key={opt.value} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>{opt.icon} {opt.label}</span>
                      <strong>{formatCurrencyBRL(sessionSummary[opt.value as keyof SessionSummary] as number)}</strong>
                    </div>
                  ))}
                </div>
                <div className="divider" />

                {/* Conferência */}
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Conferência de Caixa (Dinheiro)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>Abertura</span><strong>{formatCurrencyBRL(toNumber(openSession.valor_abertura))}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>+ Dinheiro recebido</span><strong>{formatCurrencyBRL(sessionSummary.dinheiro)}</strong></div>
                  {sessionSummary.totalSangria > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>- Sangrias</span><strong>{formatCurrencyBRL(sessionSummary.totalSangria)}</strong></div>}
                  {sessionSummary.totalReforco > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>+ Reforços</span><strong>{formatCurrencyBRL(sessionSummary.totalReforco)}</strong></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>= Esperado no caixa</span>
                    <strong style={{ color: "var(--brand-success)" }}>{formatCurrencyBRL(expectedCashAmount)}</strong>
                  </div>
                </div>

                <div className="input-group"><label>Valor contado no caixa físico</label><input type="number" min="0" step="0.01" value={closingValue} onChange={(e) => setClosingValue(e.target.value)} placeholder={String(expectedCashAmount)} /></div>

                {closingValue && (
                  <div style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, textAlign: "center",
                    background: closingVariance === 0 ? "rgba(34,197,94,0.1)" : closingVariance > 0 ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
                    color: closingVariance === 0 ? "#86efac" : closingVariance > 0 ? "#93c5fd" : "#fca5a5",
                    border: `1px solid ${closingVariance === 0 ? "rgba(34,197,94,0.2)" : closingVariance > 0 ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>
                    {closingVariance === 0 ? "✓ Caixa conferido — sem diferença" : closingVariance > 0 ? `↑ Sobra de ${formatCurrencyBRL(closingVariance)}` : `↓ Falta de ${formatCurrencyBRL(Math.abs(closingVariance))}`}
                  </div>
                )}

                <div className="input-group"><label>Observações</label><textarea rows={2} style={{ resize: "none" }} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Ex.: conferência ok" /></div>

                {/* Botões de sangria/reforço */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openSangriaModal("sangria")}>💸 Sangria</button>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openSangriaModal("reforco")}>💵 Reforço</button>
                </div>

                {/* Confirmação de fechamento */}
                {showClosingConfirm ? (
                  <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 600, textAlign: "center" }}>Confirma o fechamento do caixa {openSession.codigo}?</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>O relatório será impresso automaticamente.</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowClosingConfirm(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, background: "#dc2626" }} disabled={closingSession}>{closingSession ? "Fechando..." : "Confirmar"}</button>
                    </div>
                  </div>
                ) : (
                  <button type="submit" className="btn btn-secondary" disabled={closingSession}>🔒 Fechar caixa</button>
                )}
              </form>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Repasse motorista</div>
                <div className="card-subtitle">Saída vinculada à empresa e ao motorista</div>
              </div>
            </div>

            <form onSubmit={handleSaveDriverRepasse} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label>Empresa *</label>
                <select value={repasseForm.companyId} onChange={(e) => handleRepasseFieldChange("companyId", e.target.value)} required>
                  <option value="">Selecione</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.nome}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Motorista *</label>
                <select value={repasseForm.driverId} onChange={(e) => handleRepasseFieldChange("driverId", e.target.value)} required>
                  <option value="">Selecione</option>
                  {availableRepasseDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
              </div>

              {selectedRepasseDriver && (
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--text-secondary)" }}>
                  <div>📱 {selectedRepasseDriver.phone || "Telefone não informado"}</div>
                  <div>🪪 {selectedRepasseDriver.truck_plate || "Placa não informada"}</div>
                </div>
              )}

              <div className="grid-2">
                <div className="input-group">
                  <label>Valor *</label>
                  <input type="number" min="0.01" step="0.01" value={repasseForm.amount} onChange={(e) => handleRepasseFieldChange("amount", e.target.value)} placeholder="0.00" required />
                </div>
                <div className="input-group">
                  <label>Forma de pagamento *</label>
                  <select value={repasseForm.paymentMethod} onChange={(e) => handleRepasseFieldChange("paymentMethod", e.target.value)}>
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Observações</label>
                <textarea rows={2} style={{ resize: "none" }} value={repasseForm.notes} onChange={(e) => handleRepasseFieldChange("notes", e.target.value)} placeholder="Ex.: rota, acerto semanal, adiantamento..." />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submittingDriverRepasse || !openSession}>
                {submittingDriverRepasse ? "Salvando..." : "🚚 Salvar repasse motorista"}
              </button>

              {!openSession && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Abra uma sessão de caixa para liberar esse lançamento.
                </div>
              )}
            </form>
          </div>

          {/* RESUMO DIÁRIO */}
          <div className="card">
            <div className="card-header"><div><div className="card-title">Resumo por Forma de Pagamento</div><div className="card-subtitle">Totais do dia</div></div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {paymentOptions.map((o) => (
                <div key={o.value} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{o.icon} {o.label}</span>
                  <strong>{formatCurrencyBRL(totalsByMethod[o.value] ?? 0)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* HISTÓRICO */}
          <div className="card">
            <div className="card-header"><div><div className="card-title">Histórico do Operador</div><div className="card-subtitle">Sessões de {currentUser?.email ?? "operador"}</div></div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span style={{ color: "var(--text-muted)" }}>Sessões</span><strong>{operatorHistory.length}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span style={{ color: "var(--text-muted)" }}>Total movimentado</span><strong>{formatCurrencyBRL(operatorTotal)}</strong></div>
              <div className="divider" />
              {operatorHistory.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Nenhuma sessão registrada.</div>
              ) : (
                operatorHistory.map((session: any) => (
                  <div key={session.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "10px", background: "var(--bg-elevated)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "12px" }}>{session.codigo}</strong>
                      <span className={`badge ${session.status === "aberto" ? "badge-success" : "badge-muted"}`}>{session.status}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDateTimeBR(session.aberto_em)}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Atendimentos: {session.total_atendimentos}</span>
                      <strong>{formatCurrencyBRL(session.total_pago)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FLUXO RECOMENDADO */}
          <div className="card">
            <div className="card-header"><div><div className="card-title">Fluxo recomendado</div><div className="card-subtitle">Operação diária do balcão</div></div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <div>1. Abra o caixa com o valor inicial disponível.</div>
              <div>2. Registre cada atendimento com a forma de pagamento.</div>
              <div>3. Use sangria para retiradas e reforço para entradas.</div>
              <div>4. Imprima o comprovante para entregar ao cliente.</div>
              <div>5. Use estorno com motivo para reverter cobranças.</div>
              <div>6. Feche o caixa com conferência do valor em dinheiro.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODAIS                                                             */}
      {/* ================================================================== */}

      {/* MODAL: EDITAR VENDA */}
      {editingS && (
        <div className="modal-overlay" onClick={() => setEditingS(null)}>
          <div className="modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Editar Venda {editingS.codigo}</div>
                <div className="modal-subtitle">Altere os dados da venda. O valor total será recalculado.</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditingS(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="grid-2">
                <div className="input-group"><label>Cliente</label><input type="text" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} /></div>
                <div className="input-group"><label>Documento</label><input type="text" value={editForm.customerDocument} onChange={(e) => setEditForm({ ...editForm, customerDocument: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="input-group"><label>Serviço *</label><input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required /></div>
                <div className="input-group">
                  <label>Categoria</label>
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="balcao">Balcão</option><option value="frete">Frete</option><option value="embalagem">Embalagem</option><option value="servico">Serviço</option><option value="outros">Outros</option>
                  </select>
                </div>
              </div>
              <div className="grid-4">
                <div className="input-group"><label>Qtd.</label><input type="number" min="1" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} /></div>
                <div className="input-group"><label>Valor Unit.</label><input type="number" min="0" step="0.01" value={editForm.unitPrice} onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })} /></div>
                <div className="input-group"><label>Desconto</label><input type="number" min="0" step="0.01" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} /></div>
                <div className="input-group"><label>Acréscimo</label><input type="number" min="0" step="0.01" value={editForm.surcharge} onChange={(e) => setEditForm({ ...editForm, surcharge: e.target.value })} /></div>
              </div>
              <div className="input-group"><label>Observações</label><textarea rows={2} style={{ resize: "none" }} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", padding: "10px 0" }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Novo total</span>
                <strong style={{ color: "var(--brand-success)", fontSize: "16px" }}>
                  {formatCurrencyBRL(Math.max((toNumber(editForm.quantity) * toNumber(editForm.unitPrice)) + toNumber(editForm.surcharge) - toNumber(editForm.discount), 0))}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingS(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar alterações"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR VENDA */}
      {deletingS && (
        <div className="modal-overlay" onClick={() => setDeletingS(null)}>
          <div className="modal" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Excluir Venda</div>
                <div className="modal-subtitle">Esta ação não pode ser desfeita.</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setDeletingS(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ fontSize: "13px", color: "#fca5a5", fontWeight: 600, marginBottom: "8px" }}>Confirme a exclusão</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  <div>Código: <strong>{deletingS.codigo}</strong></div>
                  <div>Serviço: {deletingS.descricao}</div>
                  <div>Valor: <strong>{formatCurrencyBRL(deletingS.valor_total)}</strong></div>
                  <div>Status: {saleStatusMap[deletingS.status]?.label ?? deletingS.status}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeletingS(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" style={{ background: "#dc2626" }} onClick={handleConfirmDelete} disabled={confirmingDelete}>{confirmingDelete ? "Excluindo..." : "Excluir venda"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNAR VENDA */}
      {refundingS && (
        <div className="modal-overlay" onClick={() => setRefundingS(null)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Estornar Venda {refundingS.codigo}</div>
                <div className="modal-subtitle">Informe o motivo do estorno. Obrigatório.</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setRefundingS(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                <div>Serviço: <strong>{refundingS.descricao}</strong></div>
                <div>Valor: <strong style={{ color: "#fca5a5" }}>{formatCurrencyBRL(refundingS.valor_total)}</strong></div>
                <div>Cliente: {refundingS.cliente_nome ?? "Cliente balcão"}</div>
              </div>
              <div className="input-group">
                <label>Motivo do estorno *</label>
                <textarea rows={3} style={{ resize: "none" }} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Ex.: pagamento recusado, desistência do cliente..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRefundingS(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" style={{ background: "#dc2626" }} onClick={handleConfirmRefund} disabled={submittingRefund || !refundReason.trim()}>{submittingRefund ? "Estornando..." : "Confirmar estorno"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SANGRIA / REFORÇO */}
      {showSangriaModal && (
        <div className="modal-overlay" onClick={() => setShowSangriaModal(false)}>
          <div className="modal" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{sangriaType === "sangria" ? "💸 Sangria de Caixa" : "💵 Reforço de Caixa"}</div>
                <div className="modal-subtitle">{sangriaType === "sangria" ? "Registre a retirada de dinheiro do caixa." : "Registre a entrada de dinheiro no caixa."}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowSangriaModal(false)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="input-group">
                <label>Valor *</label>
                <input type="number" min="0.01" step="0.01" value={sangriaValue} onChange={(e) => setSangriaValue(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div className="input-group">
                <label>Motivo *</label>
                <textarea rows={2} style={{ resize: "none" }} value={sangriaMotivo} onChange={(e) => setSangriaMotivo(e.target.value)} placeholder={sangriaType === "sangria" ? "Ex.: depósito bancário, troco para outro caixa..." : "Ex.: troco adicional, depósito..."} required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSangriaModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmSangria} disabled={submittingSangria || !sangriaMotivo.trim() || toNumber(sangriaValue) <= 0}>
                  {submittingSangria ? "Registrando..." : `Confirmar ${sangriaType === "sangria" ? "sangria" : "reforço"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
