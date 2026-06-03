import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "~/integrations/supabase/client.server";

export const syncToSheets = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { spreadsheetId: string; sheetName: string } }) => {
    const supabase = createAdminClient();

    // Fetch all leads
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*, lead_sources(name)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Build rows for Sheets
    const rows = (leads ?? []).map((lead) => [
      lead.id,
      lead.name,
      lead.phone ?? "",
      lead.email ?? "",
      lead.status,
      lead.temperature ?? "",
      lead.team ?? "",
      lead.created_at,
      lead.entered_status_at ?? "",
    ]);

    // In a real implementation this would call Google Sheets API
    // For now, return the data for external use
    console.log(`[Sheets Sync] Would sync ${rows.length} leads to ${data.spreadsheetId}/${data.sheetName}`);

    return { ok: true, rowCount: rows.length };
  }
);

export const getSheetsSyncStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("app_settings_kv")
    .select("value")
    .eq("key", "last_sheets_sync")
    .maybeSingle();

  return { lastSync: data?.value ?? null };
});
