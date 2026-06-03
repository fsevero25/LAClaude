import { createServerFn } from "@tanstack/react-start";
import { createAdminClient } from "~/integrations/supabase/client.server";
import type { Team, ShiftType } from "~/integrations/supabase/types";

export interface ParsedShift {
  name: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  shift_type: ShiftType;
  team: Team;
  slot?: "A" | "B";
}

// Feature 8.1: AI parses PDF text into shifts
// - One name → slot "A"
// - Two names separated by "/", "+", "e", "," or newline → two SEPARATE records with slot "A" and "B"
// - NEVER concatenate two names

async function callAiParser(text: string, team: Team): Promise<ParsedShift[]> {
  const apiKey = process.env.LOVABLE_API_KEY ?? "";

  const systemPrompt = `Você é um parser de escalas de plantão imobiliário.
Extraia turnos do texto e retorne um array JSON de objetos com campos:
- name: string (nome do corretor)
- date: string (YYYY-MM-DD)
- start_time: string (HH:MM)
- end_time: string (HH:MM)
- shift_type: "plantao" | "gestao" | "folga"
- team: "${team}"
- slot: "A" | "B"

REGRAS CRÍTICAS:
1. Se há UM nome em um turno → crie 1 registro com slot "A"
2. Se há DOIS nomes separados por "/", "+", "e", "," ou quebra de linha → crie 2 registros SEPARADOS: primeiro com slot "A", segundo com slot "B". NÃO concatene os nomes.
3. NUNCA concatene dois nomes em um único campo name.

Retorne APENAS o array JSON, sem explicações.`;

  const response = await fetch("https://api.lovable.app/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Texto da escala:\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices?.[0]?.message?.content ?? "[]";
  // Extract JSON from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as ParsedShift[];
  } catch {
    return [];
  }
}

export const parseDutyPdf = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { text: string; team: Team } }) => {
    const shifts = await callAiParser(data.text, data.team);
    return { shifts };
  }
);

// Feature 8.2: After confirming shifts, upsert team_managers for gestao shifts
export const confirmShifts = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      shifts: ParsedShift[];
      corretorMap: Record<string, string>; // name → corretor_id
      team: Team;
      batchId: string;
    };
  }) => {
    const supabase = createAdminClient();

    // Build insert rows (Feature 8.3: skip rows without corretor match — no ghost creation)
    const insertRows = data.shifts
      .filter((s) => data.corretorMap[s.name] !== undefined)
      .map((s) => ({
        corretor_id: data.corretorMap[s.name] ?? null,
        team: s.team,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        shift_type: s.shift_type,
        slot: s.slot ?? null,
        batch_id: data.batchId,
      }));

    if (insertRows.length === 0) {
      return { inserted: 0, teamManagersUpdated: 0 };
    }

    const { error: insertError } = await supabase
      .from("duty_shifts")
      .insert(insertRows);

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    // Feature 8.2: Upsert team_managers for gestao shifts
    const gestaoShifts = data.shifts.filter(
      (s) => s.shift_type === "gestao" && data.corretorMap[s.name]
    );

    let teamManagersUpdated = 0;
    for (const shift of gestaoShifts) {
      const corretorId = data.corretorMap[shift.name];
      if (!corretorId) continue;

      const weekday = new Date(shift.date).getDay();

      const { error } = await supabase.from("team_managers").upsert(
        {
          team: shift.team,
          weekday,
          corretor_id: corretorId,
        },
        { onConflict: "team,weekday" }
      );

      if (!error) teamManagersUpdated++;
    }

    return { inserted: insertRows.length, teamManagersUpdated };
  }
);

// Feature 8.3: Upload without uniqueMissing ghost creation
export const uploadAndParse = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      pdfText: string;
      team: Team;
      uploadedBy: string;
    };
  }) => {
    const supabase = createAdminClient();

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from("duty_schedule_batches")
      .insert({
        uploaded_by: data.uploadedBy,
        team: data.team,
        pdf_upload_id: null,
        confirmed: false,
      })
      .select()
      .single();

    if (batchError) throw new Error(batchError.message);

    // Parse PDF with AI
    const shifts = await callAiParser(data.pdfText, data.team);

    // Fetch existing corretores for matching
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("team", data.team)
      .eq("active", true);

    const corretorMap: Record<string, string> = {};
    for (const profile of profiles ?? []) {
      if (profile.full_name) {
        corretorMap[profile.full_name] = profile.id;
      }
    }

    // Match names (no ghost creation — Feature 8.3)
    const matchedShifts = shifts.map((s) => ({
      ...s,
      corretor_id: corretorMap[s.name] ?? null,
    }));

    return {
      batchId: batch.id,
      shifts: matchedShifts,
      corretorMap,
    };
  }
);
