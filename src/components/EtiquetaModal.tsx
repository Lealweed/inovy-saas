"use client";

import { useRef } from "react";
import { getQRCodeUrl } from "@/lib/qrcode";

export interface EtiquetaData {
  id: string;
  remetente: string;
  remetenteEndereco?: string;
  remetenteCidade?: string;
  destinatario: string;
  destinatarioEndereco?: string;
  destinatarioCidade: string;
  destinatarioTelefone?: string;
  empresa: string;
  peso: string;
  valor: string;
  data: string;
  previsao: string;
  observacoes?: string;
  fragil?: boolean;
  urgente?: boolean;
}

interface Props {
  data: EtiquetaData;
  onClose: () => void;
}

export default function EtiquetaModal({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = document.getElementById("etiqueta-print-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Etiqueta — ${data.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Inter', sans-serif;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }

          .etiqueta {
            width: 100mm;
            min-height: 150mm;
            border: 2px solid #1a1a2e;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            font-family: 'Inter', sans-serif;
          }

          .etiqueta-header {
            background: #1a1a2e;
            color: white;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .etiqueta-logo {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .logo-box {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #111111, #525252);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 900;
            color: white;
          }

          .logo-name {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .etiqueta-id {
            font-size: 11px;
            font-family: monospace;
            font-weight: 700;
            color: #d4d4d4;
            letter-spacing: 0.5px;
          }

          .etiqueta-badges {
            display: flex;
            gap: 4px;
            padding: 6px 14px;
            background: #f8f9ff;
            border-bottom: 1px solid #e5e7f0;
          }

          .badge-fragil {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fbbf24;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .badge-urgente {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #f87171;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .etiqueta-body {
            padding: 12px 14px;
          }

          .section-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            margin-bottom: 3px;
          }

          .section-value {
            font-size: 13px;
            font-weight: 700;
            color: #1a1a2e;
            line-height: 1.3;
          }

          .section-sub {
            font-size: 10px;
            color: #6b7280;
            margin-top: 1px;
            line-height: 1.4;
          }

          .arrow-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 0;
            border-top: 1px dashed #e5e7f0;
            border-bottom: 1px dashed #e5e7f0;
            margin: 10px 0;
          }

          .arrow-block {
            flex: 1;
          }

          .arrow-icon {
            font-size: 18px;
            color: #111111;
            flex-shrink: 0;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            padding: 10px;
            background: #f8f9ff;
            border-radius: 6px;
            margin: 10px 0;
          }

          .info-item {
            text-align: center;
          }

          .info-val {
            font-size: 12px;
            font-weight: 800;
            color: #1a1a2e;
          }

          .info-lbl {
            font-size: 8px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .divider-line {
            border: 0;
            border-top: 1px solid #e5e7f0;
            margin: 8px 0;
          }

          .etiqueta-footer {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-top: 1px solid #e5e7f0;
            background: #fafafa;
          }

          .qr-area {
            flex-shrink: 0;
          }

          .qr-area img {
            width: 80px;
            height: 80px;
            display: block;
          }

          .barcode-area {
            flex: 1;
          }

          .barcode-text {
            font-family: monospace;
            font-size: 8px;
            color: #9ca3af;
            text-align: center;
            margin-top: 4px;
            letter-spacing: 1px;
          }

          .empresa-tag {
            text-align: center;
            font-size: 9px;
            color: #6b7280;
            padding: 4px 14px 8px;
            background: #fafafa;
          }

          .empresa-tag strong {
            color: #1a1a2e;
          }

          .obs-block {
            padding: 6px 14px;
            background: #fffbeb;
            border-top: 1px solid #fbbf24;
            font-size: 9px;
            color: #78350f;
          }

          /* Barcode visual lines */
          .barcode-visual {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 32px;
            gap: 1px;
          }

          .bar {
            width: 2px;
            background: #1a1a2e;
          }

          @media print {
            body { padding: 0; }
            .etiqueta { border-color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="etiqueta">
          <div class="etiqueta-header">
            <div class="etiqueta-logo">
              <div class="logo-box">In</div>
              <span class="logo-name">Inovy</span>
            </div>
            <span class="etiqueta-id">${data.id}</span>
          </div>

          ${(data.fragil || data.urgente) ? `
          <div class="etiqueta-badges">
            ${data.fragil ? '<span class="badge-fragil">⚠️ Frágil</span>' : ""}
            ${data.urgente ? '<span class="badge-urgente">🚨 Urgente</span>' : ""}
          </div>` : ""}

          <div class="etiqueta-body">
            <!-- Remetente -->
            <div style="margin-bottom: 8px;">
              <div class="section-label">📤 Remetente</div>
              <div class="section-value">${data.remetente}</div>
              ${data.remetenteCidade ? `<div class="section-sub">${data.remetenteCidade}</div>` : ""}
              ${data.remetenteEndereco ? `<div class="section-sub">${data.remetenteEndereco}</div>` : ""}
            </div>

            <!-- Arrow divider -->
            <div class="arrow-row">
              <div class="arrow-block">
                <div class="section-label">Origem</div>
                <div style="font-size: 11px; font-weight: 600; color: #374151;">${data.remetenteCidade || "—"}</div>
              </div>
              <div class="arrow-icon">→</div>
              <div class="arrow-block">
                <div class="section-label">Destino</div>
                <div style="font-size: 11px; font-weight: 600; color: #374151;">${data.destinatarioCidade}</div>
              </div>
            </div>

            <!-- Destinatário -->
            <div style="margin-bottom: 10px;">
              <div class="section-label">📥 Destinatário</div>
              <div class="section-value">${data.destinatario}</div>
              ${data.destinatarioEndereco ? `<div class="section-sub">${data.destinatarioEndereco}</div>` : ""}
              <div class="section-sub">${data.destinatarioCidade}</div>
              ${data.destinatarioTelefone ? `<div class="section-sub">📱 ${data.destinatarioTelefone}</div>` : ""}
            </div>

            <!-- Info Grid -->
            <div class="info-grid">
              <div class="info-item">
                <div class="info-val">${data.peso}</div>
                <div class="info-lbl">Peso</div>
              </div>
              <div class="info-item">
                <div class="info-val">${data.valor}</div>
                <div class="info-lbl">Valor Frete</div>
              </div>
              <div class="info-item">
                <div class="info-val">${data.previsao}</div>
                <div class="info-lbl">Previsão</div>
              </div>
            </div>

            <hr class="divider-line" />

            <div style="font-size: 9px; color: #6b7280; margin-bottom: 2px;">
              Emitido em: ${data.data} · Transportadora: <strong style="color: #1a1a2e;">${data.empresa}</strong>
            </div>
          </div>

          ${data.observacoes ? `
          <div class="obs-block">
            ℹ️ <strong>Obs:</strong> ${data.observacoes}
          </div>` : ""}

          <div class="etiqueta-footer">
            <div class="qr-area">
              <img src="${getQRCodeUrl(`INOVY:${data.id}:${data.destinatarioCidade}`, 80)}" alt="QR Code ${data.id}" />
            </div>
            <div class="barcode-area">
              <div class="barcode-visual">
                ${generateBars()}
              </div>
              <div class="barcode-text">${data.id.replace("-", " ").toUpperCase()}</div>
              <div style="font-size: 8px; color: #9ca3af; text-align: center; margin-top: 6px;">
                Escaneie para rastrear
              </div>
            </div>
          </div>

          <div class="empresa-tag">
            Entregue por <strong>${data.empresa}</strong> · Plataforma <strong>Inovy</strong>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  const qrUrl = getQRCodeUrl(`INOVY:${data.id}:${data.destinatarioCidade}`, 120);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "20px",
          padding: "0",
          width: "100%",
          maxWidth: "780px",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeIn 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
              🏷️ Etiqueta de Envio
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Preview da etiqueta — {data.id}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              id="btn-imprimir-etiqueta"
              style={{ gap: "8px" }}
            >
              🖨️ Imprimir / Salvar PDF
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              style={{ fontSize: "18px", color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div style={{
          padding: "24px",
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          background: "var(--bg-base)",
        }}>
          {/* Etiqueta Preview */}
          <div style={{ flex: "none" }}>
            <div style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "12px",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Preview (100mm × 150mm)
            </div>
            <div
              ref={printRef}
              id="etiqueta-print-area"
              style={{
                width: "340px",
                border: "2px solid #1a1a2e",
                borderRadius: "10px",
                overflow: "hidden",
                background: "white",
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Etiqueta Header */}
              <div style={{
                background: "#1a1a2e",
                color: "white",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    background: "linear-gradient(135deg, #111111, #525252)",
                    borderRadius: "7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "900",
                    color: "white",
                  }}>
                    In
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "800", color: "white", letterSpacing: "-0.5px" }}>
                    Inovy
                  </span>
                </div>
                <span style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  fontWeight: "700",
                  color: "#d4d4d4",
                  letterSpacing: "0.5px",
                }}>
                  {data.id}
                </span>
              </div>

              {/* Badges */}
              {(data.fragil || data.urgente) && (
                <div style={{
                  display: "flex",
                  gap: "6px",
                  padding: "6px 16px",
                  background: "#f8f9ff",
                  borderBottom: "1px solid #e5e7f0",
                }}>
                  {data.fragil && (
                    <span style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fbbf24",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "700",
                    }}>
                      ⚠️ FRÁGIL
                    </span>
                  )}
                  {data.urgente && (
                    <span style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #f87171",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "700",
                    }}>
                      🚨 URGENTE
                    </span>
                  )}
                </div>
              )}

              {/* Body */}
              <div style={{ padding: "14px 16px" }}>
                {/* Remetente */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", marginBottom: "3px" }}>
                    📤 Remetente
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e" }}>{data.remetente}</div>
                  {data.remetenteCidade && (
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>{data.remetenteCidade}</div>
                  )}
                </div>

                {/* Route Arrow */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 0",
                  borderTop: "1px dashed #e5e7f0",
                  borderBottom: "1px dashed #e5e7f0",
                  margin: "8px 0",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.5px" }}>Origem</div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{data.remetenteCidade || "—"}</div>
                  </div>
                  <div style={{ fontSize: "22px", color: "#111111" }}>→</div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.5px" }}>Destino</div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{data.destinatarioCidade}</div>
                  </div>
                </div>

                {/* Destinatário */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", color: "#111111", marginBottom: "3px" }}>
                    📥 Destinatário
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#1a1a2e" }}>{data.destinatario}</div>
                  {data.destinatarioEndereco && (
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{data.destinatarioEndereco}</div>
                  )}
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>{data.destinatarioCidade}</div>
                  {data.destinatarioTelefone && (
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>📱 {data.destinatarioTelefone}</div>
                  )}
                </div>

                {/* Info Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  padding: "10px",
                  background: "#f8f9ff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7f0",
                  marginBottom: "10px",
                }}>
                  {[
                    { val: data.peso, lbl: "Peso" },
                    { val: data.valor, lbl: "Frete" },
                    { val: data.previsao, lbl: "Previsão" },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#1a1a2e" }}>{item.val}</div>
                      <div style={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" }}>{item.lbl}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                  Emitido: {data.data} · <strong style={{ color: "#374151" }}>{data.empresa}</strong>
                </div>
              </div>

              {/* Observações */}
              {data.observacoes && (
                <div style={{
                  padding: "8px 16px",
                  background: "#fffbeb",
                  borderTop: "1px solid #fbbf24",
                  fontSize: "10px",
                  color: "#78350f",
                }}>
                  ℹ️ {data.observacoes}
                </div>
              )}

              {/* Footer QR + Barcode */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderTop: "2px solid #e5e7f0",
                background: "#fafafa",
              }}>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt={`QR ${data.id}`}
                    width={80}
                    height={80}
                    style={{ display: "block", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {/* Barcode visual */}
                  <div style={{ display: "flex", alignItems: "flex-end", height: "36px", gap: "1.5px", justifyContent: "center" }}>
                    {[3, 2, 4, 2, 3, 1, 4, 2, 3, 2, 1, 4, 3, 2, 4, 1, 3, 2, 3, 4, 2, 1, 3].map((h, i) => (
                      <div key={i} style={{
                        width: i % 3 === 0 ? "3px" : "2px",
                        height: `${h * 8}px`,
                        background: "#1a1a2e",
                        borderRadius: "1px",
                      }} />
                    ))}
                  </div>
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: "9px",
                    color: "#9ca3af",
                    textAlign: "center",
                    marginTop: "4px",
                    letterSpacing: "2px",
                  }}>
                    {data.id.replace("-", "  ")}
                  </div>
                  <div style={{ fontSize: "9px", color: "#9ca3af", textAlign: "center", marginTop: "4px" }}>
                    Escaneie para rastrear
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: "center",
                fontSize: "9px",
                color: "#9ca3af",
                padding: "6px 16px 10px",
                background: "#fafafa",
                borderTop: "1px solid #e5e7f0",
              }}>
                Entregue por <strong style={{ color: "#374151" }}>{data.empresa}</strong> · Plataforma <strong style={{ color: "#111111" }}>Inovy</strong>
              </div>
            </div>
          </div>

          {/* Sidebar info panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Details */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Detalhes da Encomenda
              </div>
              {[
                { label: "Código", value: data.id, mono: true },
                { label: "Remetente", value: data.remetente },
                { label: "Destinatário", value: data.destinatario },
                { label: "Empresa", value: data.empresa },
                { label: "Peso", value: data.peso },
                { label: "Valor do frete", value: data.valor },
                { label: "Data de emissão", value: data.data },
                { label: "Previsão de entrega", value: data.previsao },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    fontFamily: item.mono ? "monospace" : "inherit",
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Print options */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Opções de Impressão
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  className="btn btn-primary"
                  onClick={handlePrint}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  🖨️ Imprimir Etiqueta
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrint}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  📄 Salvar como PDF
                </button>
              </div>
              <div style={{
                marginTop: "12px",
                padding: "10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: "1.5",
              }}>
                💡 Para salvar como PDF, selecione <strong style={{ color: "var(--text-secondary)" }}>"Salvar como PDF"</strong> na caixa de diálogo de impressão do sistema.
              </div>
            </div>

            {/* QR info */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" width={64} height={64} style={{ borderRadius: "6px", border: "1px solid var(--border-subtle)" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  QR Code de Rastreamento
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {`INOVY:${data.id}`}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Escaneie para rastrear em tempo real
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate deterministic bar heights for barcode visual
function generateBars(): string {
  const heights = [3, 2, 4, 2, 3, 1, 4, 2, 3, 2, 1, 4, 3, 2, 4, 1, 3, 2, 3, 4, 2, 1, 3];
  return heights.map((h, i) =>
    `<div class="bar" style="height: ${h * 8}px; ${i % 3 === 0 ? "width: 3px;" : ""}"></div>`
  ).join("");
}
