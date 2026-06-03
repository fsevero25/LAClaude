import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "~/integrations/supabase/client.server";
import type { Team, LeadStatus } from "~/integrations/supabase/types";
import { PIPELINE_STAGES } from "./pipeline";

export const resolveLeadSource = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { sourceName: string; team?: Team } }) => {
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("lead_sources")
      .select("id, name")
      .ilike("name", data.sourceName.trim())
      .maybeSingle();

    if (existing) return { id: existing.id, name: existing.name };

    const { data: created, error } = await supabase
      .from("lead_sources")
      .insert({
        name: data.sourceName.trim(),
        team: data.team ?? null,
        active: true,
      })
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);
    return created;
  }
);

export const escalateLeads = async (supabase: ReturnType<typeof createAdminClient>) => {
  const now = new Date();

  // Fetch all non-terminal leads
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, status, entered_status_at")
    .not("status", "in", "(proprietario_concluido,descarte_sem_perfil,descarte_nao_responde,negocio_fechado,pasta_feita)");

  if (error || !leads) return;

  const updates: { id: string; newStatus: LeadStatus }[] = [];

  for (const lead of leads) {
    const stage = PIPELINE_STAGES.find((s) => s.id === lead.status);
    if (!stage?.timeLimitHours || !lead.entered_status_at) continue;

    const elapsedHours =
      (now.getTime() - new Date(lead.entered_status_at).getTime()) / 3_600_000;

    if (elapsedHours <= stage.timeLimitHours) continue;

    // Determine escalation
    let newStatus: LeadStatus | null = null;

    if (lead.status === "aguardando_atendimento") {
      newStatus = "primeira_chamada";
    } else if (lead.status === "primeira_chamada") {
      newStatus = "segunda_chamada";
    } else if (lead.status === "segunda_chamada") {
      newStatus = "terceira_chamada";
    } else if (lead.status === "terceira_chamada") {
      newStatus = "descarte_nao_responde";
    } else if (lead.status === "descarte_tentativa_futura") {
      newStatus = "aguardando_atendimento";
    }

    if (newStatus) {
      updates.push({ id: lead.id, newStatus });
    }
  }

  // Apply updates
  for (const { id, newStatus } of updates) {
    await supabase
      .from("leads")
      .update({
        status: newStatus,
        entered_status_at: now.toISOString(),
      })
      .eq("id", id);

    await supabase.from("lead_history").insert({
      lead_id: id,
      from_status: leads.find((l) => l.id === id)?.status as LeadStatus,
      to_status: newStatus,
      changed_by: null,
      notes: "Auto-escalation by cron",
    });
  }

  return { escalated: updates.length };
};
