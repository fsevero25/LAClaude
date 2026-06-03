import React from "react";
import type { Lead } from "~/integrations/supabase/types";
import type { PipelineStage } from "~/lib/pipeline";
import { isOverdue } from "~/lib/pipeline";
import { Phone, Clock, AlertTriangle } from "lucide-react";

const TEMP_COLORS: Record<string, string> = {
  frio: "#3b82f6",
  morno: "#f59e0b",
  quente: "#ef4444",
};

const TEMP_LABELS: Record<string, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

interface LeadCardProps {
  lead: Lead;
  stage: PipelineStage;
  onClick: () => void;
}

export function LeadCard({ lead, stage, onClick }: LeadCardProps) {
  const overdue = isOverdue(lead.entered_status_at, stage);

  const timeInStage = lead.entered_status_at
    ? getTimeInStageLabel(lead.entered_status_at)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface-raised)",
        border: `1px solid ${overdue ? "rgba(200,90,90,0.5)" : "var(--border)"}`,
        borderRadius: "8px",
        padding: "0.65rem 0.75rem",
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#444";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = overdue
          ? "rgba(200,90,90,0.5)"
          : "var(--border)";
      }}
    >
      {/* Name + overdue indicator */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {lead.name}
        </p>
        {overdue && (
          <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
        )}
      </div>

      {/* Phone */}
      {lead.phone && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.3rem" }}>
          <Phone size={11} color="var(--muted)" />
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{lead.phone}</span>
        </div>
      )}

      {/* Bottom row: temp + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.5rem",
        }}
      >
        {lead.temperature ? (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: TEMP_COLORS[lead.temperature] ?? "var(--muted)",
              background: `${TEMP_COLORS[lead.temperature] ?? "#888"}22`,
              padding: "0.1rem 0.4rem",
              borderRadius: "4px",
            }}
          >
            {TEMP_LABELS[lead.temperature] ?? lead.temperature}
          </span>
        ) : (
          <span />
        )}

        {timeInStage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Clock size={11} color={overdue ? "var(--danger)" : "var(--muted)"} />
            <span style={{ fontSize: "0.7rem", color: overdue ? "var(--danger)" : "var(--muted)" }}>
              {timeInStage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeInStageLabel(enteredAt: string): string {
  const ms = Date.now() - new Date(enteredAt).getTime();
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
