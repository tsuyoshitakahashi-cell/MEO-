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
- NextAuth v5（Google認証 / @sho-san.co.jp 限定）
- Drizzle ORM + Vercel Postgres
- Anthropic Claude Sonnet 4.6
- Cheerio + kuromoji (HP巡回・形態素解析)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install --cache "$(pwd)/.npm-cache"
```

> グローバルnpmキャッシュの権限問題回避のため、ローカルキャッシュを使用しています。

### 2. 環境変数の準備

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定してください。

| 変数 | 取得元 |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `AUTH_GOOGLE_ID` | Google Cloud Console → 認証情報 → OAuth 2.0クライアントID |
| `AUTH_GOOGLE_SECRET` | 同上 |
| `POSTGRES_*` | Vercel Postgres → .env.local タブからコピー |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

### 3. Google OAuth クライアントの作成

1. https://console.cloud.google.com/ で新規プロジェクト作成
2. APIとサービス → 認証情報 → 「OAuth 2.0クライアントID」を作成
3. アプリケーション種別: ウェブアプリケーション
4. 承認済みのリダイレクトURI:
   - `http://localhost:3000/api/auth/callback/google`（開発）
   - `https://<your-vercel-domain>/api/auth/callback/google`（本番）
5. クライアントID/シークレットを `.env.local` に貼り付け

### 4. Vercel Postgres のプロビジョニング

1. Vercel ダッシュボード → このプロジェクト → Storage → Create Database → Postgres
2. 作成後、`.env.local` タブの内容を `.env.local` にコピー

### 5. データベースマイグレーション

```bash
npx drizzle-kit push
```

### 6. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス → Googleログイン → 動作確認

## デプロイ（Vercel）

```bash
npx vercel
```

初回時にプロジェクト名とリンク先（`tsuyoshi-takahashi-4965's projects`）を選択。

環境変数は Vercel ダッシュボードの Settings → Environment Variables から登録してください。

## ディレクトリ構成

```
./
├── CLAUDE.md
├── docs/
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/ui/        # shadcn/ui
│   ├── lib/
│   │   ├── auth.ts           # NextAuth設定
│   │   └── db/               # Drizzle schema/client
│   └── middleware.ts         # 認証ガード
├── drizzle.config.ts
└── package.json
```

## 開発ステータス

Phase 0 完了。Phase 1（スクレイパー基盤）以降は `docs/plan.md` を参照。
