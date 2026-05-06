import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const cases = pgTable("cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  input: jsonb("input").notNull().$type<{
    selfUrl: string;
    competitorUrls: string[];
    companyName?: string;
    industry?: string;
    additionalKeywords?: string[];
  }>(),
  competitorAnalysis: jsonb("competitorAnalysis").$type<{
    keywords: Array<{
      term: string;
      category: "area" | "service" | "target" | "concern" | "authority";
      competitorCount: number;
      selfCount: number;
      aiCitationScore: "high" | "mid" | "low";
      recommendation: "must" | "recommend" | "optional";
      selected: boolean;
    }>;
    analyzedAt: string;
  } | null>(),
  generatedTexts: jsonb("generatedTexts").$type<{
    businessDesc: string;
    serviceDescs: Array<{ title: string; body: string; axis: string }>;
    productDescs: Array<{ name: string; sourceUrl: string; body: string }>;
    generatedAt: string;
  } | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
