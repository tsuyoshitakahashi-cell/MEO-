"use server";

import { z } from "zod";
import { generateTexts, type GenerateResult } from "@/lib/generator/generate";

const InputSchema = z.object({
  selfUrl: z.string().url("自社HPのURLが不正です"),
  selectedKeywords: z
    .array(z.string().min(1))
    .min(1, "採用するキーワードを1つ以上選択してください"),
});

export interface GenerateActionResult {
  ok: boolean;
  data?: GenerateResult;
  error?: string;
}

export async function generateTextsAction(input: {
  selfUrl: string;
  selectedKeywords: string[];
}): Promise<GenerateActionResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const data = await generateTexts(parsed.data);
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
