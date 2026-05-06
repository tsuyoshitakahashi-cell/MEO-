import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { FetchedPage, Product } from "@/types/scraper";

const PRODUCT_URL_PATTERNS = [
  /\/modelhouse\/[^/]+/i,
  /\/model-?house\/[^/]+/i,
  /\/product\/[^/]+/i,
  /\/products\/[^/]+/i,
  /\/lineup\/[^/]+/i,
  /\/line-?up\/[^/]+/i,
  /\/series\/[^/]+/i,
  /\/plan\/[^/]+/i,
  /\/plans\/[^/]+/i,
  /\/house\/[^/]+/i,
];

interface Candidate {
  url: string;
  name: string;
  summary: string;
  thumbnailUrl?: string;
  imageScore: number;
  backlinkCount: number;
  pathDepthScore: number;
}

export function extractProducts(
  hubPages: FetchedPage[],
  topN = 5,
): Product[] {
  const candidates = new Map<string, Candidate>();

  for (const page of hubPages) {
    if (!page.html) continue;
    const $ = cheerio.load(page.html);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(href, page.finalUrl || page.url).toString();
      } catch {
        return;
      }

      const isProductUrl = PRODUCT_URL_PATTERNS.some((p) =>
        p.test(absoluteUrl),
      );
      if (!isProductUrl) return;

      // 既存候補ならbacklinkCountを増やす
      const existing = candidates.get(absoluteUrl);
      if (existing) {
        existing.backlinkCount += 1;
        return;
      }

      const name = extractLinkName($, el);
      const thumbnailUrl = extractThumbnail($, el, page.finalUrl || page.url);
      const imageScore = computeImageScore($, el);
      const summary = extractSummary($, el);
      const pathDepthScore = computePathDepthScore(absoluteUrl);

      candidates.set(absoluteUrl, {
        url: absoluteUrl,
        name,
        summary,
        thumbnailUrl,
        imageScore,
        backlinkCount: 1,
        pathDepthScore,
      });
    });
  }

  const scored: Product[] = Array.from(candidates.values())
    .filter((c) => c.name)
    .map((c) => ({
      name: c.name,
      sourceUrl: c.url,
      summary: c.summary,
      thumbnailUrl: c.thumbnailUrl,
      score: computeFinalScore(c),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}

function extractLinkName(
  $: cheerio.CheerioAPI,
  el: AnyNode,
): string {
  const a = $(el);
  // h1/h2/h3を含む場合、それを優先
  const heading = a.find("h1,h2,h3,h4").first().text().trim();
  if (heading) return heading;

  // alt属性も候補
  const alt = a.find("img[alt]").first().attr("alt")?.trim();
  if (alt && alt.length > 2) return alt;

  // テキスト内容
  const text = a.text().replace(/\s+/g, " ").trim();
  if (text) return text;

  return "";
}

function extractThumbnail(
  $: cheerio.CheerioAPI,
  el: AnyNode,
  baseUrl: string,
): string | undefined {
  const src = $(el).find("img").first().attr("src");
  if (!src) return undefined;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function extractSummary(
  $: cheerio.CheerioAPI,
  el: AnyNode,
): string {
  // リンクの直後/親要素の段落を取得
  const a = $(el);
  const parent = a.parent();
  const summary = parent.find("p").first().text().replace(/\s+/g, " ").trim();
  return summary.slice(0, 300);
}

function computeImageScore(
  $: cheerio.CheerioAPI,
  el: AnyNode,
): number {
  const img = $(el).find("img").first();
  if (img.length === 0) return 0;
  const widthAttr = img.attr("width");
  const w = widthAttr ? parseInt(widthAttr, 10) : 0;
  if (Number.isFinite(w) && w >= 600) return 5;
  if (Number.isFinite(w) && w >= 300) return 3;
  return 1;
}

function computePathDepthScore(url: string): number {
  try {
    const path = new URL(url).pathname;
    const depth = path.split("/").filter(Boolean).length;
    if (depth <= 2) return 3;
    if (depth === 3) return 2;
    return 1;
  } catch {
    return 0;
  }
}

function computeFinalScore(c: Candidate): number {
  return (
    10 + // URL pattern match の基礎点
    c.imageScore +
    c.backlinkCount +
    c.pathDepthScore
  );
}
