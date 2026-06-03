import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~/integrations/supabase/client";
import type { Lead, Team } from "~/integrations/supabase/types";
import { PIPELINE_STAGES } from "~/lib/pipeline";
import { KanbanColumn } from "~/components/KanbanColumn";
import { LeadDrawer } from "~/components/LeadDrawer";
import { NewLeadDialog } from "~/components/NewLeadDialog";
import { CorretorAssistant } from "~/components/CorretorAssistant";
import { Plus, RefreshCw, Bot, Filter } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("entered_status_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar leads");
    } else {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = teamFilter === "all"
    ? leads
    : leads.filter((l) => l.team === teamFilter);

  const getLeadsForStage = (stageId: string) =>
    filteredLeads.filter((l) => l.status === stageId);

  const handleLeadUpdated = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  };

  const handleLeadCreated = (lead: Lead) => {
    setLeads((prev) => [lead, ...prev]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, flex: 1 }}>Pipeline</h1>

        {/* Team filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter size={14} color="var(--muted)" />
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

        <button
          onClick={fetchLeads}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.75rem",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "7px",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          <RefreshCw size={13} />
          Atualizar
        </button>

        <button
          onClick={() => setAssistantOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.75rem",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "7px",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          <Bot size={13} />
          Assistente
        </button>

        <button
          onClick={() => setNewLeadOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.9rem",
            background: "var(--foreground)",
            color: "var(--background)",
            border: "none",
            borderRadius: "7px",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          <Plus size={14} />
          Novo Lead
        </button>
      </div>

      {/* Kanban board */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "1rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--muted)" }}>
            Carregando leads...
          </div>
        ) : (
          PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getLeadsForStage(stage.id)}
              onLeadClick={setSelectedLead}
            />
          ))
        )}
      </div>

      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdated={handleLeadUpdated}
      />

      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={handleLeadCreated}
      />

      <CorretorAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  );
}
