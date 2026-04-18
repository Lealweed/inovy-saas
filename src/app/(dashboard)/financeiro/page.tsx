"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyBRL, formatDateBR, formatMonthYearBR } from "@/lib/formatters";

const statusMap = {
  pago: { label: "Pago", class: "badge-success" },
  pendente: { label: "Pendente", class: "badge-warning" },
  atrasado: { label: "Atrasado", class: "badge-danger" },
  cancelado: { label: "Cancelado", class: "badge-muted" },
} as const;

const entryTypeMap = {
  entrada: { label: "Entrada", class: "badge-success" },
  saida: { label: "Saída", class: "badge-danger" },
} as const;

const entryCategoryMap = {
  repasse_parceiro_externo: "Parceiro Externo",
  pagamento_motorista: "Pagamento Motorista",
  repasse_motorista: "Repasse Motorista",
  receita_avulsa: "Receita Avulsa",
  despesa_operacional: "Despesa Operacional",
  ajuste: "Ajuste",
  outro: "Outro",
} as const;

type RepasseStatus = keyof typeof statusMap;
type EntryType = keyof typeof entryTypeMap;
type EntryCategory = keyof typeof entryCategoryMap;

const statusOptions = Object.entries(statusMap).map(([value, config]) => ({
  value: value as RepasseStatus,
  label: config.label,
}));

type RepasseQueryRow = {
  id: string;
  codigo: string;
  empresa_id: string;
  referencia_mes: string;
  total_encomendas: number | null;
  valor_bruto: number | null;
  comissao_pct: number | null;
  valor_comissao: number | null;
  valor_liquido: number | null;
  status: RepasseStatus;
  data_pagamento: string | null;
  empresas: { nome: string } | { nome: string }[] | null;
};

type EmpresaFinanceQueryRow = {
  id: string;
  nome: string;
  comissao_pct: number | null;
};

type DriverFinanceQueryRow = {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  truck_plate: string | null;
  active: boolean;
};

type ShipmentFinanceQueryRow = {
  id: string;
  empresa_id: string;
  empresa_nome: string | null;
  valor_frete: number | string | null;
  data_postagem: string;
  status: string;
};

type RepasseRow = {
  dbId: string;
  id: string;
  empresaId: string;
  empresa: string;
  periodo: string;
  periodoKey: string;
  encomendas: number;
  bruto: string;
  brutoNumber: number;
  comissaoPct: number;
  comissao: string;
  comissaoNumber: number;
  liquido: string;
  liquidoNumber: number;
  status: RepasseStatus;
  dataPag: string;
  isGenerated: boolean;
};

type ManualEntryQueryRow = {
  id: string;
  codigo: string;
  tipo: EntryType;
  categoria: EntryCategory;
  kind: string | null;
  descricao: string;
  favorecido_nome: string;
  valor: number | null;
  percentual: number | null;
  referencia_mes: string;
  data_lancamento: string;
  data_pagamento: string | null;
  status: RepasseStatus;
  observacoes: string | null;
  driver_id: string | null;
  company_id: string | null;
  payment_method: string | null;
  driver_name: string | null;
  company_name: string | null;
};

type ManualEntryRow = {
  dbId: string;
  id: string;
  tipo: EntryType;
  categoria: EntryCategory;
  kind: string;
  descricao: string;
  favorecido: string;
  valor: string;
  valorNumber: number;
  percentual: string;
  percentualNumber: number;
  periodo: string;
  periodoKey: string;
  dataLancamento: string;
  dataPagamento: string;
  status: RepasseStatus;
  observacoes: string;
  driverId: string;
  companyId: string;
  driverName: string;
  companyName: string;
  paymentMethod: string;
};

