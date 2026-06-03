import React from "react";
import type { Lead } from "~/integrations/supabase/types";
import type { PipelineStage } from "~/lib/pipeline";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        maxHeight: "calc(100vh - 120px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: stage.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--foreground)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stage.label}
          </span>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            background: "var(--surface-raised)",
            color: "var(--muted)",
            padding: "0.1rem 0.4rem",
            borderRadius: "999px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            stage={stage}
            onClick={() => onLeadClick(lead)}
          />
        ))}
        {leads.length === 0 && (
          <div
            style={{
              padding: "1.5rem 1rem",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.8rem",
            }}
          >
            Sem leads
          </div>
        )}
      </div>
    </div>
  );
}
