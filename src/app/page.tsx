"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("E-mail ou senha inválidos. Se for o primeiro acesso, redefina a senha no Supabase Auth.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decorations */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 80%)
        `,
        pointerEvents: "none",
      }} />

      {/* Grid pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            background: "var(--gradient-brand)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: "800",
            color: "var(--text-inverse)",
            margin: "0 auto 16px",
            boxShadow: "0 0 32px rgba(255,255,255,0.10), 0 8px 20px rgba(0,0,0,0.35)",
            letterSpacing: "-1px",
          }}>
            In
          </div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
          }}>
            Inovy
          </h1>
          <p style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}>
            Plataforma de Gestão de Encomendas
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--text-primary)",
            }}>
              Acesso ao sistema
            </h2>
            <p style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}>
              Entre com suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f87171",
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a href="#" style={{
                fontSize: "12px",
                color: "var(--brand-primary-light)",
                textDecoration: "none",
              }}>
                Esqueceu a senha?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{
                marginTop: "4px",
                width: "100%",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(0,0,0,0.2)",
                    borderTopColor: "var(--text-inverse)",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Entrando...
                </>
              ) : (
                "Entrar no sistema →"
              )}
            </button>
          </form>

          <div style={{
            marginTop: "20px",
            padding: "12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}>
            <strong style={{ color: "var(--text-secondary)" }}>🔐 Primeiro acesso:</strong>{" "}
            entre com um usuário válido do Supabase Auth e altere a senha após o login.
          </div>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "24px",
        }}>
          © 2026 Inovy. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