const initialEntryForm = {
  tipo: "saida" as EntryType,
  categoria: "pagamento_motorista" as EntryCategory,
  kind: "manual",
  companyId: "",
  driverId: "",
  favorecido: "",
  descricao: "",
  valor: "",
  percentual: "",
  paymentMethod: "pix",
  referenciaMes: new Date().toISOString().slice(0, 7),
  dataLancamento: new Date().toISOString().slice(0, 10),
  status: "pendente" as RepasseStatus,
  observacoes: "",
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getMonthRange = (periodKey: string) => {
  const [year, month] = periodKey.split("-").map(Number);
  const start = `${periodKey}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
};

export default function FinanceiroPage() {
  const supabase = useMemo(() => createClient(), []);
  const [repasses, setRepasses] = useState<RepasseRow[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntryRow[]>([]);
  const [companies, setCompanies] = useState<EmpresaFinanceQueryRow[]>([]);
  const [drivers, setDrivers] = useState<DriverFinanceQueryRow[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDriverFilter, setSelectedDriverFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [manualModuleAvailable, setManualModuleAvailable] = useState(true);
  const [entryForm, setEntryForm] = useState(initialEntryForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [repassesResult, manualEntriesResult, encomendasResult, empresasResult, driversResult] = await Promise.all([
      supabase
        .from("repasses")
        .select("id, codigo, empresa_id, referencia_mes, total_encomendas, valor_bruto, comissao_pct, valor_comissao, valor_liquido, status, data_pagamento, empresas(nome)")
        .order("referencia_mes", { ascending: false }),
      supabase.from("vw_financeiro_lancamentos").select("*").order("data_lancamento", { ascending: false }),
      supabase.from("vw_encomendas_lista").select("id, empresa_id, empresa_nome, valor_frete, data_postagem, status").order("data_postagem", { ascending: false }),
      supabase.from("empresas").select("id, nome, comissao_pct").order("nome"),
      supabase.from("drivers").select("id, company_id, name, phone, truck_plate, active").order("name"),
    ]);

    if (repassesResult.error) {
      setError(repassesResult.error.message);
      setLoading(false);
      return;
    }

    if (encomendasResult.error) {
      setError(encomendasResult.error.message);
      setLoading(false);
      return;
    }

    if (empresasResult.error) {
      setError(empresasResult.error.message);
      setLoading(false);
      return;
    }

    if (driversResult.error) {
      setError(driversResult.error.message);
      setLoading(false);
      return;
    }

    const companiesData = (empresasResult.data ?? []) as EmpresaFinanceQueryRow[];
    const driversData = (driversResult.data ?? []) as DriverFinanceQueryRow[];

    setCompanies(companiesData);
    setDrivers(driversData);

    const companyMap = new Map<string, EmpresaFinanceQueryRow>(
      companiesData.map((item) => [item.id, item]),
    );

    const mappedRepasses = ((repassesResult.data ?? []) as RepasseQueryRow[]).map((item) => {
      const relatedEmpresa = Array.isArray(item.empresas) ? item.empresas[0] : item.empresas;
      const brutoNumber = Number(item.valor_bruto ?? 0);
      const comissaoPct = Number(item.comissao_pct ?? companyMap.get(item.empresa_id)?.comissao_pct ?? 15);
      const comissaoNumber = Number(item.valor_comissao ?? roundMoney(brutoNumber * (comissaoPct / 100)));
      const liquidoNumber = Number(item.valor_liquido ?? roundMoney(brutoNumber - comissaoNumber));

      return {
        dbId: item.id,
        id: item.codigo,
        empresaId: item.empresa_id,
        empresa: relatedEmpresa?.nome ?? companyMap.get(item.empresa_id)?.nome ?? "Empresa",
        periodo: formatMonthYearBR(item.referencia_mes),
        periodoKey: String(item.referencia_mes ?? "").slice(0, 7),
        encomendas: Number(item.total_encomendas ?? 0),
        bruto: formatCurrencyBRL(brutoNumber),
        brutoNumber,
        comissaoPct,
        comissao: formatCurrencyBRL(comissaoNumber),
        comissaoNumber,
        liquido: formatCurrencyBRL(liquidoNumber),
        liquidoNumber,
        status: item.status,
        dataPag: formatDateBR(item.data_pagamento),
        isGenerated: false,
      } satisfies RepasseRow;
    });

    const autoCalculatedMap = new Map<string, RepasseRow>();

    ((encomendasResult.data ?? []) as ShipmentFinanceQueryRow[])
      .filter((item) => item.status !== "cancelado")
      .forEach((item) => {
        const periodoKey = String(item.data_postagem ?? "").slice(0, 7);
        if (!item.empresa_id || !periodoKey) return;

        const company = companyMap.get(item.empresa_id);
        const key = `${item.empresa_id}-${periodoKey}`;
        const current = autoCalculatedMap.get(key) ?? {
          dbId: "",
          id: `AUTO-${periodoKey.replace("-", "")}-${item.empresa_id.slice(0, 4).toUpperCase()}`,
          empresaId: item.empresa_id,
          empresa: company?.nome ?? item.empresa_nome ?? "Empresa",
          periodo: formatMonthYearBR(`${periodoKey}-01`),
          periodoKey,
          encomendas: 0,
          bruto: formatCurrencyBRL(0),
          brutoNumber: 0,
          comissaoPct: Number(company?.comissao_pct ?? 15),
          comissao: formatCurrencyBRL(0),
          comissaoNumber: 0,
          liquido: formatCurrencyBRL(0),
          liquidoNumber: 0,
          status: "pendente" as RepasseStatus,
          dataPag: "—",
          isGenerated: true,
        };

        current.encomendas += 1;
        current.brutoNumber = roundMoney(current.brutoNumber + Number(item.valor_frete ?? 0));
        current.comissaoNumber = roundMoney(current.brutoNumber * (current.comissaoPct / 100));
        current.liquidoNumber = roundMoney(current.brutoNumber - current.comissaoNumber);
        current.bruto = formatCurrencyBRL(current.brutoNumber);
        current.comissao = formatCurrencyBRL(current.comissaoNumber);
        current.liquido = formatCurrencyBRL(current.liquidoNumber);

        autoCalculatedMap.set(key, current);
      });

    const consolidatedMap = new Map<string, RepasseRow>();

    mappedRepasses.forEach((item) => {
      consolidatedMap.set(`${item.empresaId}-${item.periodoKey}`, item);
    });

    autoCalculatedMap.forEach((item, key) => {
      const existing = consolidatedMap.get(key);
      if (!existing) {
        consolidatedMap.set(key, item);
        return;
      }

      const comissaoPct = Number(existing.comissaoPct || item.comissaoPct || 15);
      const brutoNumber = item.brutoNumber;
      const comissaoNumber = roundMoney(brutoNumber * (comissaoPct / 100));
      const liquidoNumber = roundMoney(brutoNumber - comissaoNumber);

      consolidatedMap.set(key, {
        ...existing,
        empresaId: existing.empresaId || item.empresaId,
        empresa: existing.empresa || item.empresa,
        encomendas: item.encomendas,
        brutoNumber,
        bruto: formatCurrencyBRL(brutoNumber),
        comissaoPct,
        comissaoNumber,
        comissao: formatCurrencyBRL(comissaoNumber),
        liquidoNumber,
        liquido: formatCurrencyBRL(liquidoNumber),
      });
    });

    const consolidatedRepasses = Array.from(consolidatedMap.values()).sort(
      (a, b) => b.periodoKey.localeCompare(a.periodoKey) || a.empresa.localeCompare(b.empresa),
    );

    let mappedManualEntries: ManualEntryRow[] = [];
    let manualReady = true;

    if (manualEntriesResult.error) {
      const isMissingManualFeature = /financeiro_lancamentos|vw_financeiro_lancamentos|does not exist|schema cache/i.test(manualEntriesResult.error.message);
      if (!isMissingManualFeature) {
        setError(manualEntriesResult.error.message);
      }
      manualReady = false;
    } else {
      mappedManualEntries = ((manualEntriesResult.data ?? []) as ManualEntryQueryRow[]).map((item) => ({
        dbId: item.id,
        id: item.codigo,
        tipo: item.tipo,
        categoria: item.categoria,
        kind: item.kind ?? "manual",
        descricao: item.descricao,
        favorecido: item.favorecido_nome,
        valor: formatCurrencyBRL(item.valor),
        valorNumber: Number(item.valor ?? 0),
        percentual: item.percentual ? `${Number(item.percentual).toFixed(2)}%` : "—",
        percentualNumber: Number(item.percentual ?? 0),
        periodo: formatMonthYearBR(item.referencia_mes),
        periodoKey: String(item.referencia_mes ?? "").slice(0, 7),
        dataLancamento: formatDateBR(item.data_lancamento),
        dataPagamento: formatDateBR(item.data_pagamento),
        status: item.status,
        observacoes: item.observacoes ?? "",
        driverId: item.driver_id ?? "",
        companyId: item.company_id ?? "",
        driverName: item.driver_name ?? "",
        companyName: item.company_name ?? companyMap.get(item.company_id ?? "")?.nome ?? "",
        paymentMethod: item.payment_method ?? "",
      }));
    }

    const allPeriods = Array.from(
      new Set([...consolidatedRepasses.map((item) => item.periodoKey), ...mappedManualEntries.map((item) => item.periodoKey)].filter(Boolean)),
    ).sort((a, b) => b.localeCompare(a));

    setRepasses(consolidatedRepasses);
    setManualEntries(mappedManualEntries);
    setManualModuleAvailable(manualReady);
    setSelectedPeriod((prev) => prev || allPeriods[0] || "");
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const periodOptions = useMemo(() => {
    return Array.from(new Set([...repasses.map((item) => item.periodoKey), ...manualEntries.map((item) => item.periodoKey)]))
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [repasses, manualEntries]);

  const filteredRepasses = useMemo(() => {
    if (!selectedPeriod) return repasses;
    return repasses.filter((item) => item.periodoKey === selectedPeriod);
  }, [repasses, selectedPeriod]);

  const filteredManualEntries = useMemo(() => {
    return manualEntries.filter((item) => {
      const matchesPeriod = !selectedPeriod || item.periodoKey === selectedPeriod;
      const matchesDriver = !selectedDriverFilter || item.driverId === selectedDriverFilter;
      return matchesPeriod && matchesDriver;
    });
  }, [manualEntries, selectedDriverFilter, selectedPeriod]);

  const activeDriverOptions = useMemo(
    () => drivers.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name)),
    [drivers],
  );

  const availableDriversForForm = useMemo(() => {
    return activeDriverOptions.filter((item) => !entryForm.companyId || item.company_id === entryForm.companyId);
  }, [activeDriverOptions, entryForm.companyId]);

  const driverTotals = useMemo(() => {
    const grouped = new Map<string, { driverName: string; companyName: string; total: number; count: number }>();

    filteredManualEntries
      .filter((item) => item.tipo === "saida" && ["pagamento_motorista", "repasse_motorista"].includes(item.categoria))
      .forEach((item) => {
        const key = item.driverId || item.favorecido;
        const current = grouped.get(key) ?? {
          driverName: item.driverName || item.favorecido,
          companyName: item.companyName || "—",
          total: 0,
          count: 0,
        };

        current.total += item.valorNumber;
        current.count += 1;
        grouped.set(key, current);
      });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total || a.driverName.localeCompare(b.driverName));
  }, [filteredManualEntries]);

  const persistRepasseStatus = async (repasse: RepasseRow, nextStatus: RepasseStatus) => {
    const { start, end } = getMonthRange(repasse.periodoKey);
    const payload = {
      empresa_id: repasse.empresaId,
      referencia_mes: start,
      periodo_inicio: start,
      periodo_fim: end,
      total_encomendas: repasse.encomendas,
      valor_bruto: repasse.brutoNumber,
      comissao_pct: repasse.comissaoPct,
      valor_comissao: repasse.comissaoNumber,
      valor_liquido: repasse.liquidoNumber,
      status: nextStatus,
      data_pagamento: nextStatus === "pago" ? new Date().toISOString().slice(0, 10) : null,
      observacoes: repasse.isGenerated ? "Gerado automaticamente a partir das encomendas do sistema." : undefined,
    };

    if (repasse.dbId) {
      return supabase.from("repasses").update(payload).eq("id", repasse.dbId);
    }

    return supabase.from("repasses").insert(payload);
  };

  const handleRepasseStatusChange = async (repasse: RepasseRow, nextStatus: RepasseStatus) => {
    setError("");
    setSuccess("");

    const { error: updateError } = await persistRepasseStatus(repasse, nextStatus);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Repasse ${repasse.id} atualizado para ${statusMap[nextStatus].label}.`);
    await loadData();
  };

  const handleMarkAsPaid = async (repasse: RepasseRow) => {
    await handleRepasseStatusChange(repasse, "pago");
  };

  const handleProcessPending = async () => {
    const pendentes = filteredRepasses.filter((item) => item.status !== "pago");
    if (pendentes.length === 0) {
      setSuccess("Não há repasses pendentes para processar neste período.");
      return;
    }

    for (const repasse of pendentes) {
      const { error: updateError } = await persistRepasseStatus(repasse, "pago");
      if (updateError) {
        setError(updateError.message);
        return;
      }
    }

    setSuccess("Repasses pendentes processados com sucesso.");
    await loadData();
  };

  const handleEntryFieldChange = (field: keyof typeof initialEntryForm, value: string) => {
    setEntryForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "categoria") {
        if (value === "repasse_motorista") {
          next.tipo = "saida";
          next.kind = "repasse_motorista";
        } else if (prev.kind === "repasse_motorista") {
          next.kind = "manual";
          next.companyId = "";
          next.driverId = "";
        }
      }

      if (field === "companyId") {
        next.driverId = "";
      }

      if (field === "driverId") {
        const driver = drivers.find((item) => item.id === value);
        if (driver) {
          next.companyId = driver.company_id;
          next.favorecido = driver.name;
          if (!next.descricao || next.kind === "repasse_motorista") {
            next.descricao = `Repasse de motorista — ${driver.name}`;
          }
        }
      }

      return next;
    });
  };

  const handleSaveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const isDriverRepasse = entryForm.categoria === "repasse_motorista" || entryForm.kind === "repasse_motorista";

    if (!entryForm.favorecido || !entryForm.descricao || !entryForm.valor || Number(entryForm.valor) <= 0) {
      setError("Preencha favorecido, descrição e valor do lançamento.");
      setSaving(false);
      return;
    }

    if (isDriverRepasse && (!entryForm.companyId || !entryForm.driverId || !entryForm.paymentMethod)) {
      setError("Selecione empresa, motorista e forma de pagamento para o repasse.");
      setSaving(false);
      return;
    }

    const selectedDriver = drivers.find((item) => item.id === entryForm.driverId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("financeiro_lancamentos").insert({
      tipo: entryForm.tipo,
      categoria: entryForm.categoria,
      kind: isDriverRepasse ? "repasse_motorista" : entryForm.kind,
      company_id: entryForm.companyId || selectedDriver?.company_id || null,
      driver_id: entryForm.driverId || null,
      favorecido_nome: selectedDriver?.name ?? entryForm.favorecido,
      descricao: entryForm.descricao,
      valor: Number(entryForm.valor),
      percentual: entryForm.percentual ? Number(entryForm.percentual) : null,
      payment_method: isDriverRepasse ? entryForm.paymentMethod : null,
      referencia_mes: `${entryForm.referenciaMes}-01`,
      data_lancamento: entryForm.dataLancamento,
      status: entryForm.status,
      data_pagamento: entryForm.status === "pago" ? entryForm.dataLancamento : null,
      observacoes: entryForm.observacoes || null,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setEntryForm(initialEntryForm);
    setShowEntryModal(false);
    setSaving(false);
    setSuccess("Lançamento financeiro registrado com sucesso.");
    await loadData();
  };

  const handleManualEntryStatusChange = async (entry: ManualEntryRow, nextStatus: RepasseStatus) => {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("financeiro_lancamentos")
      .update({
        status: nextStatus,
        data_pagamento: nextStatus === "pago" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", entry.dbId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Lançamento ${entry.id} atualizado para ${statusMap[nextStatus].label}.`);
    await loadData();
  };

  const handlePayManualEntry = async (entry: ManualEntryRow) => {
    await handleManualEntryStatusChange(entry, "pago");
  };

  const repassesPendentes = filteredRepasses.filter((item) => item.status !== "pago");
  const totalPendente = repassesPendentes.length;
  const valorPendente = formatCurrencyBRL(repassesPendentes.reduce((sum, item) => sum + item.liquidoNumber, 0));
  const valorPago = formatCurrencyBRL(filteredRepasses.filter((item) => item.status === "pago").reduce((sum, item) => sum + item.liquidoNumber, 0));
  const totalComissao = formatCurrencyBRL(filteredRepasses.reduce((sum, item) => sum + item.comissaoNumber, 0));
  const totalBruto = formatCurrencyBRL(filteredRepasses.reduce((sum, item) => sum + item.brutoNumber, 0));
  const totalLiquido = formatCurrencyBRL(filteredRepasses.reduce((sum, item) => sum + item.liquidoNumber, 0));

  const totalMotoristas = formatCurrencyBRL(
    filteredManualEntries
      .filter((item) => ["pagamento_motorista", "repasse_motorista"].includes(item.categoria) && item.tipo === "saida")
      .reduce((sum, item) => sum + item.valorNumber, 0),
  );

  const totalParceirosExternos = formatCurrencyBRL(
    filteredManualEntries
      .filter((item) => item.categoria === "repasse_parceiro_externo" && item.tipo === "saida")
      .reduce((sum, item) => sum + item.valorNumber, 0),
  );

  const totalLancamentosAvulsos = formatCurrencyBRL(
    filteredManualEntries.reduce((sum, item) => sum + (item.tipo === "saida" ? item.valorNumber : -item.valorNumber), 0),
  );

  const isDriverRepasseForm = entryForm.categoria === "repasse_motorista" || entryForm.kind === "repasse_motorista";

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Financeiro — Repasses e Lançamentos
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Controle de comissões, parceiros externos e pagamentos de motoristas
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" id="btn-export-financeiro">📥 Exportar</button>
          <button className="btn btn-secondary" onClick={() => setShowEntryModal(true)}>➕ Novo Lançamento</button>
          <button className="btn btn-primary" id="btn-processar-repasse" onClick={() => void handleProcessPending()}>💸 Processar Repasses</button>
        </div>
      </div>

      {(error || success || !manualModuleAvailable) && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            borderColor: error ? "rgba(239,68,68,0.25)" : !manualModuleAvailable ? "rgba(251,191,36,0.25)" : "rgba(16,185,129,0.25)",
            color: error ? "#fca5a5" : !manualModuleAvailable ? "#fde68a" : "#86efac",
          }}
        >
          {error || success || "Para liberar lançamentos avulsos, rode a nova migração financeira no Supabase."}
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: "20px" }}>
        {[
          { label: "Repasses Pagos", value: valorPago, icon: "✅", color: "emerald", sub: `${filteredRepasses.filter((item) => item.status === "pago").length} empresas` },
          { label: "Pendentes de Pagamento", value: valorPendente, icon: "⏳", color: "amber", sub: `${totalPendente} empresas` },
          { label: "Pagamentos a Motoristas", value: totalMotoristas, icon: "🚚", color: "rose", sub: "lançamentos do período" },
          { label: "Repasse Parceiro Externo", value: totalParceirosExternos, icon: "🤝", color: "indigo", sub: "saídas do período" },
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Motorista</span>
            <select value={selectedDriverFilter} onChange={(e) => setSelectedDriverFilter(e.target.value)} style={{ minWidth: "220px" }}>
              <option value="">Todos os motoristas</option>
              {activeDriverOptions.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Referência: <strong style={{ color: "var(--text-secondary)" }}>{selectedPeriod ? formatMonthYearBR(`${selectedPeriod}-01`) : "Todos"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: "16px" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="card-title">Totais de Repasses por Motorista</div>
          <div className="card-subtitle">Filtro administrativo por período e motorista</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Empresa</th>
                <th>Lançamentos</th>
                <th>Total no Período</th>
              </tr>
            </thead>
            <tbody>
              {driverTotals.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Nenhum repasse de motorista encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                driverTotals.map((item) => (
                  <tr key={`${item.driverName}-${item.companyName}`}>
                    <td><strong>{item.driverName}</strong></td>
                    <td style={{ fontSize: "12px" }}>{item.companyName}</td>
                    <td style={{ fontSize: "12px", textAlign: "right" }}>{item.count}</td>
                    <td><strong style={{ color: "var(--brand-success)" }}>{formatCurrencyBRL(item.total)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: "20px" }}>
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
              ) : filteredRepasses.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Nenhum repasse encontrado para o período selecionado.
                  </td>
                </tr>
              ) : (
                filteredRepasses.map((rep) => {
                  const st = statusMap[rep.status] ?? statusMap.pendente;

                  return (
                    <tr key={rep.dbId}>
                      <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{rep.id}</strong></td>
                      <td><strong>{rep.empresa}</strong></td>
                      <td style={{ fontSize: "12px" }}>{rep.periodo}</td>
                      <td style={{ textAlign: "right", fontSize: "12px" }}>{rep.encomendas}</td>
                      <td style={{ fontSize: "12px" }}>{rep.bruto}</td>
                      <td style={{ color: "#f87171", fontSize: "12px" }}>- {rep.comissao}</td>
                      <td><strong style={{ color: "var(--brand-success)", fontSize: "13px" }}>{rep.liquido}</strong></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span className={`badge ${st.class}`}>{st.label}</span>
                          <select
                            value={rep.status}
                            onChange={(e) => void handleRepasseStatusChange(rep, e.target.value as RepasseStatus)}
                            style={{ minWidth: "130px", fontSize: "11px", padding: "6px 8px" }}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td style={{ fontSize: "12px" }}>{rep.dataPag}</td>
                      <td>
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

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div className="card-title">Lançamentos Avulsos</div>
            <div className="card-subtitle">Use para parceiros externos, ajustes e repasses de motoristas</div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Saldo lançado no período: <strong style={{ color: "var(--text-primary)" }}>{totalLancamentosAvulsos}</strong>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Favorecido</th>
                <th>Descrição</th>
                <th>Referência</th>
                <th>Valor</th>
                <th>%</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filteredManualEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    Nenhum lançamento avulso registrado neste período.
                  </td>
                </tr>
              ) : (
                filteredManualEntries.map((entry) => {
                  const entryType = entryTypeMap[entry.tipo];
                  const st = statusMap[entry.status] ?? statusMap.pendente;

                  return (
                    <tr key={entry.dbId}>
                      <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{entry.id}</strong></td>
                      <td><span className={`badge ${entryType.class}`}>{entryType.label}</span></td>
                      <td style={{ fontSize: "12px" }}>{entryCategoryMap[entry.categoria]}</td>
                      <td style={{ fontSize: "12px" }}>
                        <strong>{entry.driverName || entry.favorecido}</strong>
                        {entry.companyName && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{entry.companyName}</div>}
                        {entry.paymentMethod && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", textTransform: "capitalize" }}>Pagamento: {entry.paymentMethod.replaceAll("_", " ")}</div>}
                      </td>
                      <td style={{ fontSize: "12px" }}>
                        <div>{entry.descricao}</div>
                        {entry.observacoes && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{entry.observacoes}</div>}
                      </td>
                      <td style={{ fontSize: "12px" }}>{entry.periodo}</td>
                      <td style={{ fontSize: "12px", color: entry.tipo === "saida" ? "#fca5a5" : "#86efac" }}>
                        {entry.tipo === "saida" ? "- " : "+ "}{entry.valor}
                      </td>
                      <td style={{ fontSize: "12px" }}>{entry.percentual}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span className={`badge ${st.class}`}>{st.label}</span>
                          <select
                            value={entry.status}
                            onChange={(e) => void handleManualEntryStatusChange(entry, e.target.value as RepasseStatus)}
                            style={{ minWidth: "130px", fontSize: "11px", padding: "6px 8px" }}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        {entry.status !== "pago" && (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: "rgba(16,185,129,0.1)",
                              color: "#34d399",
                              border: "1px solid rgba(16,185,129,0.2)",
                              fontSize: "11px",
                            }}
                            onClick={() => void handlePayManualEntry(entry)}
                          >
                            ✔ Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEntryModal && (
        <div className="modal-overlay" onClick={() => { setShowEntryModal(false); setEntryForm(initialEntryForm); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <form onSubmit={handleSaveEntry}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Novo Lançamento Financeiro</div>
                  <div className="modal-subtitle">Cadastre parceiro externo, motorista ou outro ajuste financeiro</div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setShowEntryModal(false); setEntryForm(initialEntryForm); }} style={{ fontSize: "18px" }}>
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="grid-3">
                  <div className="input-group">
                    <label>Tipo</label>
                    <select value={entryForm.tipo} onChange={(e) => handleEntryFieldChange("tipo", e.target.value)}>
                      {Object.entries(entryTypeMap).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Categoria</label>
                    <select value={entryForm.categoria} onChange={(e) => handleEntryFieldChange("categoria", e.target.value)}>
                      {Object.entries(entryCategoryMap).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Status</label>
                    <select value={entryForm.status} onChange={(e) => handleEntryFieldChange("status", e.target.value)}>
                      {Object.entries(statusMap).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isDriverRepasseForm && (
                  <div className="grid-3">
                    <div className="input-group">
                      <label>Empresa *</label>
                      <select value={entryForm.companyId} onChange={(e) => handleEntryFieldChange("companyId", e.target.value)} required>
                        <option value="">Selecione</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>{company.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Motorista *</label>
                      <select value={entryForm.driverId} onChange={(e) => handleEntryFieldChange("driverId", e.target.value)} required>
                        <option value="">Selecione</option>
                        {availableDriversForForm.map((driver) => (
                          <option key={driver.id} value={driver.id}>{driver.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Forma de Pagamento *</label>
                      <select value={entryForm.paymentMethod} onChange={(e) => handleEntryFieldChange("paymentMethod", e.target.value)} required>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                        <option value="pix">PIX</option>
                        <option value="link_pagamento">Link de Pagamento</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label>Favorecido *</label>
                    <input
                      type="text"
                      value={entryForm.favorecido}
                      onChange={(e) => handleEntryFieldChange("favorecido", e.target.value)}
                      placeholder={isDriverRepasseForm ? "Preenchido pelo motorista selecionado" : "Empresa parceira ou motorista"}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Descrição *</label>
                    <input type="text" value={entryForm.descricao} onChange={(e) => handleEntryFieldChange("descricao", e.target.value)} placeholder="Ex: repasse de carga recebida fora do sistema" required />
                  </div>
                </div>

                <div className="grid-4">
                  <div className="input-group">
                    <label>Valor *</label>
                    <input type="number" min="0.01" step="0.01" value={entryForm.valor} onChange={(e) => handleEntryFieldChange("valor", e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="input-group">
                    <label>Percentual %</label>
                    <input type="number" min="0" max="100" step="0.01" value={entryForm.percentual} onChange={(e) => handleEntryFieldChange("percentual", e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="input-group">
                    <label>Mês de Referência</label>
                    <input type="month" value={entryForm.referenciaMes} onChange={(e) => handleEntryFieldChange("referenciaMes", e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label>Data do Lançamento</label>
                    <input type="date" value={entryForm.dataLancamento} onChange={(e) => handleEntryFieldChange("dataLancamento", e.target.value)} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Observações</label>
                  <textarea value={entryForm.observacoes} onChange={(e) => handleEntryFieldChange("observacoes", e.target.value)} rows={3} placeholder="Detalhes do acerto, rota, porcentagem ou nome do motorista" style={{ resize: "none" }} />
                </div>
              </div>

              <div className="divider" />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEntryModal(false); setEntryForm(initialEntryForm); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Salvando..." : "💾 Salvar Lançamento"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
