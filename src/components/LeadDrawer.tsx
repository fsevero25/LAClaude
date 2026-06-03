import React, { useState, useCallback } from "react";
import type { Lead, LeadStatus, LeadTemperature, ContactAttempt, LeadHistory } from "~/integrations/supabase/types";
import { PIPELINE_STAGES } from "~/lib/pipeline";
import { supabase } from "~/integrations/supabase/client";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";
import { X, Phone, Mail, User, Clock, Edit2, Save, XCircle } from "lucide-react";

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdated: (updated: Lead) => void;
}

const TEMP_OPTIONS: { value: LeadTemperature; label: string; color: string }[] = [
  { value: "frio", label: "Frio", color: "#3b82f6" },
  { value: "morno", label: "Morno", color: "#f59e0b" },
  { value: "quente", label: "Quente", color: "#ef4444" },
];

export function LeadDrawer({ lead, onClose, onUpdated }: LeadDrawerProps) {
  // ALL hooks first — before any conditional return (B1 fix pattern)
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAttemptNote, setNewAttemptNote] = useState("");
  const [addingAttempt, setAddingAttempt] = useState(false);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [attempts, setAttempts] = useState<ContactAttempt[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTemp, setEditTemp] = useState<LeadTemperature | "">("") ;
  const [editStatus, setEditStatus] = useState<LeadStatus | "">("");

  const loadHistory = useCallback(async (leadId: string) => {
    const [{ data: hist }, { data: att }] = await Promise.all([
      supabase
        .from("lead_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_attempts")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
    ]);
    setHistory(hist ?? []);
    setAttempts(att ?? []);
    setHistoryLoaded(true);
  }, []);

  React.useEffect(() => {
    if (lead) {
      setEditName(lead.name);
      setEditPhone(lead.phone ?? "");
      setEditEmail(lead.email ?? "");
      setEditNotes(lead.notes ?? "");
      setEditTemp((lead.temperature ?? "") as LeadTemperature | "");
      setEditStatus(lead.status);
      setHistoryLoaded(false);
      setEditMode(false);
      loadHistory(lead.id);
    }
  }, [lead, loadHistory]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    const statusChanged = editStatus && editStatus !== lead.status;

    const { data, error } = await supabase
      .from("leads")
      .update({
        name: editName,
        phone: editPhone || null,
        email: editEmail || null,
        notes: editNotes || null,
        temperature: (editTemp || null) as LeadTemperature | null,
        status: (editStatus || lead.status) as LeadStatus,
        ...(statusChanged ? { entered_status_at: new Date().toISOString() } : {}),
      })
      .eq("id", lead.id)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else if (data) {
      if (statusChanged) {
        await supabase.from("lead_history").insert({
          lead_id: lead.id,
          from_status: lead.status,
          to_status: editStatus as LeadStatus,
          changed_by: user?.id ?? null,
          notes: null,
        });
        await loadHistory(lead.id);
      }
      onUpdated(data as Lead);
      toast.success("Lead atualizado");
      setEditMode(false);
    }
    setSaving(false);
  };

  const handleAddAttempt = async () => {
    if (!lead || !newAttemptNote.trim()) return;
    setAddingAttempt(true);
    const nextNumber = attempts.length + 1;
    const { error } = await supabase.from("contact_attempts").insert({
      lead_id: lead.id,
      corretor_id: user?.id ?? null,
      notes: newAttemptNote.trim(),
      attempt_number: nextNumber,
    });
    if (error) {
      toast.error("Erro ao registrar tentativa");
    } else {
      setNewAttemptNote("");
      await loadHistory(lead.id);
      toast.success("Tentativa registrada");
    }
    setAddingAttempt(false);
  };

  // Conditional return only AFTER all hooks
  if (!lead) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
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
          width: 480,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{lead.name}</h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>
              {PIPELINE_STAGES.find((s) => s.id === lead.status)?.label ?? lead.status}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={actionBtn("#5cb87a")}
                >
                  <Save size={14} />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setEditMode(false)} style={actionBtn("#888")}>
                  <XCircle size={14} />
                  Cancelar
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} style={actionBtn("var(--muted)")}>
                <Edit2 size={14} />
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {/* Fields */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={sectionLabel}>Informações</h3>

            <Field label="Nome" icon={<User size={13} />}>
              {editMode ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span style={{ fontSize: "0.875rem" }}>{lead.name}</span>
              )}
            </Field>

            <Field label="Telefone" icon={<Phone size={13} />}>
              {editMode ? (
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span style={{ fontSize: "0.875rem" }}>{lead.phone ?? "—"}</span>
              )}
            </Field>

            <Field label="Email" icon={<Mail size={13} />}>
              {editMode ? (
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span style={{ fontSize: "0.875rem" }}>{lead.email ?? "—"}</span>
              )}
            </Field>

            <Field label="Temperatura">
              {editMode ? (
                <select
                  value={editTemp}
                  onChange={(e) => setEditTemp(e.target.value as LeadTemperature | "")}
                  style={inputStyle}
                >
                  <option value="">— Nenhuma —</option>
                  {TEMP_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              ) : (
                <TempBadge temp={lead.temperature} />
              )}
            </Field>

            <Field label="Status">
              {editMode ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                  style={inputStyle}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: "0.875rem" }}>
                  {PIPELINE_STAGES.find((s) => s.id === lead.status)?.label ?? lead.status}
                </span>
              )}
            </Field>

            {lead.entered_status_at && (
              <Field label="No estágio há" icon={<Clock size={13} />}>
                <span style={{ fontSize: "0.875rem" }}>
                  {formatElapsed(lead.entered_status_at)}
                </span>
              </Field>
            )}

            <div style={{ marginTop: "0.75rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                Observações
              </label>
              {editMode ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              ) : (
                <p style={{ fontSize: "0.875rem", margin: 0, color: lead.notes ? "var(--foreground)" : "var(--muted)" }}>
                  {lead.notes ?? "Sem observações"}
                </p>
              )}
            </div>
          </section>

          {/* Contact attempts */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={sectionLabel}>Tentativas de Contato ({attempts.length})</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                value={newAttemptNote}
                onChange={(e) => setNewAttemptNote(e.target.value)}
                placeholder="Nota da tentativa..."
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddAttempt();
                }}
              />
              <button
                onClick={handleAddAttempt}
                disabled={addingAttempt || !newAttemptNote.trim()}
                style={{
                  background: "var(--foreground)",
                  color: "var(--background)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.4rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                +
              </button>
            </div>
            {attempts.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "var(--surface-raised)",
                  borderRadius: "6px",
                  marginBottom: "0.35rem",
                  fontSize: "0.8rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>#{a.attempt_number}</span>
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {a.notes && <p style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{a.notes}</p>}
              </div>
            ))}
          </section>

          {/* History */}
          <section>
            <h3 style={sectionLabel}>Histórico de Status</h3>
            {!historyLoaded ? (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Carregando...</p>
            ) : history.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Nenhum histórico</p>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.8rem",
                  }}
                >
                  <span style={{ color: "var(--muted)", flexShrink: 0 }}>
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </span>
                  <span>
                    {h.from_status
                      ? `${stageLabel(h.from_status)} → ${stageLabel(h.to_status)}`
                      : stageLabel(h.to_status)}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function stageLabel(id: string): string {
  return PIPELINE_STAGES.find((s) => s.id === id)?.label ?? id;
}

function formatElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Math.round(h)} horas`;
  return `${Math.round(h / 24)} dias`;
}

const sectionLabel: React.CSSProperties = {
  margin: "0 0 0.75rem",
  fontSize: "0.75rem",
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--foreground)",
  fontSize: "0.875rem",
  outline: "none",
};

function actionBtn(color: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.3rem 0.65rem",
    borderRadius: "6px",
    border: `1px solid ${color}`,
    background: "transparent",
    color: color,
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  };
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", width: 110, flexShrink: 0 }}>
        {icon && <span style={{ color: "var(--muted)" }}>{icon}</span>}
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{label}</span>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function TempBadge({ temp }: { temp: string | null }) {
  const colors: Record<string, string> = {
    frio: "#3b82f6",
    morno: "#f59e0b",
    quente: "#ef4444",
  };
  const labels: Record<string, string> = {
    frio: "Frio",
    morno: "Morno",
    quente: "Quente",
  };
  if (!temp) return <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>—</span>;
  return (
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: colors[temp] ?? "var(--muted)",
        background: `${colors[temp] ?? "#888"}22`,
        padding: "0.1rem 0.5rem",
        borderRadius: "4px",
      }}
    >
      {labels[temp] ?? temp}
    </span>
  );
}
