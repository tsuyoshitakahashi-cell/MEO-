import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-zinc-50/80 backdrop-blur dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-base font-bold">
          MEOテキスト生成ツール
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            新規作成
          </Link>
          <Link
            href="/cases"
            className="text-muted-foreground hover:text-foreground"
          >
            案件一覧
          </Link>
        </nav>
      </div>
    </header>
  );
}
