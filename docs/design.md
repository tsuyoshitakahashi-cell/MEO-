# 設計書（Design）— MEOテキスト生成ツール

最終更新: 2026-05-07

## 環境情報

- **GitHubリポジトリ**: https://github.com/tsuyoshitakahashi-cell/MEO-.git
- **Vercelアカウント**: tsuyoshi-takahashi-4965's projects
- **アクセス制御**: なし（URL秘匿運用）

---

## 1. 技術スタック

| レイヤ | 採用技術 | バージョン目安 | 理由 |
|---|---|---|---|
| フレームワーク | Next.js (App Router) | 15.x | フルスタック1リポジトリ、Vercelとの親和性 |
| 言語 | TypeScript | 5.x | 型安全 |
| UIライブラリ | shadcn/ui + Tailwind CSS | 最新 | 軽量・カスタマイズ容易 |
| フォーム管理 | React Hook Form + Zod | 最新 | バリデーション統合 |
| LLM | Google Gemini 2.5 Flash | gemini-2.5-flash | 無料枠で十分（15rpm / 1Mトークン/日）、responseSchemaで構造化出力 |
| LLM SDK | @google/genai | 最新 | 公式統一SDK |
| HTMLスクレイピング | Cheerio + fetch | 最新 | 軽量、JSレンダリング不要なサイト向け |
| 認証 | なし | — | 社内URL秘匿運用、必要に応じVercel Deployment Protection後付け |
| データベース | Vercel Postgres | — | Vercel完結、運用負荷低 |
| ORM | Drizzle ORM | 最新 | 軽量、型安全 |
| ホスティング | Vercel | — | Next.js公式、CI/CD自動 |
| パッケージマネージャ | npm | 11.x | corepack経由のpnpmが権限エラー、Node 24に同梱のnpmで代替 |

---

## 2. アーキテクチャ概要

```
┌────────────────────────────────────────────────────┐
│  Browser (Next.js Client Components)                │
│  - 入力フォーム（自社URL + 競合URL × 0〜5・任意）     │
│  - 競合分析結果（KWチェックリスト）                  │
│  - 生成テキスト一覧（11種カード）                    │
└──────────────────┬─────────────────────────────────┘
                   │ Server Actions
                   ↓
┌────────────────────────────────────────────────────┐
│  Next.js Server (Vercel)                            │
│  ├ Server Action: analyzeCompetitors                │
│  │   ├ 自社+競合HP巡回（並列）                       │
│  │   ├ 本文抽出 + KW頻度分析                         │
│  │   └ Gemini APIでKW精選 + カテゴリ分類            │
│  └ Server Action: generateTexts                     │
│      ├ 採用KWと取得HPをGemini APIに投入             │
│      ├ AIOプロンプトで11種テキスト生成              │
│      └ 結果保存                                      │
└────────┬────────────────────────┬──────────────────┘
         ↓                        ↓
┌──────────────────┐    ┌──────────────────┐
│  Gemini API    │    │  Vercel Postgres │
│  (gemini-2.5-flash)│   │  (cases)         │
└──────────────────┘    └──────────────────┘
```

---

## 3. ディレクトリ構成

```
./
├── CLAUDE.md
├── docs/
│   ├── requirements.md
│   ├── design.md
│   └── plan.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # 案件一覧
│   │   └── cases/
│   │       ├── new/page.tsx            # 新規案件（フォーム+結果のシングルページ）
│   │       └── [id]/page.tsx           # 既存案件編集
│   ├── components/
│   │   ├── ui/                         # shadcn/ui
│   │   ├── case-form.tsx               # 入力フォーム
│   │   ├── competitor-result.tsx       # KW提案カード（チェックボックス）
│   │   └── generated-texts.tsx         # 11種テキストカード
│   ├── lib/
│   │   ├── scraper/
│   │   │   ├── fetch-page.ts
│   │   │   ├── classify-pages.ts       # URL→5カテゴリ分類
│   │   │   ├── extract-content.ts      # cheerio本文抽出
│   │   │   └── extract-products.ts     # 商品ページ自動抽出
│   │   ├── analyzer/
│   │   │   ├── tfidf.ts                # TF-IDF頻度分析
│   │   │   ├── analyze.ts              # 競合分析オーケストレーター
│   │   │   └── prompts.ts              # KW精選プロンプト
│   │   ├── generator/
│   │   │   ├── gemini-client.ts
│   │   │   ├── prompts.ts              # AIO対策システムプロンプト
│   │   │   └── generate.ts             # 11種一括生成オーケストレーター
│   │   └── db/
│   │       ├── schema.ts               # Drizzle schema
│   │       └── client.ts
│   ├── server/
│   │   └── actions/
│   │       ├── analyze-competitors.ts
│   │       ├── generate-texts.ts
│   │       └── case-crud.ts
│   └── types/
│       └── index.ts
├── tests/
│   ├── lib/
│   │   ├── scraper.test.ts
│   │   ├── tfidf.test.ts
│   │   └── extract-products.test.ts
│   └── fixtures/
│       └── sample-html/                # 工務店HPフィクスチャ
├── public/
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── drizzle.config.ts
```

