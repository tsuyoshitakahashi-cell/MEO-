# MEOテキスト生成ツール

SHO-SAN社内向けのMEO初期構築アシスタント。自社HPと競合HPのURLを入力するだけで、AIO対策された GBP用テキスト群（11種）を一括生成します。

**本番URL**: https://meo-text-tool.vercel.app

## 利用者向け

- `docs/manual.md` — **MEO担当者向け操作マニュアル**（社内利用ならまずこれ）

## 開発者向けドキュメント

- `docs/requirements.md` — 要求書（WHAT/WHY）
- `docs/design.md` — 設計書（HOW）
- `docs/plan.md` — 実行計画書（WHEN/STEPS）

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (radix-nova)
- Drizzle ORM + Neon Postgres (Vercel Marketplace)
- Google Gemini 2.5 Flash（無料枠 / responseSchema による構造化JSON出力）
- Cheerio + kuromoji (HP巡回・形態素解析)

## アクセス制御

認証機能は持ちません。URL を社内のみで共有して運用します。
将来的にアクセス制限が必要になった場合は、Vercel ダッシュボードの **Settings → Deployment Protection** から有効化できます（Vercel Authentication は無料、Password Protection は Pro 以上）。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install --cache "$(pwd)/.npm-cache"
```

> グローバルnpmキャッシュの権限問題回避のため、ローカルキャッシュを使用しています。

### 2. Vercel プロジェクト連携

```bash
npx vercel link --yes --project meo-text-tool
```

### 3. Neon Postgres プロビジョニング

```bash
npx vercel integration add neon
```

完了すると `.env.local` に `DATABASE_URL` 等が自動で入ります。

### 4. その他の環境変数

`.env.local` に以下を追加（`.env.example` を参考に）:

| 変数 | 取得元 |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey （Googleアカウントでログイン → Create API key、クレカ登録不要） |

### 5. データベースマイグレーション

```bash
npm run db:push
```

### 6. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセスして動作確認。

## デプロイ（Vercel）

GitHub と連携済みなので、`main` への push で自動デプロイされます。手動デプロイは:

```bash
npx vercel --prod
```

環境変数は Neon プロビジョニング時に自動注入されています。`ANTHROPIC_API_KEY` のみ Vercel ダッシュボードの Settings → Environment Variables から登録してください。

## ディレクトリ構成

```
./
├── CLAUDE.md
├── docs/
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/ui/        # shadcn/ui
│   └── lib/
│       └── db/               # Drizzle schema/client
├── drizzle.config.ts
└── package.json
```

## CLI デモスクリプト

ローカルで動作確認用の CLI スクリプトが用意されています。

```bash
# HP巡回・商品抽出のみ（API不要）
npm run scrape:demo -- https://example-komuten.co.jp/

# 競合分析（要 GEMINI_API_KEY）
npm run analyze:demo -- https://self.example.com https://comp1.example.com https://comp2.example.com

# 文章生成（要 GEMINI_API_KEY）
npm run generate:demo -- https://self.example.com "注文住宅,リノベーション,平屋,飯塚市,耐震等級3"
```

## テスト

```bash
npm test            # 1回だけ実行
npm run test:watch  # ウォッチモード
```

## 開発ステータス

Phase 0〜5 すべて実装完了。社内テストフェーズ。詳細は `docs/plan.md` を参照。
