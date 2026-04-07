"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { icon: "⬡", label: "Dashboard", href: "/dashboard" },
  { icon: "📦", label: "Encomendas", href: "/encomendas", badge: 12 },
  { icon: "🚚", label: "Retirada & Entrega", href: "/logistica" },
  { icon: "🏢", label: "Empresas Parceiras", href: "/empresas" },
];

const financeNavItems: NavItem[] = [
  { icon: "💰", label: "Financeiro", href: "/financeiro" },
  { icon: "📊", label: "Relatórios", href: "/relatorios" },
];

const systemNavItems: NavItem[] = [
  { icon: "⚙️", label: "Configurações", href: "/configuracoes" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">In</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">Inovy</span>
          <span className="sidebar-logo-tagline">Gestão de Encomendas</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main */}
        <span className="sidebar-section-label">Principal</span>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </Link>
        ))}

        {/* Financeiro */}
        <span className="sidebar-section-label">Financeiro</span>
        {financeNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Sistema */}
        <span className="sidebar-section-label">Sistema</span>
        {systemNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={handleLogout}
          title="Sair do sistema"
        >
          <div className="sidebar-avatar">AD</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Administrador</div>
            <div className="sidebar-user-role">admin@inovy.com</div>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>→</span>
        </div>
      </div>
    </aside>
  );
}
