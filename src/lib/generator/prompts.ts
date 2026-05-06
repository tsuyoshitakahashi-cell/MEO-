import { z } from "zod";

export const ServiceDescSchema = z.object({
  axis: z.string(),
  title: z.string(),
  body: z.string(),
});

export const ProductDescSchema = z.object({
  name: z.string(),
  sourceUrl: z.string(),
  body: z.string(),
});

export const GeneratedTextsSchema = z.object({
  businessDesc: z.string(),
  serviceDescs: z.array(ServiceDescSchema).length(5),
  productDescs: z.array(ProductDescSchema).min(1).max(5),
});

export type ServiceDesc = z.infer<typeof ServiceDescSchema>;
export type ProductDesc = z.infer<typeof ProductDescSchema>;
export type GeneratedTexts = z.infer<typeof GeneratedTextsSchema>;

export const CHAR_LIMITS = {
  businessDesc: 750,
  serviceDesc: 300,
  productDesc: 1000,
} as const;

export const TEXT_GENERATION_SYSTEM_PROMPT = `あなたは工務店向けGoogleビジネスプロフィール（GBP）テキスト作成の専門家です。
AIO（AI検索最適化）対策を施した文章を生成してください。

【AIO対策ルール（必須）】
1. **結論先出し（PREP法）**: 各文章は冒頭で結論・要点を述べる
2. **固有名詞・数字・実績を明示**: 創業年・施工棟数・賞名・等級・地域名を必ず含める
3. **曖昧表現禁止**: 「高品質」「丁寧」「親切」「お客様目線」などの抽象語は具体数値・固有名詞・事実に置換
4. **Q&A要素を埋込**: 「○○とは」「○○の特徴」「対応エリア」のような明示的な構造化表現を使う
5. **一文の意味的独立性**: 各文単独で意味が通る（コンテキスト独立、AI引用しやすさ）
6. **E-E-A-T要素**: 経験・専門性・権威性・信頼性を示す具体エピソード/実績を盛り込む
7. **段落と見出し**: 短い段落、改行による視覚的整理、必要に応じ「【】」見出し
8. **採用KWの自然な挿入**: 渡されたキーワードを各テキスト内で2〜3回、文脈に沿って自然に含める
9. **NAP統一**: 会社名・住所・電話は HP 表記そのまま使用、改変しない
10. **トーン**: です・ます調、句点は文末のみ

【生成タスク（11種）】

(A) ビジネス説明文 × 1（750文字以内、必ず1文字でも超えない）
- HP全体（コンセプト/トップ/会社概要）の要点を統合
- 採用KW全体を満遍なく含める
- 構成例: 結論文 → 特徴3点 → 対応エリア → 実績/権威 → 締め

(B) サービス説明 × 5（各300文字以内）
- 5つのサービスを「異なる軸」で生成。AIが入力情報から最適な5軸を自動選定すること
- 軸の種類例: KW別 / ターゲット別 / HP抽出別 を混合して使う
  - KW別: 採用KWの中から商業価値の高いもの（例「注文住宅」「リノベーション」）
  - ターゲット別: 子育て世代/二世帯/シニア など
  - HP抽出別: 自社HPから読み取れる独自サービス
- 各サービスに axis(軸名), title(サービス名/見出し), body(本文) を付与

(C) 商品説明 × 5（各1000文字以内）
- 入力で渡される「商品リスト」の各商品について生成
- 商品名・参照URL は入力をそのまま使用
- body は商品の特徴・対象・実績を AIO ルールに沿って記述
- 商品が5つ未満なら検出数だけ生成（最低1個）

【出力】
JSONのみ返却。説明文・前置き・後書き不要。`;

/** Gemini API responseSchema 用 */
export const GENERATED_TEXTS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    businessDesc: { type: "string" },
    serviceDescs: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          axis: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["axis", "title", "body"],
        propertyOrdering: ["axis", "title", "body"],
      },
    },
    productDescs: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sourceUrl: { type: "string" },
          body: { type: "string" },
        },
        required: ["name", "sourceUrl", "body"],
        propertyOrdering: ["name", "sourceUrl", "body"],
      },
    },
  },
  required: ["businessDesc", "serviceDescs", "productDescs"],
} as const;

export interface GenerationInput {
  selfUrl: string;
  selfTexts: Array<{ category: string; title: string; body: string }>;
  selectedKeywords: string[];
  products: Array<{ name: string; sourceUrl: string }>;
}

export function buildGenerationUserPrompt(input: GenerationInput): string {
  const sectionsText = input.selfTexts
    .map((s) => `### [${s.category}] ${s.title}\n${s.body}`)
    .join("\n\n");

  const productsText =
    input.products.length > 0
      ? input.products
          .map((p, i) => `${i + 1}. ${p.name} (${p.sourceUrl})`)
          .join("\n")
      : "（HPから商品が抽出できませんでした。サービス情報をベースに想定で記述）";

  return `【自社HP】
${input.selfUrl}

【自社HP本文】
${sectionsText}

【採用キーワード（${input.selectedKeywords.length}個）】
${input.selectedKeywords.join(", ")}

【自動抽出された商品リスト（最大5個）】
${productsText}

上記をベースに、AIO対策ルールに従って:
- ビジネス説明文 × 1（750文字以内）
- サービス説明 × 5（各300文字以内、5軸はAIが最適選定）
- 商品説明 × ${Math.min(input.products.length || 1, 5)}（各1000文字以内）

を生成し、指定スキーマのJSONで返却してください。文字数は1文字でも超えないこと。`;
}

/** 文字数を超過していたら末尾で切り詰める */
export function trimToCharLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit);
}
