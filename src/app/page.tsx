import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>MEOテキスト生成ツール</CardTitle>
          <CardDescription>
            Phase 0 セットアップ完了。ログイン中のユーザー情報を表示しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">ログイン中</p>
            <p className="text-base font-medium">{session?.user?.name}</p>
            <p className="text-sm">{session?.user?.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <Button type="submit" variant="outline">
              ログアウト
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
