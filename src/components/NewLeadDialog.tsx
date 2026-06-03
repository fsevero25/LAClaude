import React, { useState } from "react";
import type { Lead, LeadTemperature, Team } from "~/integrations/supabase/types";
import { supabase } from "~/integrations/supabase/client";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

export function NewLeadDialog({ open, onClose, onCreated }: NewLeadDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState<Team | "">("");
  const [temperature, setTemperature] = useState<LeadTemperature | "">("");
  const [source, setSource] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setTeam("");
    setTemperature("");
    setSource("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSubmitting(true);

    // Resolve source if provided
    let sourceId: string | null = null;
    if (source.trim()) {
      const { data: existing } = await supabase
        .from("lead_sources")
        .select("id")
        .ilike("name", source.trim())
        .maybeSingle();

      if (existing) {
        sourceId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("lead_sources")
          .insert({ name: source.trim(), team: (team as Team) || null, active: true })
          .select("id")
          .single();
        sourceId = created?.id ?? null;
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        status: "aguardando_atendimento",
        temperature: (temperature as LeadTemperature) || null,
        team: (team as Team) || null,
        source_id: sourceId,
        corretor_id: user?.id ?? null,
        entered_status_at: new Date().toISOString(),
        notes: null,
        vista_lead_id: null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar lead: " + error.message);
    } else if (data) {
      toast.success("Lead criado!");
      onCreated(data as Lead);
      handleClose();
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 50,
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 460,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          zIndex: 60,
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
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Novo Lead</h2>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <FormField label="Nome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
              style={inputStyle}
            />
          </FormField>

          <FormField label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Equipe">
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value as Team | "")}
                style={inputStyle}
              >
                <option value="">— Nenhuma —</option>
                <option value="PB">PB</option>
                <option value="FLN">FLN</option>
              </select>
            </FormField>

            <FormField label="Temperatura">
              <select
                value={temperature}
                onChange={(e) => setTemperature(e.target.value as LeadTemperature | "")}
                style={inputStyle}
              >
                <option value="">— Nenhuma —</option>
                <option value="frio">Frio</option>
                <option value="morno">Morno</option>
                <option value="quente">Quente</option>
              </select>
            </FormField>
          </div>

          <FormField label="Origem">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: Instagram, Indicação..."
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={handleClose} style={cancelBtn}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting} style={submitBtn}>
              {submitting ? "Criando..." : "Criar Lead"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.7rem",
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "7px",
  color: "var(--foreground)",
  fontSize: "0.875rem",
  outline: "none",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "7px",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: "0.875rem",
};

const submitBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "var(--foreground)",
  color: "var(--background)",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "0.875rem",
  fontWeight: 600,
};
