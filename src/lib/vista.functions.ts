import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "~/integrations/supabase/client.server";

export const testVistaConnection = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { apiUrl: string; apiKey: string } }) => {
    try {
      const res = await fetch(`${data.apiUrl}/health`, {
        headers: {
          Authorization: `Bearer ${data.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
);

export const saveVistaConfig = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { apiUrl: string; apiKey: string; enabled: boolean } }) => {
    const supabase = createAdminClient();

    // Upsert into app_settings (single row expected)
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          vista_api_url: data.apiUrl || null,
          vista_api_key: data.apiKey || null,
          vista_sync_enabled: data.enabled,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("app_settings").insert({
        roleta_ativa: false,
        vista_sync_enabled: data.enabled,
        vista_api_url: data.apiUrl || null,
        vista_api_key: data.apiKey || null,
      });
      if (error) throw new Error(error.message);
    }

    // Also update KV for cron check
    await supabase.from("app_settings_kv").upsert(
      { key: "vista_sync_enabled", value: data.enabled ? "true" : "false" },
      { onConflict: "key" }
    );

    return { ok: true };
  }
);
