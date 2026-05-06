# MEOテキスト生成ツール

SHO-SAN社内向けのMEO初期構築アシスタント。自社HPと競合HPのURLを入力するだけで、AIO対策された GBP用テキスト群を一括生成します。

## 仕様

仕様の詳細は `docs/` を参照してください。

- `docs/requirements.md` — 要求書（WHAT/WHY）
- `docs/design.md` — 設計書（HOW）
- `docs/plan.md` — 実行計画書（WHEN/STEPS）

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (radix-nova)
- Drizzle ORM + Neon Postgres (Vercel Marketplace)
- Anthropic Claude Sonnet 4.6
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
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

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

## 開発ステータス

Phase 0 完了。Phase 1（スクレイパー基盤）以降は `docs/plan.md` を参照。
