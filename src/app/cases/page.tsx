import Link from "next/link";
import { listCases } from "@/server/actions/case-crud";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteCaseButton } from "@/components/case-row-actions";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const result = await listCases();
  const cases = result.ok && result.data ? result.data : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>案件一覧</CardTitle>
            <CardDescription>
              保存済み案件: {cases.length}件
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/">＋ 新規案件</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!result.ok && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              読み込みに失敗しました: {result.error}
            </p>
          )}
          {result.ok && cases.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              保存された案件はまだありません。トップ画面から新規作成してください。
            </p>
          )}
          {cases.length > 0 && (
            <ul className="divide-y rounded-md border">
              {cases.map((c) => {
                const hasAnalysis = c.competitorAnalysis !== null;
                const hasTexts = c.generatedTexts !== null;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-accent"
                  >
                    <Link
                      href={`/cases/${c.id}`}
                      className="flex-1 space-y-1 cursor-pointer"
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.input.selfUrl} ／ 競合 {c.input.competitorUrls.length}社
                      </p>
                      <p className="text-xs text-muted-foreground">
                        更新: {formatDate(c.updatedAt)}
                      </p>
                      <div className="flex gap-2 pt-1 text-xs">
                        <span
                          className={`rounded px-2 py-0.5 ${
                            hasAnalysis
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                          }`}
                        >
                          {hasAnalysis ? "✓ 競合分析済" : "競合分析未"}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 ${
                            hasTexts
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                          }`}
                        >
                          {hasTexts ? "✓ 文章生成済" : "文章生成未"}
                        </span>
                      </div>
                    </Link>
                    <DeleteCaseButton id={c.id} name={c.name} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(d: Date): string {
  const date = new Date(d);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
