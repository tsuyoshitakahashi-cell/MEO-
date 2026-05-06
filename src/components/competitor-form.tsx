"use client";

import { useState, useTransition } from "react";
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
import type { AnalyzeResult } from "@/lib/analyzer/analyze";
import type { Keyword } from "@/lib/analyzer/prompts";

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

export function CompetitorForm() {
  const [selfUrl, setSelfUrl] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([
    "",
    "",
    "",
  ]);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

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
      // 初期状態: must/recommend を選択済みに
      const initialSelected = new Set<string>();
      for (const kw of res.data.selection.keywords) {
        if (kw.recommendation !== "optional") {
          initialSelected.add(kw.term);
        }
      }
      setSelectedTerms(initialSelected);
    });
  }

  function toggleTerm(term: string) {
    const next = new Set(selectedTerms);
    if (next.has(term)) next.delete(term);
    else next.add(term);
    setSelectedTerms(next);
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
            <Label htmlFor="selfUrl">自社HP URL（必須）</Label>
            <Input
              id="selfUrl"
              type="url"
              placeholder="https://example.com/"
              value={selfUrl}
              onChange={(e) => setSelfUrl(e.target.value)}
              disabled={pending}
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
                  disabled={pending}
                />
                {competitorUrls.length > 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeCompetitor(i)}
                    disabled={pending}
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
                disabled={pending}
              >
                + 競合を追加
              </Button>
            )}
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={pending}
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
              チェックを入れたKWが Phase 3（文章生成）で使用されます。
              現在 {selectedTerms.size}個 選択中。
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
                            disabled={pending}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
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
