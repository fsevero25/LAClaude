import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~/integrations/supabase/client";
import type { AppSettings, Profile, AppRole } from "~/integrations/supabase/types";
import { testVistaConnection, saveVistaConfig } from "~/lib/vista.functions";
import { useAuth } from "~/lib/auth";
import toast from "react-hot-toast";
import { Copy, Check, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [corretores, setCorretores] = useState<Profile[]>([]);
  const [cronSecret, setCronSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cronCopied, setCronCopied] = useState(false);
  const [testingVista, setTestingVista] = useState(false);

  const [vistaUrl, setVistaUrl] = useState("");
  const [vistaKey, setVistaKey] = useState("");
  const [vistaEnabled, setVistaEnabled] = useState(false);
  const [roletaAtiva, setRoletaAtiva] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: settingsData },
      { data: profiles },
      { data: secretKv },
    ] = await Promise.all([
      supabase.from("app_settings").select("*").maybeSingle(),
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("app_settings_kv")
        .select("value")
        .eq("key", "cron_secret")
        .maybeSingle(),
    ]);

    if (settingsData) {
      setSettings(settingsData as AppSettings);
      setVistaUrl(settingsData.vista_api_url ?? "");
      setVistaKey(settingsData.vista_api_key ?? "");
      setVistaEnabled(settingsData.vista_sync_enabled);
      setRoletaAtiva(settingsData.roleta_ativa);
    }

    setCorretores((profiles as Profile[]) ?? []);
    setCronSecret(secretKv?.value ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from("app_settings")
          .update({ roleta_ativa: roletaAtiva })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        await supabase.from("app_settings").insert({
          roleta_ativa: roletaAtiva,
          vista_sync_enabled: vistaEnabled,
          vista_api_url: null,
          vista_api_key: null,
        });
      }
      toast.success("Configurações salvas!");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVista = async () => {
    setSaving(true);
    try {
      await saveVistaConfig({
        data: { apiUrl: vistaUrl, apiKey: vistaKey, enabled: vistaEnabled },
      });
      toast.success("Config Vista salva!");
    } catch (e) {
      toast.error("Erro ao salvar Vista: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTestVista = async () => {
    setTestingVista(true);
    try {
      const result = await testVistaConnection({
        data: { apiUrl: vistaUrl, apiKey: vistaKey },
      });
      if (result.ok) {
        toast.success("Vista conectado com sucesso!");
      } else {
        toast.error(`Vista retornou ${result.status ?? result.error}`);
      }
    } catch (e) {
      toast.error("Erro: " + String(e));
    } finally {
      setTestingVista(false);
    }
  };

  const handleGenerateCronSecret = async () => {
    const newSecret = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("app_settings_kv").upsert(
      { key: "cron_secret", value: newSecret },
      { onConflict: "key" }
    );
    if (error) {
      toast.error("Erro ao gerar secret");
    } else {
      setCronSecret(newSecret);
      toast.success("Cron secret gerado!");
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(cronSecret);
    setCronCopied(true);
    setTimeout(() => setCronCopied(false), 2000);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // B3 note: in dev, any authenticated user can promote to admin (intentional)
    const { error } = await supabase.from("user_roles").upsert(
      { user_id: userId, role: newRole },
      { onConflict: "user_id" }
    );
    if (error) {
      toast.error("Erro ao alterar role");
    } else {
      toast.success("Role atualizada!");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
        Carregando configurações...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* Header */}
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Configurações</h1>
      </div>

      <div style={{ padding: "1.5rem", maxWidth: 720, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* General settings */}
        <Card title="Geral">
          <ToggleRow
            label="Roleta Ativa"
            description="Distribuição automática de leads por roleta"
            checked={roletaAtiva}
            onChange={setRoletaAtiva}
          />
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <SaveButton onClick={handleSaveSettings} saving={saving} />
          </div>
        </Card>

        {/* Vista / Loft */}
        <Card title="Integração Vista/Loft">
          <ToggleRow
            label="Sync Automático"
            description="Sincronizar leads da Vista automaticamente"
            checked={vistaEnabled}
            onChange={setVistaEnabled}
          />

          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <label style={labelStyle}>URL da API Vista</label>
            <input
              value={vistaUrl}
              onChange={(e) => setVistaUrl(e.target.value)}
              placeholder="https://api.vistasoft.com.br/..."
              style={inputStyle}
            />
            <label style={labelStyle}>Chave da API Vista</label>
            <input
              type="password"
              value={vistaKey}
              onChange={(e) => setVistaKey(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={handleTestVista}
              disabled={testingVista || !vistaUrl}
              style={secondaryBtn}
            >
              <RefreshCw size={13} />
              {testingVista ? "Testando..." : "Testar"}
            </button>
            <SaveButton onClick={handleSaveVista} saving={saving} />
          </div>
        </Card>

        {/* Cron secret */}
        <Card title="Cron Secret">
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
            Use este secret no header <code style={{ background: "var(--surface-raised)", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>x-cron-secret</code> ao chamar o endpoint de escalation.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              readOnly
              value={cronSecret || "Não configurado"}
              style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
            />
            <button onClick={handleCopySecret} disabled={!cronSecret} style={secondaryBtn}>
              {cronCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button onClick={handleGenerateCronSecret} style={secondaryBtn}>
              Gerar
            </button>
          </div>
        </Card>

        {/* Corretores + roles */}
        <Card title="Corretores & Roles">
          {/* B3 note */}
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "var(--warning)", background: "rgba(200,154,58,0.1)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
            Dev: qualquer usuário autenticado pode promover a admin (B3 — intencional em dev).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {corretores.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ flex: 1, fontWeight: c.id === user?.id ? 600 : 400 }}>
                  {c.full_name ?? c.email}
                  {c.id === user?.id && <span style={{ color: "var(--muted)", fontSize: "0.7rem", marginLeft: "0.4rem" }}>(você)</span>}
                </span>
                <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{c.team ?? "—"}</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleRoleChange(c.id, e.target.value as AppRole);
                      e.target.value = "";
                    }
                  }}
                  style={{
                    padding: "0.25rem 0.4rem",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "5px",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Alterar role...</option>
                  <option value="corretor">Corretor</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "1.25rem",
      }}
    >
      <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700 }}>{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{label}</p>
        {description && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 22,
          borderRadius: "11px",
          background: checked ? "var(--success)" : "var(--border)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: "0.4rem 1rem",
        background: "var(--foreground)",
        color: "var(--background)",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
    >
      {saving ? "Salvando..." : "Salvar"}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.45rem 0.65rem",
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "7px",
  color: "var(--foreground)",
  fontSize: "0.875rem",
  outline: "none",
};

const secondaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.4rem 0.75rem",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "7px",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: "0.8rem",
};
