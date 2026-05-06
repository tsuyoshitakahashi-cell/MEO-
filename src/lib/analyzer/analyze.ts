import { fetchPage, fetchPagesParallel } from "@/lib/scraper/fetch-page";
import {
  classifyPages,
  pickPriorityPages,
} from "@/lib/scraper/classify-pages";
import { extractContent } from "@/lib/scraper/extract-content";
import { analyzeTfidfDiff } from "./tfidf";
import { callGeminiJson } from "./gemini-client";
import {
  KW_SELECTION_SYSTEM_PROMPT,
  KW_SELECTION_RESPONSE_SCHEMA,
  KeywordSelectionSchema,
  buildKwSelectionUserPrompt,
  type KeywordSelection,
} from "./prompts";

const PRIORITY_PAGES_PER_SITE = 4;

export interface AnalyzeInput {
  selfUrl: string;
  competitorUrls: string[];
}

export interface AnalyzeResult {
  selfUrl: string;
  competitorUrls: string[];
  selection: KeywordSelection;
  topTermsCount: number;
}

/**
 * 自社+競合HPを巡回 → TF-IDF分析 → Claude APIで10KW精選
 */
export async function analyzeCompetitors(
  input: AnalyzeInput,
): Promise<AnalyzeResult> {
  const allUrls = [input.selfUrl, ...input.competitorUrls];

  // 各サイトを並列巡回 → 本文収集
  const docs = await Promise.all(
    allUrls.map(async (url) => {
      const text = await crawlAndCollectText(url);
      return { id: url, text };
    }),
  );

  const self = docs[0];
  const competitors = docs.slice(1);

  // TF-IDF差分分析
  const topTerms = await analyzeTfidfDiff(self, competitors, 50);

  // Claude APIで精選
  const userPrompt = buildKwSelectionUserPrompt({
    selfUrl: input.selfUrl,
    competitorUrls: input.competitorUrls,
    topTerms: topTerms.map((t) => ({
      term: t.term,
      selfCount: t.selfCount,
      competitorCount: t.competitorCount,
      diffScore: t.diffScore,
    })),
  });

  const raw = await callGeminiJson<unknown>({
    systemPrompt: KW_SELECTION_SYSTEM_PROMPT,
    userPrompt,
    responseSchema: KW_SELECTION_RESPONSE_SCHEMA,
  });

  const selection = KeywordSelectionSchema.parse(raw);

  return {
    selfUrl: input.selfUrl,
    competitorUrls: input.competitorUrls,
    selection,
    topTermsCount: topTerms.length,
  };
}

/**
 * 1サイトを巡回し、トップ + 優先度上位ページの本文を結合して返す
 */
export async function crawlAndCollectText(url: string): Promise<string> {
  const top = await fetchPage(url);
  if (top.error || !top.html) {
    return "";
  }

  const topContent = extractContent(top.html, top.finalUrl);
  const classified = classifyPages(topContent.internalLinks);
  const priorityUrls = pickPriorityPages(
    classified,
    1,
    PRIORITY_PAGES_PER_SITE,
  );
  const priorityPages = await fetchPagesParallel(priorityUrls, 5);

  const texts = [topContent.title, topContent.body];
  for (const page of priorityPages) {
    if (!page.html) continue;
    const c = extractContent(page.html, page.finalUrl);
    texts.push(c.title, c.body);
  }

  return texts.filter(Boolean).join("\n\n");
}
