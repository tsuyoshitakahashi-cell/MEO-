/**
 * Phase 1 動作確認スクリプト
 *
 * 使い方:
 *   npx tsx scripts/scrape-demo.ts <URL>
 *
 * 例:
 *   npx tsx scripts/scrape-demo.ts https://example.com/
 *
 * 動作:
 *   1. トップページ取得
 *   2. 内部リンク抽出 → 5カテゴリ分類
 *   3. 優先度上位5ページを並列取得
 *   4. 各ページの本文抽出
 *   5. 商品ハブページから上位5商品を抽出
 *   6. JSON で結果を表示
 */

import { fetchPage, fetchPagesParallel } from "@/lib/scraper/fetch-page";
import {
  classifyPages,
  pickPriorityPages,
} from "@/lib/scraper/classify-pages";
import { extractContent } from "@/lib/scraper/extract-content";
import { extractProducts } from "@/lib/scraper/extract-products";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx scripts/scrape-demo.ts <URL>");
    process.exit(1);
  }

  console.log(`[1/5] トップページ取得: ${url}`);
  const top = await fetchPage(url);
  if (top.error || !top.html) {
    console.error(`取得失敗: ${top.error ?? "empty html"}`);
    process.exit(1);
  }
  console.log(`  → status ${top.status}, ${top.html.length} chars`);

  console.log(`[2/5] 内部リンク抽出 + 分類`);
  const topContent = extractContent(top.html, top.finalUrl);
  console.log(`  → 内部リンク ${topContent.internalLinks.length}個`);
  console.log(
    `  → SNS: ${Object.keys(topContent.snsLinks).join(", ") || "なし"}`,
  );
  const classified = classifyPages(topContent.internalLinks);
  console.log(
    `  → 分類: product=${classified.product.length} concept=${classified.concept.length} works=${classified.works.length} service=${classified.service.length} company=${classified.company.length} other=${classified.other.length}`,
  );

  console.log(`[3/5] 優先度上位5ページを並列取得`);
  const priorityUrls = pickPriorityPages(classified, 1, 5);
  console.log(`  → 取得対象: ${priorityUrls.length}件`);
  const priorityPages = await fetchPagesParallel(priorityUrls, 5);
  for (const p of priorityPages) {
    console.log(
      `  → ${p.status === 200 ? "✓" : "✗"} ${p.url} (${p.html.length} chars)`,
    );
  }

  console.log(`[4/5] 各ページの本文抽出`);
  const allPages = [top, ...priorityPages];
  for (const page of allPages) {
    if (!page.html) continue;
    const content = extractContent(page.html, page.finalUrl);
    console.log(`  → ${page.url}`);
    console.log(`     title: ${content.title.slice(0, 60)}`);
    console.log(`     body : ${content.body.length} chars`);
  }

  console.log(`[5/5] 商品自動抽出`);
  // 商品ハブページとなりうるページ（productカテゴリ + トップ）
  const productHubs = allPages.filter(
    (p) =>
      p.html &&
      (p.url === top.url ||
        classified.product.includes(p.url) ||
        classified.product.includes(p.finalUrl)),
  );
  const products = extractProducts(productHubs, 5);
  console.log(`  → 検出商品: ${products.length}件`);
  for (const product of products) {
    console.log(`     [${product.score}] ${product.name}`);
    console.log(`       URL: ${product.sourceUrl}`);
    if (product.thumbnailUrl) {
      console.log(`       Thumb: ${product.thumbnailUrl}`);
    }
  }

  console.log("\n=== 完了 ===");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
