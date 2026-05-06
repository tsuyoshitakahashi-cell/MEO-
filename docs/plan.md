# 実行計画書（Plan）— MEOテキスト生成ツール

最終更新: 2026-05-06

---

## マイルストーン全体像

| Phase | 期間目安 | ゴール |
|---|---|---|
| Phase 0: 環境構築 | 1日 | リポジトリ・Vercel・DB・認証の土台完成 |
| Phase 1: スクレイパー基盤 | 2日 | HP巡回・本文抽出・商品自動抽出が動く |
| Phase 2: 競合分析 | 3日 | 自社+競合分析→10個KWをカテゴリ提案 |
| Phase 3: AIO文章生成 | 4日 | 11種テキスト一括生成（説明文1+サービス5+商品5） |
| Phase 4: UI仕上げ・案件管理 | 2日 | シングルページUI完成、案件保存/再編集 |
| Phase 5: 社内テスト・仕上げ | 2日 | 実案件テスト、ドキュメント整備 |

**合計**: 約14日（約2.5週間）

---

## Phase 0: 環境構築（1日）

- [x] Next.js 16 プロジェクト生成（create-next-app, pnpmは権限エラーでnpm採用）(done: 2026-05-06)
- [x] TypeScript / Tailwind / shadcn/ui セットアップ (done: 2026-05-06)
- [x] Drizzle ORM セットアップ + cases スキーマ (done: 2026-05-06)
- [x] DB ドライバを @neondatabase/serverless へ移行 (done: 2026-05-06)
- [x] `.env.example` 作成 (done: 2026-05-06)
- [x] 仮トップ画面 (done: 2026-05-06)
- [x] git init + 初回コミット (done: 2026-05-06)
- [x] GitHub remote へ push (done: 2026-05-06)
- [x] Vercel プロジェクト連携・GitHub auto-deploy 設定 (done: 2026-05-06)
- [x] Vercel Marketplace 経由で Neon Postgres プロビジョニング (done: 2026-05-06)
- [x] `.env.local` 取得 + drizzle-kit push でスキーマ反映 (done: 2026-05-06)
- [x] 認証機能を撤廃（NextAuth / Google OAuth / 認証テーブル削除） (done: 2026-05-06)

**完了条件**: ローカル `npm run dev` でトップ画面が表示され、DB接続OK

---

## Phase 1: スクレイパー基盤（2日）

### 1-1. HP巡回（1日）
- [x] `lib/scraper/fetch-page.ts`: fetch + UA設定 + タイムアウト10秒（並列取得関数も） (done: 2026-05-06)
- [x] `lib/scraper/classify-pages.ts`: URLパターンで5カテゴリ分類 + 優先度ピック (done: 2026-05-06)
- [x] `lib/scraper/extract-content.ts`: cheerioで本文抽出（main/article優先）+ 内部リンク + SNS抽出 (done: 2026-05-06)
- [x] フィクスチャ（komuten-a 5ページ / komuten-b 2ページ） (done: 2026-05-06)
- [x] ユニットテスト 23本（分類・本文抽出）全通過 (done: 2026-05-06)

### 1-2. 商品自動抽出（1日）
- [x] `lib/scraper/extract-products.ts`: 商品URLパターン、h1/img/被リンク数/パス深さでスコア (done: 2026-05-06)
- [x] 上位5件を選定するロジック (done: 2026-05-06)
- [x] ユニットテスト 10本 全通過 (done: 2026-05-06)

### 1-3. 動作確認
- [x] vitest セットアップ (done: 2026-05-06)
- [x] CLIデモスクリプト `scripts/scrape-demo.ts` (done: 2026-05-06)
- [x] end-to-end 実行確認（example.com） (done: 2026-05-06)

**完了条件**: 工務店HP URLを与えると、本文と上位5商品が抽出される ✓

---

## Phase 2: 競合分析（3日）

### 2-1. TF-IDF分析（1.5日）
- [x] kuromoji.js 導入、辞書パス設定、tokenizer初期化キャッシュ (done: 2026-05-06)
- [x] `lib/analyzer/tokenize.ts`: 形態素解析、名詞抽出、複合名詞、ストップワード除外 (done: 2026-05-06)
- [x] `lib/analyzer/tfidf.ts`: 自社baseline×競合の差分TF-IDF上位50語 (done: 2026-05-06)
- [x] ユニットテスト（tokenize 7本 + tfidf 4本） (done: 2026-05-06)

### 2-2. Gemini APIでKW精選（1日）
- [x] `lib/analyzer/claude-client.ts`: SDKラッパー、cache_control: ephemeral でプロンプトキャッシュ (done: 2026-05-06)
- [x] `lib/analyzer/prompts.ts`: AIO/MEO観点でのKW精選プロンプト + Zod schema(10KW) (done: 2026-05-06)
- [x] `lib/analyzer/analyze.ts`: 巡回→TF-IDF→Gemini のオーケストレーター (done: 2026-05-06)
- [x] `server/actions/analyze-competitors.ts`: フォーム呼び出し可能なServer Action (done: 2026-05-06)

