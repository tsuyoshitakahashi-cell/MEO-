/**
 * Phase 3 動作確認スクリプト
 *
 * 使い方:
 *   npm run generate:demo -- <自社URL> "KW1,KW2,KW3,..."
 *
 * 例:
 *   npm run generate:demo -- https://self.example.com "注文住宅,リノベーション,平屋,飯塚市,耐震等級3"
 *
 * 必須環境変数:
 *   GEMINI_API_KEY  (.env.local に設定)
 */

import { generateTexts } from "@/lib/generator/generate";

async function main() {
  const [selfUrl, kwString] = process.argv.slice(2);
  if (!selfUrl || !kwString) {
    console.error(
      'Usage: npm run generate:demo -- <self-url> "KW1,KW2,KW3,..."',
    );
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY が未設定です。.env.local に追加してください。");
    process.exit(1);
  }

  const selectedKeywords = kwString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`自社: ${selfUrl}`);
  console.log(`採用KW (${selectedKeywords.length}個): ${selectedKeywords.join(", ")}`);
  console.log();

  console.log("[*] 巡回 → 商品抽出 → Gemini で11種テキスト生成中...（30〜60秒）");
  const start = Date.now();
  const result = await generateTexts({ selfUrl, selectedKeywords });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[*] 完了（${elapsed}秒）`);
  console.log(`[*] 検出商品: ${result.detectedProducts.length}件`);
  console.log();

  // ビジネス説明文
  console.log("=== ビジネス説明文 (750字以内) ===");
  console.log(`[${result.texts.businessDesc.length} / 750]`);
  console.log(result.texts.businessDesc);
  console.log();

  // サービス説明 ×5
  console.log("=== サービス説明 (各300字以内) ===");
  result.texts.serviceDescs.forEach((s, i) => {
    console.log(`--- ${i + 1}. ${s.title} (軸: ${s.axis}) [${s.body.length}/300]`);
    console.log(s.body);
    console.log();
  });

  // 商品説明
  console.log(`=== 商品説明 (${result.texts.productDescs.length}件、各1000字以内) ===`);
  result.texts.productDescs.forEach((p, i) => {
    console.log(`--- ${i + 1}. ${p.name} [${p.body.length}/1000]`);
    console.log(`URL: ${p.sourceUrl}`);
    console.log(p.body);
    console.log();
  });
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
