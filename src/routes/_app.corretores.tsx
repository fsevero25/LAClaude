import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~/integrations/supabase/client";
import type { Profile, UserRole, Team, AppRole } from "~/integrations/supabase/types";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/_app/corretores")({
  component: CorretoresPage,
});

interface CorretorRow extends Profile {
  role?: AppRole;
}

function CorretoresPage() {
  const [corretores, setCorretores] = useState<CorretorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const roleMap = new Map<string, AppRole>();
    for (const r of (roles as UserRole[]) ?? []) {
      roleMap.set(r.user_id, r.role);
    }

    const rows: CorretorRow[] = ((profiles as Profile[]) ?? []).map((p) => ({
      ...p,
      role: roleMap.get(p.id),
    }));

    setCorretores(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = corretores.filter((c) => {
    const matchSearch =
      !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchTeam = teamFilter === "all" || c.team === teamFilter;
    return matchSearch && matchTeam;
  });

  const ROLE_LABELS: Record<AppRole, string> = {
    admin: "Admin",
    gestor: "Gestor",
    corretor: "Corretor",
  };

  const ROLE_COLORS: Record<AppRole, string> = {
    admin: "var(--danger)",
    gestor: "var(--accent)",
    corretor: "var(--muted)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, flex: 1 }}>Corretores</h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "7px",
            padding: "0.3rem 0.6rem",
          }}
        >
          <Search size={13} color="var(--muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--foreground)",
              fontSize: "0.8rem",
              width: 160,
            }}
          />
        </div>

        {(["all", "PB", "FLN"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: teamFilter === t ? "var(--foreground)" : "var(--border)",
              background: teamFilter === t ? "var(--foreground)" : "transparent",
              color: teamFilter === t ? "var(--background)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {t === "all" ? "Todos" : t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
        {loading ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
            <Users size={36} style={{ marginBottom: "0.75rem", opacity: 0.4 }} />
            <p>Nenhum corretor encontrado</p>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-raised)" }}>
                  {["Nome", "Email", "Equipe", "Função", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.6rem 1rem",
                        textAlign: "left",
                        color: "var(--muted)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>
                      {c.full_name ?? "—"}
                    </td>
                    <td style={{ padding: "0.6rem 1rem", color: "var(--muted)" }}>
                      {c.email ?? "—"}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {c.team ? (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: c.team === "PB" ? "var(--team-pb)" : "var(--team-fln)",
                            background:
                              c.team === "PB"
                                ? "rgba(202,138,4,0.12)"
                                : "rgba(22,163,74,0.12)",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "4px",
                          }}
                        >
                          {c.team}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      {c.role ? (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: ROLE_COLORS[c.role],
                          }}
                        >
                          {ROLE_LABELS[c.role]}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Sem role</span>
                      )}
                    </td>
                    <td style={{ padding: "0.6rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: c.active ? "var(--success)" : "var(--muted)",
                        }}
                      >
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
