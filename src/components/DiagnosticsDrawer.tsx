import React, { useEffect, useState } from "react";
import { supabase } from "~/integrations/supabase/client";
import { X, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface DiagnosticsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface DiagData {
  supabaseOk: boolean | null;
  leadCounts: Record<string, number>;
  lastCronRun: string | null;
  errors: string[];
}

export function DiagnosticsDrawer({ open, onClose }: DiagnosticsDrawerProps) {
  const [data, setData] = useState<DiagData>({
    supabaseOk: null,
    leadCounts: {},
    lastCronRun: null,
    errors: [],
  });
  const [loading, setLoading] = useState(false);

  const runDiag = async () => {
    setLoading(true);
    const errors: string[] = [];
    let supabaseOk = false;
    const leadCounts: Record<string, number> = {};
    let lastCronRun: string | null = null;

    try {
      const { data: leads, error } = await supabase.from("leads").select("status");
      if (error) {
        errors.push(`Leads: ${error.message}`);
      } else {
        supabaseOk = true;
        for (const l of leads ?? []) {
          leadCounts[l.status] = (leadCounts[l.status] ?? 0) + 1;
        }
      }
    } catch (e) {
      errors.push(`Conexão Supabase: ${String(e)}`);
    }

    try {
      const { data: kv } = await supabase
        .from("app_settings_kv")
        .select("value")
        .eq("key", "last_cron_run")
        .maybeSingle();
      lastCronRun = kv?.value ?? null;
    } catch (_) {
      // ignore
    }

    setData({ supabaseOk, leadCounts, lastCronRun, errors });
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      runDiag();
    }
  }, [open]);

  if (!open) return null;

  const totalLeads = Object.values(data.leadCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 40,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 400,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Diagnósticos do Sistema</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={runDiag}
              disabled={loading}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                borderRadius: "6px",
                padding: "0.3rem 0.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.8rem",
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
          {/* Supabase status */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Conexão
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
              {data.supabaseOk === null ? (
                <span style={{ color: "var(--muted)" }}>Verificando...</span>
              ) : data.supabaseOk ? (
                <>
                  <CheckCircle size={16} color="var(--success)" />
                  <span style={{ color: "var(--success)" }}>Supabase conectado</span>
                </>
              ) : (
                <>
                  <XCircle size={16} color="var(--danger)" />
                  <span style={{ color: "var(--danger)" }}>Supabase com erro</span>
                </>
              )}
            </div>
          </section>

          {/* Lead counts */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Leads por Status ({totalLeads} total)
            </h3>
            {Object.entries(data.leadCounts).length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>Nenhum lead encontrado</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {Object.entries(data.leadCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <div
                      key={status}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        padding: "0.25rem 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>{status.replace(/_/g, " ")}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Cron */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Último Cron
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: data.lastCronRun ? "var(--foreground)" : "var(--muted)" }}>
              {data.lastCronRun
                ? new Date(data.lastCronRun).toLocaleString("pt-BR")
                : "Nenhum registro encontrado"}
            </p>
          </section>

          {/* Errors */}
          {data.errors.length > 0 && (
            <section>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Erros Recentes
              </h3>
              {data.errors.map((err, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(200, 90, 90, 0.1)",
                    border: "1px solid rgba(200, 90, 90, 0.3)",
                    borderRadius: "6px",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8rem",
                    color: "var(--danger)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {err}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
