import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const cases = pgTable("cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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

export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
