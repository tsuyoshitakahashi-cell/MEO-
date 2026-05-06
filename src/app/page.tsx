import { CompetitorForm } from "@/components/competitor-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 dark:bg-zinc-950">
      <header className="mx-auto max-w-4xl px-6 pb-8">
        <h1 className="text-2xl font-bold">MEOテキスト生成ツール</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          競合分析 → AIO対策テキスト生成 を一気通貫で。
        </p>
      </header>
      <CompetitorForm />
    </div>
  );
}