### 2-3. UI（0.5日）
- [x] `components/competitor-form.tsx`: 自社URL + 競合URL3〜5、追加/削除可能 (done: 2026-05-06)
- [x] 結果カード: 10KWを5カテゴリ別grid、チェックボックス、推奨度バッジ、AI引用スコア表示 (done: 2026-05-06)
- [x] ローディング・エラー・バリデーション (done: 2026-05-06)

### 2-4. 動作確認
- [x] CLIデモスクリプト `scripts/analyze-demo.ts` (done: 2026-05-06)
- [x] `npm run analyze:demo <self> <comp1..>` で実行可能 (done: 2026-05-06)

**完了条件**: 自社+競合URLを入れると10個のKWがカテゴリ別に提案される ✓

---

## Phase 3: AIO文章生成（4日）

### 3-1. AIOプロンプト設計（1日）
- [x] `lib/generator/prompts.ts`: AIOシステムプロンプト10項目（PREP/固有名詞/曖昧禁止/Q&A/E-E-A-T等） (done: 2026-05-06)
- [x] Gemini responseSchema 定義（11種テキスト構造化出力） (done: 2026-05-06)
- [x] サービス説明5軸の自動選定指示（KW別/ターゲット別/HP抽出別の混合） (done: 2026-05-06)

### 3-2. 一括生成オーケストレーター（1日）
- [x] `lib/generator/generate.ts`: 自社HP巡回→商品抽出→Gemini投入 (done: 2026-05-06)
- [x] 文字数バリデーション（超過時は末尾切り詰め） (done: 2026-05-06)
- [x] gemini-clientの指数バックオフリトライを継承 (done: 2026-05-06)
- [x] `server/actions/generate-texts.ts` (done: 2026-05-06)

### 3-3. UI（1日）
- [x] `components/generated-texts-view.tsx`: 11種テキストカード(コピー/文字数/使用KW表示) (done: 2026-05-06)
- [x] `components/copy-button.tsx`: 汎用コピーボタン (done: 2026-05-06)
- [x] CSVダウンロード（11種一括） (done: 2026-05-06)
- [x] competitor-form.tsx に「文章生成」ボタンと結果連結 (done: 2026-05-06)

### 3-4. 動作確認
- [x] CLIデモスクリプト `scripts/generate-demo.ts` (done: 2026-05-06)
- [x] `npm run generate:demo -- <self> "KW1,KW2,..."` で実行可能 (done: 2026-05-06)

**完了条件**: 11種テキストがAIO対策された形で生成される ✓

---

## Phase 4: UI仕上げ・案件管理（2日）

- [x] シングルページUI統合（フォーム→分析→生成→保存の縦フロー） (done: 2026-05-06)
- [x] `server/actions/case-crud.ts`: create/read/update/list/delete (done: 2026-05-06)
- [x] `/cases` 案件一覧（最新順 / 状態バッジ / 削除確認） (done: 2026-05-06)
- [x] `/cases/[id]` 詳細・再編集（保存済みデータからフォームへ復元） (done: 2026-05-06)
- [x] サイトヘッダー追加（新規作成 / 案件一覧へのナビ） (done: 2026-05-06)
- [x] 空状態・エラーメッセージ・保存中表示 (done: 2026-05-06)

**完了条件**: 案件として保存・再編集ができる ✓

---

## Phase 5: 社内テスト・仕上げ（2日）

- [ ] 社内3名で実案件テスト
- [ ] フィードバック反映（プロンプト・UI）
- [ ] README作成（環境変数・セットアップ手順）
- [ ] 社内マニュアル作成（Notion）
- [ ] gbp-eight.vercel.app の置き換えアナウンス

**完了条件**: 社内利用開始可能

---

## 当面の次タスク

確定事項:
- アプリ正式名称: MEOテキスト生成ツール
- GitHubリポジトリ: https://github.com/tsuyoshitakahashi-cell/MEO-.git
- Vercelアカウント: tsuyoshi-takahashi-4965's projects

着手順:
1. **Phase 0 着手の合図**（ユーザー） — 実装開始の確認
2. **ユーザー側で必要な準備**:
   - GitHub: リポジトリが空であること（既存ファイルがあれば事前にバックアップ）
   - Vercel CLI ログイン（`vercel login`）
   - Google Cloud Console で OAuth 2.0 クライアント発行（後述）
   - Gemini API キーの準備（無料、https://aistudio.google.com/apikey）
3. **Claude Code でできるタスク**:
   - Next.js プロジェクトのscaffold
   - shadcn/ui・Drizzle・NextAuth のセットアップ
   - コード一式の実装
4. **ユーザー操作が必要なタスク**:
   - GitHub への初回push（OAuth/SSH設定）
   - Vercel プロジェクトの紐付け
   - 環境変数の設定（API keys / Google OAuth credentials）
   - Vercel Postgres のプロビジョニング

---

## 進捗管理ルール

- タスク着手時にチェックボックスを `[x]` に変更
- 完了タスクには `(done: 2026-MM-DD)` を末尾に追記
- ブロッカー発生時は本ファイル末尾「ブロッカー」セクションに記録
- 仕様変更が発生したら、まず requirements.md または design.md を更新してから着手

---

## ブロッカー

（現時点なし）