---

## 4. データモデル

```typescript
// cases (案件) — 認証なしのため userId は持たない
{
  id: uuid,
  name: string,                    // 案件名（会社名）
  input: {
    selfUrl: string,
    competitorUrls: string[],      // 0〜5個・任意
    companyName?: string,
    industry?: string,
    additionalKeywords?: string[],
  },
  competitorAnalysis: {
    keywords: Array<{
      term: string,
      category: 'area' | 'service' | 'target' | 'concern' | 'authority',
      competitorCount: number,
      selfCount: number,
      aiCitationScore: 'high' | 'mid' | 'low',
      recommendation: 'must' | 'recommend' | 'optional',
      selected: boolean,           // 採用フラグ
    }>,
    analyzedAt: timestamp,
  },
  generatedTexts: {
    businessDesc: string,                              // 1個
    serviceDescs: Array<{ title: string, body: string, axis: string }>,  // 5個
    productDescs: Array<{ name: string, sourceUrl: string, body: string }>,  // 最大5個
    generatedAt: timestamp,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

---

## 5. 主要処理フロー

### 5.1 競合分析フロー

```
1. ユーザーが自社URL + 競合URL（0〜5・任意）を入力 → analyzeCompetitors実行
2. 各HPを並列fetch（タイムアウト10秒）
3. 各HPでcheerioパース → 内部リンク抽出 → 5カテゴリ分類
   （商品・コンセプト・施工事例・サービス・会社概要）
4. 優先度順に最大5ページずつ追加取得（並列）
5. 全本文を結合し、形態素解析（kuromoji）でtoken化
6. TF-IDFで競合特徴KWを抽出（自社をベースラインに相対比較）
7. Gemini APIに以下を渡してKW精選 + カテゴリ分類:
   - 競合TF-IDF上位50語
   - 自社頻出KW
   - AI引用適性の判定指示
   - 5カテゴリへの分類指示
8. 出力: 20個のKW（カテゴリ別、メタ情報付き）
```

### 5.2 文章生成フロー

```
1. ユーザーが採用KWを選択 → generateTexts実行
2. 取得済みのHP本文と採用KWをGemini APIに投入
3. システムプロンプト（AIO対策ルール）+ ユーザープロンプトで一括生成
4. 出力構造:
   {
     businessDesc: "...(750字以内)",
     serviceDescs: [
       { title: "...", axis: "KW", body: "..." },  // 5個
       ...
     ],
     productDescs: [
       { name: "...", sourceUrl: "...", body: "..." },  // 最大5個
       ...
     ]
   }
5. 各テキストの文字数を検証 → 超過があれば末尾削除
6. DB保存 + クライアント返却
```

### 5.3 商品自動抽出ロジック

```
入力: 取得済みHP（自社）
処理:
  - URL正規表現で商品ページ候補を抽出
    /project/, /modelhouse/, /works/, /lineup/, /case/
  - 各候補ページのh1/title、サムネ画像を取得
  - 重要度スコア = (位置の浅さ + 画像サイズ + 内部被リンク数)
  - 上位5件を選定
出力: Array<{ name, sourceUrl, summary }>
```

---

## 6. プロンプト設計

### 6.1 競合KW精選プロンプト（システム、キャッシュ対象）

```
あなたは工務店向けMEO/AIO戦略の専門家です。
入力されたTF-IDF分析結果から、以下の基準で20個のキーワードを精選してください（area≥3、ロングテール優先）。

【選定基準】
- 競合に頻出かつ自社で不足しているKW（差分優先）
- AI検索（ChatGPT/Perplexity/SGE）で引用されやすいKW（疑問形・固有名詞・地域名）
- 商業的価値が高い（資料請求・来場予約に繋がる）

【カテゴリ分類】
- area: 地域名（市町村・都道府県）
- service: 工法・サービス（注文住宅、リノベ等）
- target: ターゲット（子育て世代等）
- concern: 課題・悩み（後悔しない、予算等）
- authority: 実績・権威（創業年数、受賞等）

【出力形式】JSON Schema厳守
```

### 6.2 AIO文章生成プロンプト（システム、キャッシュ対象）

```
あなたは工務店向けGoogleビジネスプロフィール（GBP）テキスト作成の専門家です。
以下のAIO対策ルールに厳密に従って文章を生成してください。

