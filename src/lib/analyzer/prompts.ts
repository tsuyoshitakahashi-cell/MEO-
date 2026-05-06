import { z } from "zod";

export const KeywordCategoryEnum = z.enum([
  "area",
  "service",
  "target",
  "concern",
  "authority",
]);

export const AiCitationScoreEnum = z.enum(["high", "mid", "low"]);
export const RecommendationEnum = z.enum(["must", "recommend", "optional"]);

export const KeywordSchema = z.object({
  term: z.string(),
  category: KeywordCategoryEnum,
  competitorCount: z.number(),
  selfCount: z.number(),
  aiCitationScore: AiCitationScoreEnum,
  recommendation: RecommendationEnum,
  reason: z.string(),
});

export const KeywordSelectionSchema = z.object({
  keywords: z.array(KeywordSchema).min(15).max(20),
});

export type Keyword = z.infer<typeof KeywordSchema>;
export type KeywordSelection = z.infer<typeof KeywordSelectionSchema>;

export const KW_SELECTION_SYSTEM_PROMPT = `あなたは工務店向けの MEO/AIO（生成AI検索最適化）戦略の専門家です。

入力されるTF-IDF分析結果と自社HP本文から、ユーザーの工務店が対策すべきキーワードを **20個** 精選し、5カテゴリに分類してください。

【選定基準】
1. **クエリファンアウト対応 / ロングテール優先**
   - 生成AI検索（Google SGE、ChatGPT、Perplexity、Gemini）は単一クエリを複数のサブクエリに展開して回答を構築します
   - 単語1個のキーワードよりも、**2〜4語の複合キーワード（ロングテール）** を優先してください
   - 良い例:「飯塚市 注文住宅 平屋」「子育て世代 後悔しない 家づくり」「二世帯住宅 リノベーション 福岡」「耐震等級3 注文住宅 工務店」
   - 悪い例:「家」「住宅」（抽象的すぎ）、「工務店」（汎用すぎ）
2. **競合HPに頻出かつ自社HPで不足しているキーワード**（差分優先）
3. **AI検索で引用されやすいキーワード**
   - 疑問形（◯◯とは、◯◯の方法、◯◯と△△の違い）
   - 固有名詞（地域名・賞名・工法名）
   - 数値・実績語（年数・棟数・等級）
4. **商業的価値が高い**（資料請求・来場予約・契約に近い）
5. 工務店業界の文脈に合致する（一般語ではなく業界特化語を優先）

【カテゴリ定義（厳守）】
- **area**: 地域名（市町村、都道府県、〇〇エリア、〇〇市〇〇区 等）
  ★ **必ず3個以上** 含めてください。地域KWはMEOの最重要要素です
  ★ 単独地域名だけでなく、地域+工法・地域+ターゲット の複合語も推奨
- **service**: 工法・サービス名（例: 注文住宅、リノベーション、平屋、二世帯住宅）
- **target**: ターゲット層（例: 子育て世代、二世帯、シニア向け、共働き）
- **concern**: 課題・悩み（例: 後悔しない家づくり、予算、土地探し、断熱、価格相場）
- **authority**: 実績・権威（例: 創業30年、グッドデザイン賞、施工事例100件、耐震等級3）

【メタ情報の付与】
各キーワードに以下を付与してください:
- competitorCount: 入力データから引用（競合での出現回数合計、複合語の場合は構成語の最小値）
- selfCount: 入力データから引用（自社での出現回数、同様）
- aiCitationScore: AI検索での引用適性（high/mid/low）
  - high: 疑問形・固有名詞・数値を含む / 複合ロングテール（2語以上）
  - mid: 業界一般語、単語1個でも特化的なもの
  - low: 抽象語、単独で使い道のない語
- recommendation: 推奨度（must/recommend/optional）
  - must: 必須（自社で不足かつ競合に頻出かつ商業価値高、または地域系の中核KW）
  - recommend: 推奨（差分が中程度、ロングテールで補強したいKW）
  - optional: 参考
- reason: なぜこのKWを選定したか1文で説明（クエリファンアウトでどう機能するか触れると良い）

【出力】
JSONのみで返却。**20個** のキーワードを返してください。
- area カテゴリは **必ず3個以上**
- 他カテゴリも各最低2個ずつ含めるよう努めてください
- 各KWは **可能な限りロングテール（複合語）** に。1語のKWは20個中5個以下に抑えてください`;

/**
 * Gemini API responseSchema 用
 *
 * NOTE: minItems/maxItems は付けない。20個 + 複数enum の組合せで
 * "too many states for serving" エラーになるため、
 * 個数制御はプロンプト + Zod のpost-validation で行う。
 */
export const KW_SELECTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          category: {
            type: "string",
            enum: ["area", "service", "target", "concern", "authority"],
          },
          competitorCount: { type: "integer" },
          selfCount: { type: "integer" },
          aiCitationScore: {
            type: "string",
            enum: ["high", "mid", "low"],
          },
          recommendation: {
            type: "string",
            enum: ["must", "recommend", "optional"],
          },
          reason: { type: "string" },
        },
        required: [
          "term",
          "category",
          "competitorCount",
          "selfCount",
          "aiCitationScore",
          "recommendation",
          "reason",
        ],
        propertyOrdering: [
          "term",
          "category",
          "competitorCount",
          "selfCount",
          "aiCitationScore",
          "recommendation",
          "reason",
        ],
      },
    },
  },
  required: ["keywords"],
} as const;

export interface KwSelectionInput {
  selfUrl: string;
  competitorUrls: string[];
  /** 自社HP本文の抜粋（要約用、最大3000字程度） */
  selfTextExcerpt: string;
  topTerms: Array<{
    term: string;
    selfCount: number;
    competitorCount: number;
    diffScore: number;
  }>;
}

const SELF_TEXT_LIMIT = 3000;

export function buildKwSelectionUserPrompt(input: KwSelectionInput): string {
  const hasCompetitors = input.competitorUrls.length > 0;
  const selfText = input.selfTextExcerpt.slice(0, SELF_TEXT_LIMIT);

  const competitorBlock = hasCompetitors
    ? `【競合HP（${input.competitorUrls.length}社）】
${input.competitorUrls.map((u) => `- ${u}`).join("\n")}

【TF-IDF差分上位 ${input.topTerms.length}語（競合に頻出かつ自社で不足）】
キーワード\t自社頻度\t競合頻度\t差分スコア
${input.topTerms
  .map(
    (t) =>
      `${t.term}\t自社:${t.selfCount}\t競合:${t.competitorCount}\t差分:${t.diffScore.toFixed(4)}`,
  )
  .join("\n")}`
    : `【競合HP】指定なし
（差分分析は使用できません。自社HPの内容と工務店業界一般の AIO/MEO ベストプラクティスから10KWを推薦してください。）`;

  return `【自社HP】
${input.selfUrl}

【自社HP本文（抜粋）】
${selfText}

${competitorBlock}

上記をベースに、対策すべきキーワードを **20個** 精選し、5カテゴリに分類してJSON形式で返してください。
- area カテゴリは **必ず3個以上**
- 各KWは **可能な限りロングテール（複合語）** に
- クエリファンアウト（生成AI検索のサブクエリ展開）を意識した複合表現を推奨
${
  !hasCompetitors
    ? "競合データがないため、selfCount/competitorCount は self=入力本文中の出現回数, competitor=0 として返してください。"
    : ""
}`;
}
