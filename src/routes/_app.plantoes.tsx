import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~/integrations/supabase/client";
import type { DutyShift, Profile, Team } from "~/integrations/supabase/types";
import type { ParsedShift } from "~/lib/duty.functions";
import { confirmShifts } from "~/lib/duty.functions";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";
import { Upload, Plus, Calendar, CheckCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/plantoes")({
  component: PlantoesPage,
});

type ParsedShiftWithMatch = ParsedShift & { corretor_id: string | null };

function PlantoesPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<DutyShift[]>([]);
  const [corretores, setCorretores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<Team>("PB");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // PDF parse state
  const [parsedShifts, setParsedShifts] = useState<ParsedShiftWithMatch[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [corretorMapOverride, setCorretorMapOverride] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [year, mon] = month.split("-").map(Number);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(mon).padStart(2, "0")}-31`;

    const [{ data: shiftsData }, { data: corretoresData }] = await Promise.all([
      supabase
        .from("duty_shifts")
        .select("*")
        .eq("team", teamFilter)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time"),
      supabase
        .from("profiles")
        .select("*")
        .eq("active", true)
        .order("full_name"),
    ]);

    setShifts((shiftsData as DutyShift[]) ?? []);
    setCorretores((corretoresData as Profile[]) ?? []);
    setLoading(false);
  }, [month, teamFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unmappedCount = parsedShifts.filter(
    (s) => !corretorMapOverride[s.name] && !s.corretor_id
  ).length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      // Read file as text (for demo — in production, use PDF.js or server-side parsing)
      const text = await file.text();

      // Call server function to parse
      const result = await (await import("~/lib/duty.functions")).uploadAndParse({
        data: {
          pdfText: text,
          team: teamFilter,
          uploadedBy: user?.id ?? "",
        },
      });

      setParsedShifts(result.shifts as ParsedShiftWithMatch[]);
      setBatchId(result.batchId);
      setCorretorMapOverride(result.corretorMap);
      toast.success(`${result.shifts.length} turnos encontrados`);
    } catch (e) {
      toast.error("Erro ao processar PDF: " + String(e));
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleConfirm = async () => {
    if (!batchId) return;
    setConfirming(true);

    try {
      // Merge auto-matched + manual override
      const finalMap: Record<string, string> = { ...corretorMapOverride };

      const result = await confirmShifts({
        data: {
          shifts: parsedShifts,
          corretorMap: finalMap,
          team: teamFilter,
          batchId,
        },
      });

      toast.success(`${result.inserted} turnos confirmados!`);
      if (result.teamManagersUpdated > 0) {
        toast.success(`${result.teamManagersUpdated} gestores de equipe atualizados`);
      }
      setParsedShifts([]);
      setBatchId(null);
      await fetchData();
    } catch (e) {
      toast.error("Erro ao confirmar turnos: " + String(e));
    } finally {
      setConfirming(false);
    }
  };

  // Group shifts by date
  const shiftsByDate = shifts.reduce<Record<string, DutyShift[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

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
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, flex: 1 }}>Plantões</h1>

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

        {(["PB", "FLN"] as Team[]).map((t) => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid",
              borderColor: teamFilter === t
                ? t === "PB" ? "var(--team-pb)" : "var(--team-fln)"
                : "var(--border)",
              background: teamFilter === t
                ? t === "PB" ? "rgba(202,138,4,0.15)" : "rgba(22,163,74,0.15)"
                : "transparent",
              color: teamFilter === t
                ? t === "PB" ? "var(--team-pb)" : "var(--team-fln)"
                : "var(--muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {t}
          </button>
        ))}

        <label
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
          <Upload size={13} />
          {parsing ? "Processando..." : "Carregar PDF"}
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            disabled={parsing}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
        {/* Parsed shifts review table — Feature 8.3 */}
        {parsedShifts.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                  Revisão da Escala ({parsedShifts.length} turnos)
                </h3>
                {unmappedCount > 0 && (
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#f59e0b" }}>
                    <AlertTriangle size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    {unmappedCount} sem corretor mapeado — serão ignorados
                  </p>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.9rem",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  border: "none",
                  borderRadius: "7px",
                  cursor: confirming ? "wait" : "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={13} />
                {confirming ? "Confirmando..." : "Confirmar Escala"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-raised)" }}>
                    {["Nome", "Data", "Início", "Fim", "Tipo", "Slot", "Corretor"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.5rem 0.75rem",
                          textAlign: "left",
                          color: "var(--muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedShifts.map((shift, i) => {
                    const resolvedId =
                      corretorMapOverride[shift.name] ?? shift.corretor_id ?? null;
                    const isMapped = !!resolvedId;

                    return (
                      <tr
                        key={i}
                        style={{
                          background: isMapped ? "transparent" : "rgba(245,158,11,0.08)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.name}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.date}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.start_time}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.end_time}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.shift_type}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>{shift.slot ?? "—"}</td>
                        <td style={{ padding: "0.45rem 0.75rem" }}>
                          {isMapped ? (
                            <span style={{ color: "var(--success)", fontSize: "0.75rem" }}>
                              {corretores.find((c) => c.id === resolvedId)?.full_name ?? resolvedId}
                            </span>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setCorretorMapOverride((prev) => ({
                                    ...prev,
                                    [shift.name]: e.target.value,
                                  }));
                                }
                              }}
                              style={{
                                padding: "0.2rem 0.4rem",
                                background: "var(--surface-raised)",
                                border: "1px solid #f59e0b",
                                borderRadius: "4px",
                                color: "#f59e0b",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                              }}
                            >
                              <option value="">⚠ Mapear manualmente…</option>
                              {corretores.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.full_name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar view */}
        {loading ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
            Carregando plantões...
          </div>
        ) : Object.keys(shiftsByDate).length === 0 ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "3rem" }}>
            <Calendar size={36} style={{ marginBottom: "0.75rem", opacity: 0.4 }} />
            <p>Nenhum plantão encontrado para {teamFilter} em {month}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.entries(shiftsByDate).map(([date, dayShifts]) => (
              <div
                key={date}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "0.6rem 1rem",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface-raised)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <div style={{ padding: "0.5rem" }}>
                  {dayShifts.map((shift) => {
                    const corretor = corretores.find((c) => c.id === shift.corretor_id);
                    return (
                      <div
                        key={shift.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.4rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              shift.shift_type === "gestao"
                                ? "var(--accent)"
                                : shift.shift_type === "folga"
                                ? "var(--muted)"
                                : "var(--success)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "var(--muted)", width: 90, flexShrink: 0 }}>
                          {shift.start_time} – {shift.end_time}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {corretor?.full_name ?? "— Não atribuído —"}
                        </span>
                        {shift.slot && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "3px",
                              background: "var(--surface-raised)",
                              color: "var(--muted)",
                            }}
                          >
                            Slot {shift.slot}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {shift.shift_type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
