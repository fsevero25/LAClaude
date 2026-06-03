import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createAdminClient } from "~/integrations/supabase/client.server";
import { escalateLeads } from "~/lib/leads.functions";
import { runVistaLeadsSync } from "~/lib/vista.server";

export const APIRoute = createAPIFileRoute("/api/public/hooks/escalate-leads")({
  POST: async ({ request }) => {
    const supabase = createAdminClient();

    // B2 fix: validate cron secret against DB value
    const { data: secretRow } = await supabase
      .from("app_settings_kv")
      .select("value")
      .eq("key", "cron_secret")
      .maybeSingle();

    const cronSecret = request.headers.get("x-cron-secret");
    if (!secretRow?.value || cronSecret !== secretRow.value) {
      return new Response("Unauthorized", { status: 401 });
    }

    // P3 fix: check vista_sync_enabled before running sync
    const { data: vistaEnabled } = await supabase
      .from("app_settings_kv")
      .select("value")
      .eq("key", "vista_sync_enabled")
      .maybeSingle();

    let vistaSyncResult: { synced: number; errors: number } | null = null;
    if (vistaEnabled?.value === "true") {
      vistaSyncResult = await runVistaLeadsSync();
    }

    // Run lead escalation logic
    const escalationResult = await escalateLeads(supabase);

    // Update last cron run timestamp
    await supabase.from("app_settings_kv").upsert(
      { key: "last_cron_run", value: new Date().toISOString() },
      { onConflict: "key" }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        escalation: escalationResult,
        vistaSync: vistaSyncResult,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
