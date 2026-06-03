import React, { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import {
  LayoutDashboard,
  Calendar,
  BarChart2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { DiagnosticsDrawer } from "./DiagnosticsDrawer";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/pipeline", label: "Pipeline", icon: <LayoutDashboard size={18} /> },
  { to: "/plantoes", label: "Plantões", icon: <Calendar size={18} /> },
  { to: "/relatorios", label: "Relatórios", icon: <BarChart2 size={18} /> },
  { to: "/corretores", label: "Corretores", icon: <Users size={18} /> },
  { to: "/configuracoes", label: "Configurações", icon: <Settings size={18} /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const router = useRouterState();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [diagOpen, setDiagOpen] = useState(false);

  const currentPath = router.location.pathname;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 220 : 60,
          minHeight: "100vh",
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Logo + toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 0.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {/* LA monogram SVG */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <rect width="32" height="32" rx="7" fill="#1a1a1a" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="#c8c8c8"
                fontSize="13"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
              >
                LA
              </text>
            </svg>
            {sidebarOpen && (
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap" }}>
                LACrm
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  margin: "0.1rem 0.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: isActive ? "var(--foreground)" : "var(--muted)",
                  background: isActive ? "var(--surface-raised)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "0.875rem",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {item.icon}
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Diagnostics + user info */}
        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setDiagOpen(true)}
            title="Diagnósticos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.5rem",
              borderRadius: "8px",
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              marginBottom: "0.5rem",
            }}
          >
            <Activity size={16} />
            {sidebarOpen && "Diagnósticos"}
          </button>

          {sidebarOpen && profile && (
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.full_name ?? profile.email}
              </p>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)", textTransform: "capitalize" }}>
                {role ?? "corretor"}{profile.team ? ` · ${profile.team}` : ""}
              </p>
            </div>
          )}

          <button
            onClick={signOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.5rem",
              borderRadius: "8px",
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <LogOut size={16} />
            {sidebarOpen && "Sair"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>

      <DiagnosticsDrawer open={diagOpen} onClose={() => setDiagOpen(false)} />
    </div>
  );
}