【AIO対策の必須要件】
1. 結論先出し（PREP法）
2. 固有名詞・数字・実績を必ず含める
3. 曖昧表現禁止（「高品質」「丁寧」「親切」→具体的な数字・固有名詞へ）
4. Q&A要素を文中に埋込（「○○とは：」「特徴：」のような明示的構造）
5. 一文の意味が独立して取り出せる（コンテキスト独立）
6. E-E-A-T要素（経験・専門性・権威性・信頼性）を明示
7. 短い段落、明確な見出し
8. 採用KWを自然に2〜3回含める

【生成タスク】
- ビジネス説明文 × 1（750字以内）
- サービス説明 × 5（各300字以内）：5つの軸を以下から自動選定
  - KW別 / ターゲット別 / HP抽出別の混合で5パターン作成
- 商品説明 × 5（各1000字以内）：HPから抽出した商品ごと

【出力】JSON Schema厳守、文字数厳守（超過禁止）
```

---

## 7. 設計判断の記録

### 2026-05-06 — スコープ大幅縮小
- NAP/UTM/チェックリスト/ヒアリングシートを削除
- 競合分析機能を新規追加
- 工数 約3週間 → 約2週間に短縮

### 2026-05-06 — 形態素解析にkuromoji採用
- 日本語TF-IDFのため形態素解析が必須
- kuromoji.js は純JS、Vercelサーバレスで動作可能
- MeCab系（外部プロセス）は不採用

### 2026-05-06 — シングルページUI採用
- タブ切替より「フォーム→分析→生成」の縦フローが自然
- 担当者の作業順序とUIが一致するため

### 2026-05-06 — 競合は最大5社・各最大5ページ
- 5×5=25ページ並列fetch、Vercel関数の制限内（60秒）
- Gemini APIへの投入トークンも管理可能範囲

### 2026-05-07 — KW提案を10個→20個へ拡張、area≥3 + ロングテール対応
- クエリファンアウト（生成AI検索でのクエリ展開）に対応するため、複合語・ロングテールKWを優先
- area カテゴリの最低3個保証（MEOで地域は最重要）
- Zod schema は最低15個・最大20個に緩和（Geminiの出力ばらつきを許容）
- responseSchema minItems/maxItems も同様に更新

### 2026-05-07 — 商品抽出の対象を「お問い合わせ動線」優先に
- 商品抽出ターゲット拡張: モデルハウス、個別相談、来場予約、見学会、保証、アフターメンテ、商品ラインナップ
- ブログ/コラム/ニュース/お知らせ/スタッフ日誌は全工程で除外
  - classify-pages.ts でも明示的にスキップ（TF-IDFのノイズ除去）
  - extract-products.ts では URL EXCLUDE_PATTERNS で先にフィルタ

### 2026-05-06 — 競合URLを必須から任意（0〜5社）に変更
- 競合HPがない案件でも初動で使えるようにするため
- 競合0時は TF-IDF差分が使えないため、自社HP本文をプロンプトに直接含めて Gemini に推薦させる
- 競合あり時は従来通り TF-IDF表 + 自社HP抜粋の両方をプロンプトに含める
- 仕様書の「3〜5個」記述を「0〜5個・任意」に統一

### 2026-05-06 — LLMをAnthropic ClaudeからGoogle Geminiへ切替
- Anthropic は従量課金で社内利用にハードルあり
- Gemini 2.5 Flash の無料枠（15rpm / 1Mトークン日 / 1500req日）で十分
- responseSchema による構造化出力でJSON失敗率が下がる
- パッケージ: `@anthropic-ai/sdk` → `@google/genai`
- 環境変数: `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`
- 仕様書のLLM参照箇所を全更新

### 2026-05-06 — 認証機能を撤廃
- ログイン UI が冗長に感じられたため削除
- 代替: URLを社内のみで共有、必要に応じて Vercel Deployment Protection を後付け
- 関連削除: NextAuth/Auth.js、Google OAuth、users/accounts/sessions テーブル、cases.userId カラム

### 2026-05-06 — DB Vercel Postgres + Drizzle
- Vercel完結、運用負荷低
- Drizzle は型安全 + 軽量

---

## 8. リスクと対応

| リスク | 影響 | 対応 |
|---|---|---|
| HPがJSレンダリング必須 | 本文抽出失敗 | Phase 4でPlaywright導入を検討 |
| 競合5サイトの巡回が遅い | UX劣化 | 並列fetch、タイムアウト10秒 |
| Gemini API無料枠超過 | 一時的に呼び出し失敗 | 15rpm/1Mトークン日上限。レート制限時は1分待機リトライ。Pro有料プランへの切替も可 |
| 商品ページ自動抽出の精度低下 | 商品説明の質低下 | URLパターン辞書を継続更新 |
| 競合HPがrobots.txtで拒否 | 巡回失敗 | エラー時はメッセージ表示、他のHPで継続 |
| 形態素解析の精度 | KW抽出精度低下 | kuromojiの辞書をipadic標準で運用、必要に応じカスタム辞書追加 |
