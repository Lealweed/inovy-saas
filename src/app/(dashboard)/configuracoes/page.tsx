import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações | Inovy",
};

export default function ConfiguracoesPage() {
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

      <div className="grid-2" style={{ gap: "20px" }}>
        {/* Perfil da empresa */}
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
              <input type="text" defaultValue="Inovy Logística Ltda." />
            </div>
            <div className="input-group">
              <label>CNPJ</label>
              <input type="text" defaultValue="12.345.678/0001-99" />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Telefone</label>
                <input type="text" defaultValue="(11) 3000-0000" />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" defaultValue="contato@inovy.com.br" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }}>
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Comissões */}
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
              <input type="number" defaultValue="15" min="0" max="100" />
            </div>
            <div className="input-group">
              <label>Prazo de Repasse (dias)</label>
              <input type="number" defaultValue="30" min="1" />
            </div>
            <div className="input-group">
              <label>Dia do Fechamento</label>
              <select>
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
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }}>
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Notificações */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🔔 Notificações</div>
              <div className="card-subtitle">Configure alertas e avisos</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "Novas encomendas recebidas", active: true },
              { label: "Encomendas aguardando retirada > 24h", active: true },
              { label: "Repasses vencidos", active: true },
              { label: "Novos parceiros cadastrados", active: false },
              { label: "Relatório diário automático", active: true },
            ].map((notif, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{notif.label}</span>
                <div style={{
                  width: "36px",
                  height: "20px",
                  background: notif.active ? "var(--brand-primary)" : "var(--bg-overlay)",
                  borderRadius: "10px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: "14px",
                    height: "14px",
                    background: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "3px",
                    left: notif.active ? "19px" : "3px",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Segurança */}
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
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Nova Senha</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Confirmar Nova Senha</label>
              <input type="password" placeholder="••••••••" />
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
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }}>
              Atualizar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
