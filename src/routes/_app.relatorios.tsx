import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~/integrations/supabase/client";
import type { Lead, ReportSnapshot } from "~/integrations/supabase/types";
import { PIPELINE_STAGES } from "~/lib/pipeline";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";
import { Download, Trash2, BarChart2, Camera } from "lucide-react";

export const Route = createFileRoute("/_app/relatorios")({
  component: RelatoriosPage,
});

// FIXED getWeeksOfMonth — by month days (1–7, 8–14, 15–21, 22–28, 29+), NOT calendar weeks
function getWeeksOfMonth(
  year: number,
  month: number
): { start: number; end: number; label: string }[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [
    { start: 1, end: 7, label: "Semana 1" },
    { start: 8, end: 14, label: "Semana 2" },
    { start: 15, end: 21, label: "Semana 3" },
    { start: 22, end: 28, label: "Semana 4" },
  ];
  if (daysInMonth >= 29) weeks.push({ start: 29, end: daysInMonth, label: "Semana 5" });
  return weeks;
}

interface WeekStat {
  label: string;
  total: number;
  byTeam: { PB: number; FLN: number };
  closed: number;
}

function RelatoriosPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [year, mon] = month.split("-").map(Number);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(mon).padStart(2, "0")}-31`;

    const [{ data: leadsData }, { data: snapsData }] = await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59"),
      supabase
        .from("report_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setLeads((leadsData as Lead[]) ?? []);
    setSnapshots((snapsData as ReportSnapshot[]) ?? []);
    setLoading(false);
  }, [year, mon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeks = getWeeksOfMonth(year, mon - 1);

  const weekStats: WeekStat[] = weeks.map((week) => {
    const weekLeads = leads.filter((l) => {
      const day = new Date(l.created_at).getDate();
      return day >= week.start && day <= week.end;
    });

    return {
      label: week.label,
      total: weekLeads.length,
      byTeam: {
        PB: weekLeads.filter((l) => l.team === "PB").length,
        FLN: weekLeads.filter((l) => l.team === "FLN").length,
      },
      closed: weekLeads.filter((l) =>
        ["negocio_fechado", "pasta_feita"].includes(l.status)
      ).length,
    };
  });

  // Funnel data
  const funnelStages = PIPELINE_STAGES.filter((s) => !s.isTerminal);
  const funnelData = funnelStages.map((stage) => ({
    label: stage.label,
    count: leads.filter((l) => l.status === stage.id).length,
    color: stage.color,
  }));
  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1);

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      const { data: snap, error } = await supabase
        .from("report_snapshots")
        .insert({
          title: `Relatório ${month}`,
          data: {
            weekStats,
            funnelData,
            totalLeads: leads.length,
            month,
            generatedAt: new Date().toISOString(),
          },
          created_by: user?.id ?? null,
          pdf_url: null,
        })
        .select()
        .single();

      if (error) throw error;
      setSnapshots((prev) => [snap as ReportSnapshot, ...prev]);
      toast.success("Snapshot salvo!");
    } catch (e) {
      toast.error("Erro ao salvar snapshot");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    const { error } = await supabase.from("report_snapshots").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar");
    } else {
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Snapshot removido");
    }
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
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, flex: 1 }}>Relatórios</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: "0.3rem 0.6rem",
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--foreground)",
            fontSize: "0.8rem",
          }}
        />
        <button
          onClick={handleSaveSnapshot}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.9rem",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "7px",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          <Camera size={13} />
          {saving ? "Salvando..." : "Salvar Snapshot"}
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {loading ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
            Carregando dados...
          </div>
        ) : (
          <>
            {/* Weekly stats */}
            <section>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                Leads por Semana — {month}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {weekStats.map((w) => (
                  <div
                    key={w.label}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "1rem",
                    }}
                  >
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
                      {w.label}
                    </p>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{w.total}</p>
                    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--team-pb)" }}>PB: {w.byTeam.PB}</span>
                      <span style={{ color: "var(--team-fln)" }}>FLN: {w.byTeam.FLN}</span>
                    </div>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "var(--success)" }}>
                      {w.closed} fechados
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Funnel chart */}
            <section>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                Funil de Conversão
              </h2>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {funnelData
                  .filter((d) => d.count > 0)
                  .map((d) => (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: 200, flexShrink: 0 }}>
                        {d.label}
                      </span>
                      <div
                        style={{
                          height: 18,
                          background: d.color,
                          borderRadius: "4px",
                          width: `${Math.max(4, (d.count / maxFunnel) * 300)}px`,
                          transition: "width 0.3s",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{d.count}</span>
                    </div>
                  ))}
                {funnelData.every((d) => d.count === 0) && (
                  <p style={{ color: "var(--muted)", textAlign: "center", margin: 0 }}>
                    Nenhum dado para exibir
                  </p>
                )}
              </div>
            </section>

            {/* Snapshots */}
            <section>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
                Snapshots Salvos
              </h2>
              {snapshots.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Nenhum snapshot</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.65rem 1rem",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                      }}
                    >
                      <BarChart2 size={15} color="var(--muted)" />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{snap.title}</p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>
                          {new Date(snap.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      {snap.pdf_url && (
                        <a
                          href={snap.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--muted)" }}
                        >
                          <Download size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          padding: "0.2rem",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
