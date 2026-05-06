import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractProducts } from "@/lib/scraper/extract-products";
import type { FetchedPage } from "@/types/scraper";

function makeFetchedPage(url: string, fixturePath: string): FetchedPage {
  const html = readFileSync(
    join(__dirname, "../../fixtures", fixturePath),
    "utf-8",
  );
  return { url, finalUrl: url, status: 200, html };
}

describe("extractProducts", () => {
  it("modelhouse一覧から5件抽出する", () => {
    const page = makeFetchedPage(
      "https://example.com/modelhouse/",
      "komuten-a/modelhouse.html",
    );
    const products = extractProducts([page]);
    expect(products).toHaveLength(5);
    const names = products.map((p) => p.name);
    expect(names.some((n) => n.includes("ZEN STYLE"))).toBe(true);
    expect(names.some((n) => n.includes("FAMILY HOUSE"))).toBe(true);
    expect(names.some((n) => n.includes("CAT HOUSE"))).toBe(true);
  });

  it("各商品にsourceUrlが含まれる", () => {
    const page = makeFetchedPage(
      "https://example.com/modelhouse/",
      "komuten-a/modelhouse.html",
    );
    const products = extractProducts([page]);
    expect(
      products.every((p) => p.sourceUrl.includes("/modelhouse/")),
    ).toBe(true);
  });

  it("画像幅が大きい商品ほどスコアが高い", () => {
    const html = `<html><body>
      <a href="/modelhouse/big/"><img src="/big.jpg" width="800">大画像商品</a>
      <a href="/modelhouse/small/"><img src="/small.jpg" width="100">小画像商品</a>
    </body></html>`;
    const products = extractProducts([
      { url: "https://example.com/", finalUrl: "https://example.com/", status: 200, html },
    ]);
    expect(products[0].name).toBe("大画像商品");
    expect(products[0].score).toBeGreaterThan(products[1].score);
  });

  it("複数ハブページ間で被リンク数を集計", () => {
    const hub1 = `<html><body>
      <a href="/modelhouse/popular/">人気商品</a>
    </body></html>`;
    const hub2 = `<html><body>
      <a href="/modelhouse/popular/">人気商品</a>
      <a href="/modelhouse/other/">別商品</a>
    </body></html>`;
    const products = extractProducts([
      { url: "https://example.com/a", finalUrl: "https://example.com/a", status: 200, html: hub1 },
      { url: "https://example.com/b", finalUrl: "https://example.com/b", status: 200, html: hub2 },
    ]);
    const popular = products.find((p) => p.name === "人気商品");
    const other = products.find((p) => p.name === "別商品");
    expect(popular).toBeDefined();
    expect(other).toBeDefined();
    expect(popular!.score).toBeGreaterThan(other!.score);
  });

  it("商品URLパターンに該当しないリンクは無視する", () => {
    const html = `<html><body>
      <a href="/news/post-1/">ニュース</a>
      <a href="/contact/">お問い合わせ</a>
      <a href="/modelhouse/real/">リアル商品</a>
    </body></html>`;
    const products = extractProducts([
      { url: "https://example.com/", finalUrl: "https://example.com/", status: 200, html },
    ]);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("リアル商品");
  });

  it("topNを指定すると上位N件のみ返す", () => {
    const page = makeFetchedPage(
      "https://example.com/modelhouse/",
      "komuten-a/modelhouse.html",
    );
    const products = extractProducts([page], 3);
    expect(products).toHaveLength(3);
  });

  it("空のhubPagesは空配列を返す", () => {
    expect(extractProducts([])).toEqual([]);
  });

  it("htmlが空のページはスキップ", () => {
    const products = extractProducts([
      { url: "https://example.com/", finalUrl: "https://example.com/", status: 0, html: "", error: "timeout" },
    ]);
    expect(products).toEqual([]);
  });

  it("h2見出しを商品名として優先する", () => {
    const html = `<html><body>
      <a href="/lineup/test/">
        <h2>商品名H2</h2>
        <p>説明文</p>
      </a>
    </body></html>`;
    const products = extractProducts([
      { url: "https://example.com/", finalUrl: "https://example.com/", status: 200, html },
    ]);
    expect(products[0].name).toBe("商品名H2");
  });

  it("商品ページにthumbnailUrlが含まれる", () => {
    const html = `<html><body>
      <a href="/modelhouse/with-img/">
        <img src="/thumb.jpg" width="600" alt="サムネ">商品
      </a>
    </body></html>`;
    const products = extractProducts([
      { url: "https://example.com/", finalUrl: "https://example.com/", status: 200, html },
    ]);
    expect(products[0].thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });
});
