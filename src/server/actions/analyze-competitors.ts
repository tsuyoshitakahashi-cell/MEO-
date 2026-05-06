"use server";

import { z } from "zod";
import {
  analyzeCompetitors,
  type AnalyzeResult,
} from "@/lib/analyzer/analyze";

const InputSchema = z.object({
  selfUrl: z.string().url("自社HPのURLが不正です"),
  competitorUrls: z
    .array(z.string().url("競合URLが不正です"))
    .max(5, "競合URLは5つまでです"),
});

export interface AnalyzeActionResult {
  ok: boolean;
  data?: AnalyzeResult;
  error?: string;
}

export async function analyzeCompetitorsAction(input: {
  selfUrl: string;
  competitorUrls: string[];
}): Promise<AnalyzeActionResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const data = await analyzeCompetitors(parsed.data);
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
