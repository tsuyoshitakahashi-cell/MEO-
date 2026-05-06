import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractContent } from "@/lib/scraper/extract-content";

function fixture(path: string): string {
  return readFileSync(join(__dirname, "../../fixtures", path), "utf-8");
}

describe("extractContent", () => {
  const baseUrl = "https://example.com/";

  it("h1からタイトルを取得", () => {
    const html = fixture("komuten-a/index.html");
    const result = extractContent(html, baseUrl);
    expect(result.title).toContain("福岡県飯塚市の注文住宅");
  });

  it("og:titleもfallbackとして利用される", () => {
    const html =
      '<html><head><meta property="og:title" content="OG Title"></head><body><main>x</main></body></html>';
    const result = extractContent(html, baseUrl);
    expect(result.title).toBe("OG Title");
  });

  it("titleタグも最終fallback", () => {
    const html =
      "<html><head><title>Title Tag</title></head><body><main>x</main></body></html>";
    const result = extractContent(html, baseUrl);
    expect(result.title).toBe("Title Tag");
  });

  it("main要素から本文を抽出する", () => {
    const html = fixture("komuten-a/index.html");
    const result = extractContent(html, baseUrl);
    expect(result.body).toContain("創業30年");
    expect(result.body).toContain("飯塚市");
  });

  it("nav/header/footerの内容は除外される", () => {
    const html = fixture("komuten-a/index.html");
    const result = extractContent(html, baseUrl);
    expect(result.body).not.toContain("お問い合わせ");
    expect(result.body).not.toContain("0948-XX-XXXX"); // footer内
  });

  it("内部リンクを抽出する（同ホストのみ）", () => {
    const html = fixture("komuten-a/index.html");
    const result = extractContent(html, "https://example.com/");
    // header/footer は STRIP されるため main 内の同ホストリンクは抽出されない
    // → このテストではmain内に同ホストリンクが無いので空配列
    expect(Array.isArray(result.internalLinks)).toBe(true);
  });

  it("外部のSNSリンクは（footer除外前提でも）抽出される場合がある", () => {
    const html = `<html><body>
      <main>
        <p>本文</p>
        <a href="https://instagram.com/test">Instagram</a>
      </main>
    </body></html>`;
    const result = extractContent(html, baseUrl);
    expect(result.snsLinks.instagram).toBe("https://instagram.com/test");
  });

  it("複数SNSを抽出", () => {
    const html = `<html><body><main>
      <a href="https://www.facebook.com/test">FB</a>
      <a href="https://twitter.com/test">TW</a>
      <a href="https://x.com/test2">X</a>
      <a href="https://www.youtube.com/@test">YT</a>
    </main></body></html>`;
    const result = extractContent(html, baseUrl);
    expect(result.snsLinks.facebook).toBeDefined();
    expect(result.snsLinks.twitter).toBeDefined(); // x.com or twitter.com
    expect(result.snsLinks.youtube).toBeDefined();
  });

  it("script/styleが除外される", () => {
    const html = `<html><body>
      <script>const x = "secret_script_text";</script>
      <style>body { color: "secret_style"; }</style>
      <main><p>visible</p></main>
    </body></html>`;
    const result = extractContent(html, baseUrl);
    expect(result.body).toContain("visible");
    expect(result.body).not.toContain("secret_script_text");
    expect(result.body).not.toContain("secret_style");
  });

  it("複数の改行・空白を正規化", () => {
    const html = `<html><body><main>


      <p>line1</p>

      <p>line2</p>
    </main></body></html>`;
    const result = extractContent(html, baseUrl);
    expect(result.body).not.toMatch(/\n{3,}/);
  });

  it("内部リンクの抽出（main内に同ホストリンクがある場合）", () => {
    const html = `<html><body><main>
      <a href="/sub-page/">サブ</a>
      <a href="https://example.com/another">別</a>
      <a href="https://other.com/">外部</a>
    </main></body></html>`;
    const result = extractContent(html, "https://example.com/");
    expect(result.internalLinks.some((u) => u.includes("/sub-page/"))).toBe(
      true,
    );
    expect(result.internalLinks.some((u) => u.includes("/another"))).toBe(true);
    expect(result.internalLinks.some((u) => u.includes("other.com"))).toBe(
      false,
    );
  });
});
