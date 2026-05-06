"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { analyzeCompetitorsAction } from "@/server/actions/analyze-competitors";
import { generateTextsAction } from "@/server/actions/generate-texts";
import {
  createCase,
  updateCase,
} from "@/server/actions/case-crud";
import type { AnalyzeResult } from "@/lib/analyzer/analyze";
import type { Keyword } from "@/lib/analyzer/prompts";
import type { GenerateResult } from "@/lib/generator/generate";
import { GeneratedTextsView } from "@/components/generated-texts-view";

const URL_SCHEMA = z.string().url();

const CATEGORY_LABELS: Record<Keyword["category"], string> = {
  area: "地域系",
  service: "工法・サービス系",
  target: "ターゲット系",
  concern: "課題・悩み系",
  authority: "実績・権威系",
};

const RECOMMENDATION_LABELS: Record<Keyword["recommendation"], string> = {
  must: "必須",
  recommend: "推奨",
  optional: "参考",
};

const RECOMMENDATION_COLOR: Record<Keyword["recommendation"], string> = {
  must: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  recommend:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  optional:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

export interface InitialCase {
  id: string;
  name: string;
  selfUrl: string;
  competitorUrls: string[];
  competitorAnalysis: AnalyzeResult | null;
  selectedTerms: string[];
  generateResult: GenerateResult | null;
}

interface Props {
  initial?: InitialCase;
}

export function CompetitorForm({ initial }: Props) {
  const router = useRouter();

  const [caseName, setCaseName] = useState(initial?.name ?? "");
  const [caseId, setCaseId] = useState<string | null>(initial?.id ?? null);
  const [selfUrl, setSelfUrl] = useState(initial?.selfUrl ?? "");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(
    initial?.competitorUrls.length
      ? padToMinLength(initial.competitorUrls, 3)
      : ["", "", ""],
  );
  const [result, setResult] = useState<AnalyzeResult | null>(
    initial?.competitorAnalysis ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(
    new Set(initial?.selectedTerms ?? []),
  );
  const [pending, startTransition] = useTransition();

  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
    initial?.generateResult ?? null,
  );
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, startSaving] = useTransition();

  function updateCompetitorUrl(index: number, value: string) {
    const next = [...competitorUrls];
    next[index] = value;
    setCompetitorUrls(next);
  }

  function addCompetitor() {
    if (competitorUrls.length < 5) {
      setCompetitorUrls([...competitorUrls, ""]);
    }
  }

  function removeCompetitor(index: number) {
    if (competitorUrls.length > 3) {
      setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
    }
  }

  function validateInputs(): string | null {
    if (!URL_SCHEMA.safeParse(selfUrl).success) {
      return "自社HPのURLを正しく入力してください";
    }
    const filledCompetitors = competitorUrls.filter((u) => u.trim() !== "");
    if (filledCompetitors.length < 3) {
      return "競合HPは3〜5社入力してください";
    }
    for (const url of filledCompetitors) {
      if (!URL_SCHEMA.safeParse(url).success) {
        return `競合URL「${url}」が不正です`;
      }
    }
    return null;
  }

  function handleAnalyze() {
    setError(null);
    setResult(null);
    setSelectedTerms(new Set());
    setGenerateResult(null);
    setGenerateError(null);
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const filledCompetitors = competitorUrls
        .map((u) => u.trim())
        .filter(Boolean);
      const res = await analyzeCompetitorsAction({
        selfUrl: selfUrl.trim(),
        competitorUrls: filledCompetitors,
      });
      if (!res.ok || !res.data) {
        setError(res.error ?? "分析に失敗しました");
        return;
      }
      setResult(res.data);
      const initialSelected = new Set<string>();
      for (const kw of res.data.selection.keywords) {
        if (kw.recommendation !== "optional") {
          initialSelected.add(kw.term);
        }
      }
      setSelectedTerms(initialSelected);
    });
  }

  function handleGenerate() {
    setGenerateError(null);
    setGenerateResult(null);
    if (selectedTerms.size === 0) {
      setGenerateError("採用するキーワードを1つ以上選択してください");
      return;
    }
    startGenerating(async () => {
      const res = await generateTextsAction({
        selfUrl: selfUrl.trim(),
        selectedKeywords: Array.from(selectedTerms),
      });
      if (!res.ok || !res.data) {
        setGenerateError(res.error ?? "文章生成に失敗しました");
        return;
      }
      setGenerateResult(res.data);
    });
  }

  function toggleTerm(term: string) {
    const next = new Set(selectedTerms);
    if (next.has(term)) next.delete(term);
    else next.add(term);
    setSelectedTerms(next);
  }

  function handleSave() {
    setSaveError(null);
    if (!caseName.trim()) {
      setSaveError("案件名を入力してください");
      return;
    }
    if (!result) {
      setSaveError("先に競合分析を実行してください");
      return;
    }

    startSaving(async () => {
      const filledCompetitors = competitorUrls
        .map((u) => u.trim())
        .filter(Boolean);

      const competitorAnalysis = result
        ? {
            keywords: result.selection.keywords.map((kw) => ({
              term: kw.term,
              category: kw.category,
              competitorCount: kw.competitorCount,
              selfCount: kw.selfCount,
              aiCitationScore: kw.aiCitationScore,
              recommendation: kw.recommendation,
              selected: selectedTerms.has(kw.term),
            })),
            analyzedAt: new Date().toISOString(),
          }
        : null;

      const generatedTexts = generateResult
        ? {
            ...generateResult.texts,
            generatedAt: new Date().toISOString(),
          }
        : null;

      const payload = {
        name: caseName.trim(),
        input: {
          selfUrl: selfUrl.trim(),
          competitorUrls: filledCompetitors,
        },
        competitorAnalysis,
        generatedTexts,
      };

      if (caseId) {
        const res = await updateCase(caseId, payload);
        if (!res.ok) {
          setSaveError(res.error ?? "保存に失敗しました");
          return;
        }
        setSavedAt(new Date());
        router.refresh();
      } else {
        const res = await createCase(payload);
        if (!res.ok || !res.data) {
          setSaveError(res.error ?? "保存に失敗しました");
          return;
        }
        setCaseId(res.data.id);
        setSavedAt(new Date());
        router.push(`/cases/${res.data.id}`);
      }
    });
  }

  const groupedKeywords = groupByCategory(
    result?.selection.keywords ?? [],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>競合分析・対策KW提案</CardTitle>
          <CardDescription>
            自社HPと競合工務店3〜5社のHPを入力すると、AIO対策に有効なキーワード10個をカテゴリ別に提案します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="caseName">案件名</Label>
            <Input
              id="caseName"
              type="text"
              placeholder="例: 株式会社サンプル工務店A"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              disabled={pending || generating || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="selfUrl">自社HP URL（必須）</Label>
            <Input
              id="selfUrl"
              type="url"
              placeholder="https://example.com/"
              value={selfUrl}
              onChange={(e) => setSelfUrl(e.target.value)}
              disabled={pending || generating || saving}
            />
          </div>

          <div className="space-y-2">
            <Label>競合HP URL（3〜5社）</Label>
            {competitorUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="url"
                  placeholder={`競合 ${i + 1}: https://...`}
                  value={url}
                  onChange={(e) => updateCompetitorUrl(i, e.target.value)}
                  disabled={pending || generating || saving}
                />
                {competitorUrls.length > 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeCompetitor(i)}
                    disabled={pending || generating || saving}
                  >
                    削除
                  </Button>
                )}
              </div>
            ))}
            {competitorUrls.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={addCompetitor}
                disabled={pending || generating || saving}
              >
                + 競合を追加
              </Button>
            )}
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={pending || generating || saving}
            className="w-full"
          >
            {pending ? "分析中…（30〜60秒）" : "競合分析を実行"}
          </Button>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>提案キーワード（10個）</CardTitle>
            <CardDescription>
              チェックを入れたKWが文章生成で使用されます。現在 {selectedTerms.size}個 選択中。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(["area", "service", "target", "concern", "authority"] as const).map(
              (cat) => {
                const items = groupedKeywords[cat] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {CATEGORY_LABELS[cat]}（{items.length}）
                    </h3>
                    <div className="space-y-2">
                      {items.map((kw) => (
                        <label
                          key={kw.term}
                          className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent"
                        >
                          <Checkbox
                            checked={selectedTerms.has(kw.term)}
                            onCheckedChange={() => toggleTerm(kw.term)}
                            disabled={pending || generating || saving}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{kw.term}</span>
                              <span
                                className={`rounded px-2 py-0.5 text-xs ${RECOMMENDATION_COLOR[kw.recommendation]}`}
                              >
                                {RECOMMENDATION_LABELS[kw.recommendation]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                AI引用: {kw.aiCitationScore}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                自社{kw.selfCount}/競合{kw.competitorCount}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {kw.reason}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              },
            )}

            <div className="space-y-2 border-t pt-4">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={
                  generating || saving || selectedTerms.size === 0 || pending
                }
                className="w-full"
              >
                {generating
                  ? "文章生成中…（30〜60秒）"
                  : `選択中の${selectedTerms.size}KWで AIO文章を一括生成`}
              </Button>
              {generateError && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {generateError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {generateResult && (
        <GeneratedTextsView
          texts={generateResult.texts}
          selectedKeywords={generateResult.selectedKeywords}
        />
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{caseId ? "案件を更新" : "案件として保存"}</CardTitle>
            <CardDescription>
              {caseId
                ? "現在の状態で既存の案件を更新します。"
                : "現在の入力・分析・生成結果を案件として保存します。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || pending || generating}
              variant="default"
            >
              {saving
                ? "保存中…"
                : caseId
                  ? "案件を更新"
                  : "案件を保存"}
            </Button>
            {savedAt && (
              <p className="text-sm text-muted-foreground">
                保存しました（{savedAt.toLocaleTimeString("ja-JP")}）
              </p>
            )}
            {saveError && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {saveError}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function groupByCategory(
  keywords: Keyword[],
): Partial<Record<Keyword["category"], Keyword[]>> {
  const grouped: Partial<Record<Keyword["category"], Keyword[]>> = {};
  for (const kw of keywords) {
    if (!grouped[kw.category]) grouped[kw.category] = [];
    grouped[kw.category]!.push(kw);
  }
  return grouped;
}

function padToMinLength(arr: string[], min: number): string[] {
  const result = [...arr];
  while (result.length < min) result.push("");
  return result;
}
