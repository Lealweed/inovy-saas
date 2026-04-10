"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const STORAGE_KEY = "inovy-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="layout-root">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <div className={`main-content ${collapsed ? "sidebar-is-collapsed" : ""}`}>
        <Topbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
