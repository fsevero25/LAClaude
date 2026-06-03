import { createAdminClient } from "~/integrations/supabase/client.server";
import type { Team } from "~/integrations/supabase/types";

interface VistaLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  team?: string;
}

export async function runVistaLeadsSync(): Promise<{ synced: number; errors: number }> {
  const supabase = createAdminClient();

  // Fetch Vista config from settings
  const { data: settings } = await supabase
    .from("app_settings")
    .select("vista_api_url, vista_api_key")
    .maybeSingle();

  if (!settings?.vista_api_url || !settings?.vista_api_key) {
    console.warn("[Vista Sync] Missing API config — skipping");
    return { synced: 0, errors: 0 };
  }

  let vistaLeads: VistaLead[] = [];
  try {
    const res = await fetch(`${settings.vista_api_url}/leads`, {
      headers: {
        Authorization: `Bearer ${settings.vista_api_key}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Vista API responded ${res.status}`);
    }
    const body = await res.json() as { leads?: VistaLead[] };
    vistaLeads = body.leads ?? [];
  } catch (e) {
    console.error("[Vista Sync] Fetch error:", e);
    return { synced: 0, errors: 1 };
  }

  let synced = 0;
  let errors = 0;

  for (const vl of vistaLeads) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("vista_lead_id", vl.id)
        .maybeSingle();

      if (existing) continue;

      // Create new lead
      await supabase.from("leads").insert({
        name: vl.name,
        phone: vl.phone ?? null,
        email: vl.email ?? null,
        status: "aguardando_atendimento",
        team: (vl.team as Team) ?? null,
        vista_lead_id: vl.id,
        entered_status_at: new Date().toISOString(),
        notes: null,
        temperature: null,
        source_id: null,
        corretor_id: null,
      });
      synced++;
    } catch (e) {
      console.error("[Vista Sync] Error inserting lead:", vl.id, e);
      errors++;
    }
  }

  return { synced, errors };
}
