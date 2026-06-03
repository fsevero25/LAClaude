import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "~/integrations/supabase/client.server";
import type { ReportSnapshot } from "~/integrations/supabase/types";

export const createReportSnapshot = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      title: string;
      reportData: Record<string, unknown>;
      createdBy: string | null;
    };
  }) => {
    const supabase = createAdminClient();

    const { data: snapshot, error } = await supabase
      .from("report_snapshots")
      .insert({
        title: data.title,
        data: data.reportData,
        created_by: data.createdBy,
        pdf_url: null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return snapshot as ReportSnapshot;
  }
);

export const listReportSnapshots = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("report_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data as ReportSnapshot[];
});

export const deleteReportSnapshot = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("report_snapshots")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  }
);
