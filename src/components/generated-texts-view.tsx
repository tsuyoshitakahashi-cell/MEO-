"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { CHAR_LIMITS, type GeneratedTexts } from "@/lib/generator/prompts";

interface Props {
  texts: GeneratedTexts;
  selectedKeywords: string[];
}

export function GeneratedTextsView({ texts, selectedKeywords }: Props) {
  const csv = useMemo(() => buildCsv(texts), [texts]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meo-texts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>生成テキスト（11種）</CardTitle>
          <CardDescription>
            ビジネス説明文 1 / サービス説明 5 / 商品説明 5
          </CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={downloadCsv}>
          CSV ダウンロード
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ビジネス説明文 */}
        <Section title="ビジネス説明文">
          <TextCard
            title=""
            body={texts.businessDesc}
            limit={CHAR_LIMITS.businessDesc}
            usedKeywords={highlightUsed(
              texts.businessDesc,
              selectedKeywords,
            )}
          />
        </Section>

        {/* サービス説明 ×5 */}
        <Section title={`サービス説明（5軸）`}>
          <div className="space-y-3">
            {texts.serviceDescs.map((s, i) => (
              <TextCard
                key={i}
                title={`${i + 1}. ${s.title}`}
                subtitle={`軸: ${s.axis}`}
                body={s.body}
                limit={CHAR_LIMITS.serviceDesc}
                usedKeywords={highlightUsed(s.body, selectedKeywords)}
              />
            ))}
          </div>
        </Section>

        {/* 商品説明 */}
        <Section
          title={`商品説明（${texts.productDescs.length}件）`}
        >
          <div className="space-y-3">
            {texts.productDescs.map((p, i) => (
              <TextCard
                key={i}
                title={`${i + 1}. ${p.name}`}
                subtitle={p.sourceUrl}
                body={p.body}
                limit={CHAR_LIMITS.productDesc}
                usedKeywords={highlightUsed(p.body, selectedKeywords)}
              />
            ))}
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TextCard({
  title,
  subtitle,
  body,
  limit,
  usedKeywords,
}: {
  title?: string;
  subtitle?: string;
  body: string;
  limit: number;
  usedKeywords: string[];
}) {
  const overflow = body.length > limit;
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-0.5">
          {title && <p className="text-sm font-medium">{title}</p>}
          {subtitle && (
            <p className="break-all text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <CopyButton text={body} />
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">
        {body}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={overflow ? "text-red-600" : ""}>
          {body.length} / {limit} 文字
        </span>
        {usedKeywords.length > 0 && (
          <span>
            使用KW:{" "}
            {usedKeywords.map((k) => (
              <span
                key={k}
                className="ml-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {k}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function highlightUsed(body: string, keywords: string[]): string[] {
  return keywords.filter((kw) => body.includes(kw));
}

function buildCsv(texts: GeneratedTexts): string {
  const rows: string[][] = [["種別", "見出し/軸", "参照URL", "本文", "文字数"]];
  rows.push(["ビジネス説明文", "", "", texts.businessDesc, String(texts.businessDesc.length)]);
  texts.serviceDescs.forEach((s, i) => {
    rows.push([
      `サービス説明${i + 1}`,
      `${s.title} (${s.axis})`,
      "",
      s.body,
      String(s.body.length),
    ]);
  });
  texts.productDescs.forEach((p, i) => {
    rows.push([
      `商品説明${i + 1}`,
      p.name,
      p.sourceUrl,
      p.body,
      String(p.body.length),
    ]);
  });
  return rows
    .map((row) =>
      row
        .map((cell) => `"${cell.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`)
        .join(","),
    )
    .join("\n");
}
