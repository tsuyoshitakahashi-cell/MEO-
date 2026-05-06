"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { cases, type Case } from "@/lib/db/schema";

const InputSchema = z.object({
  selfUrl: z.string().url(),
  competitorUrls: z.array(z.string().url()),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  additionalKeywords: z.array(z.string()).optional(),
});

const CompetitorAnalysisSchema = z.object({
  keywords: z.array(
    z.object({
      term: z.string(),
      category: z.enum(["area", "service", "target", "concern", "authority"]),
      competitorCount: z.number(),
      selfCount: z.number(),
      aiCitationScore: z.enum(["high", "mid", "low"]),
      recommendation: z.enum(["must", "recommend", "optional"]),
      selected: z.boolean(),
    }),
  ),
  analyzedAt: z.string(),
});

const GeneratedTextsSchema = z.object({
  businessDesc: z.string(),
  serviceDescs: z.array(
    z.object({ title: z.string(), body: z.string(), axis: z.string() }),
  ),
  productDescs: z.array(
    z.object({ name: z.string(), sourceUrl: z.string(), body: z.string() }),
  ),
  generatedAt: z.string(),
});

const CreateCaseSchema = z.object({
  name: z.string().min(1, "案件名を入力してください").max(200),
  input: InputSchema,
  competitorAnalysis: CompetitorAnalysisSchema.nullable().optional(),
  generatedTexts: GeneratedTextsSchema.nullable().optional(),
});

export type CreateCaseInput = z.infer<typeof CreateCaseSchema>;

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function createCase(
  input: CreateCaseInput,
): Promise<ActionResult<Case>> {
  const parsed = CreateCaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(cases)
      .values({
        name: parsed.data.name,
        input: parsed.data.input,
        competitorAnalysis: parsed.data.competitorAnalysis ?? null,
        generatedTexts: parsed.data.generatedTexts ?? null,
      })
      .returning();
    revalidatePath("/cases");
    return { ok: true, data: row };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function updateCase(
  id: string,
  input: Partial<CreateCaseInput>,
): Promise<ActionResult<Case>> {
  try {
    const db = getDb();
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.input !== undefined) updateValues.input = input.input;
    if (input.competitorAnalysis !== undefined)
      updateValues.competitorAnalysis = input.competitorAnalysis;
    if (input.generatedTexts !== undefined)
      updateValues.generatedTexts = input.generatedTexts;

    const [row] = await db
      .update(cases)
      .set(updateValues)
      .where(eq(cases.id, id))
      .returning();
    if (!row) return { ok: false, error: "案件が見つかりません" };
    revalidatePath("/cases");
    revalidatePath(`/cases/${id}`);
    return { ok: true, data: row };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function getCase(id: string): Promise<ActionResult<Case>> {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);
    if (!row) return { ok: false, error: "案件が見つかりません" };
    return { ok: true, data: row };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function listCases(
  query?: string,
): Promise<ActionResult<Case[]>> {
  try {
    const db = getDb();
    const baseQuery = db.select().from(cases).orderBy(desc(cases.updatedAt));
    const rows = query
      ? await baseQuery.where(
          or(
            ilike(cases.name, `%${query}%`),
            // input is jsonb, search on serialized form via a cast
          ),
        )
      : await baseQuery;
    return { ok: true, data: rows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function deleteCase(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const db = getDb();
    await db.delete(cases).where(eq(cases.id, id));
    revalidatePath("/cases");
    return { ok: true, data: { id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
