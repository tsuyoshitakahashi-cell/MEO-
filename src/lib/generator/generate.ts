import { fetchPage, fetchPagesParallel } from "@/lib/scraper/fetch-page";
import {
  classifyPages,
  pickPriorityPages,
} from "@/lib/scraper/classify-pages";
import { extractContent } from "@/lib/scraper/extract-content";
import { extractProducts } from "@/lib/scraper/extract-products";
import { callGeminiJson } from "@/lib/analyzer/gemini-client";
import {
  TEXT_GENERATION_SYSTEM_PROMPT,
  GENERATED_TEXTS_RESPONSE_SCHEMA,
  GeneratedTextsSchema,
  buildGenerationUserPrompt,
  trimToCharLimit,
  CHAR_LIMITS,
  type GeneratedTexts,
} from "./prompts";
import type { Product } from "@/types/scraper";

export interface GenerateInput {
  selfUrl: string;
  selectedKeywords: string[];
}

export interface GenerateResult {
  selfUrl: string;
  selectedKeywords: string[];
  texts: GeneratedTexts;
  detectedProducts: Product[];
}

const SELF_PAGES_LIMIT = 5;

/**
 * 自社HPを巡回して 11種テキストを一括生成
 */
export async function generateTexts(
  input: GenerateInput,
): Promise<GenerateResult> {
  // 自社HP巡回
  const top = await fetchPage(input.selfUrl);
  if (top.error || !top.html) {
    throw new Error(
      `自社HPの取得に失敗しました: ${top.error ?? "empty html"}`,
    );
  }

  const topContent = extractContent(top.html, top.finalUrl);
  const classified = classifyPages(topContent.internalLinks);
  const priorityUrls = pickPriorityPages(classified, 1, SELF_PAGES_LIMIT - 1);
  const priorityPages = await fetchPagesParallel(priorityUrls, 5);

  // 取得した全ページから本文収集
  const allPages = [top, ...priorityPages].filter((p) => p.html);
  const selfTexts = allPages.map((page) => {
    const c = extractContent(page.html, page.finalUrl);
    const category = classifyOrTop(page.url, classified);
    return {
      category,
      title: c.title,
      body: c.body,
    };
  });

  // 商品抽出（自社HPの product カテゴリ + トップページ）
  const productHubUrls = new Set([
    top.url,
    top.finalUrl,
    ...classified.product,
  ]);
  const productHubs = allPages.filter(
    (p) => productHubUrls.has(p.url) || productHubUrls.has(p.finalUrl),
  );
  const detectedProducts = extractProducts(productHubs, 5);

  // Geminiへ投入
  const userPrompt = buildGenerationUserPrompt({
    selfUrl: input.selfUrl,
    selfTexts,
    selectedKeywords: input.selectedKeywords,
    products: detectedProducts.map((p) => ({
      name: p.name,
      sourceUrl: p.sourceUrl,
    })),
  });

  const raw = await callGeminiJson<unknown>({
    systemPrompt: TEXT_GENERATION_SYSTEM_PROMPT,
    userPrompt,
    responseSchema: GENERATED_TEXTS_RESPONSE_SCHEMA,
    maxTokens: 8192,
  });

  const parsed = GeneratedTextsSchema.parse(raw);

  // 文字数バリデーション + 超過時 末尾切り詰め
  const texts: GeneratedTexts = {
    businessDesc: trimToCharLimit(
      parsed.businessDesc,
      CHAR_LIMITS.businessDesc,
    ),
    serviceDescs: parsed.serviceDescs.map((s) => ({
      ...s,
      body: trimToCharLimit(s.body, CHAR_LIMITS.serviceDesc),
    })),
    productDescs: parsed.productDescs.map((p) => ({
      ...p,
      body: trimToCharLimit(p.body, CHAR_LIMITS.productDesc),
    })),
  };

  return {
    selfUrl: input.selfUrl,
    selectedKeywords: input.selectedKeywords,
    texts,
    detectedProducts,
  };
}

function classifyOrTop(
  url: string,
  classified: ReturnType<typeof classifyPages>,
): string {
  for (const [category, urls] of Object.entries(classified)) {
    if (urls.includes(url)) return category;
  }
  return "top";
}
