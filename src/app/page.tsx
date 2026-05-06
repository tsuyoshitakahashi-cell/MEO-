import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>MEOテキスト生成ツール</CardTitle>
          <CardDescription>
            自社HPと競合HPのURLからAIO対策された GBP用テキストを一括生成します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Phase 0 セットアップ完了。Phase 1 以降で入力フォーム・生成機能を実装予定。
          </p>
          <Button disabled>新規案件を作成（実装中）</Button>
        </CardContent>
      </Card>
    </div>
  );
}
