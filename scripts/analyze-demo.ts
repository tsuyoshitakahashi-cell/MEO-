/**
 * Phase 2 動作確認スクリプト
 *
 * 使い方:
 *   npx dotenv -e .env.local -- tsx scripts/analyze-demo.ts <自社URL> <競合URL1> [競合URL2] [競合URL3] ...
 *
 * 例:
 *   npx dotenv -e .env.local -- tsx scripts/analyze-demo.ts https://self.example.com https://comp1.example.com https://comp2.example.com https://comp3.example.com
 *
 * 必須環境変数:
 *   ANTHROPIC_API_KEY  (.env.local に設定)
 *
 * 動作:
 *   1. 自社+競合のHPを並列巡回
 *   2. 形態素解析→TF-IDFで上位50KW抽出
 *   3. Claude APIで10KW精選 + 5カテゴリ分類
 *   4. 結果をコンソール出力
 */

import { analyzeCompetitors } from "@/lib/analyzer/analyze";

async function main() {
  const [selfUrl, ...competitorUrls] = process.argv.slice(2);
  if (!selfUrl || competitorUrls.length < 3) {
    console.error(
      "Usage: npx dotenv -e .env.local -- tsx scripts/analyze-demo.ts <self> <competitor1> <competitor2> <competitor3> [...]",
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY が未設定です。.env.local に追加してください。");
    process.exit(1);
  }

  console.log(`自社: ${selfUrl}`);
  console.log(`競合 (${competitorUrls.length}社):`);
  for (const url of competitorUrls) console.log(`  - ${url}`);
  console.log();

  console.log("[*] 巡回 → TF-IDF → Claude精選 を実行中...（30〜60秒）");
  const start = Date.now();
  const result = await analyzeCompetitors({
    selfUrl,
    competitorUrls,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[*] 完了（${elapsed}秒）。TF-IDF候補: ${result.topTermsCount}件`);
  console.log();

  console.log("=== 提案キーワード10個 ===");
  for (const kw of result.selection.keywords) {
    console.log(
      `[${kw.recommendation}] [${kw.category}] ${kw.term} (AI引用:${kw.aiCitationScore}, 自社${kw.selfCount}/競合${kw.competitorCount})`,
    );
    console.log(`    理由: ${kw.reason}`);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
