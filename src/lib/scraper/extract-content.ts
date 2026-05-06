import * as cheerio from "cheerio";
import type { ExtractedContent, SnsLinks } from "@/types/scraper";

const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "header",
  "footer",
  ".header",
  ".footer",
  ".nav",
  ".menu",
  ".breadcrumb",
  ".sidebar",
  "#header",
  "#footer",
  "#nav",
];

const CONTENT_SELECTORS = [
  "main",
  "article",
  '[role="main"]',
  "#content",
  ".content",
  "#main",
  ".main",
];

const SNS_PATTERNS: Array<{ key: keyof SnsLinks; pattern: RegExp }> = [
  { key: "instagram", pattern: /instagram\.com/i },
  { key: "twitter", pattern: /(?:twitter\.com|x\.com)/i },
  { key: "facebook", pattern: /facebook\.com/i },
  { key: "youtube", pattern: /(?:youtube\.com|youtu\.be)/i },
  { key: "tiktok", pattern: /tiktok\.com/i },
  { key: "line", pattern: /(?:line\.me|lin\.ee)/i },
];

export function extractContent(
  html: string,
  baseUrl: string,
): ExtractedContent {
  const $ = cheerio.load(html);

  // ノイズ除去
  $(STRIP_SELECTORS.join(",")).remove();

  // タイトル: h1 > og:title > <title>
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    "";

  // 本文: main/article優先、なければbody
  let body = "";
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length > 0) {
      body = normalizeText(el.text());
      if (body.length > 100) break;
    }
  }
  if (!body) {
    body = normalizeText($("body").text());
  }

  // 内部リンク
  const internalLinks = extractInternalLinks($, baseUrl);

  // SNSリンク
  const snsLinks = extractSnsLinks($);

  return { title, body, internalLinks, snsLinks };
}

function normalizeText(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[\t\r]+/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractInternalLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): string[] {
  let baseHost: string;
  try {
    baseHost = new URL(baseUrl).hostname;
  } catch {
    return [];
  }

  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname !== baseHost) return;
      if (!/^https?:$/.test(resolved.protocol)) return;
      // フラグメントとクエリは無視して正規化
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // ignore invalid URLs
    }
  });

  return Array.from(links);
}

function extractSnsLinks($: cheerio.CheerioAPI): SnsLinks {
  const result: SnsLinks = {};
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    for (const { key, pattern } of SNS_PATTERNS) {
      if (result[key]) continue;
      if (pattern.test(href)) {
        result[key] = href;
      }
    }
  });
  return result;
}
