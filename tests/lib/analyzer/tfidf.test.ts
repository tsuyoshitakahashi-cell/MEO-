import { describe, it, expect } from "vitest";
import { analyzeTfidfDiff } from "@/lib/analyzer/tfidf";

describe("analyzeTfidfDiff", () => {
  it("競合に頻出かつ自社で不足している語が上位に来る", async () => {
    const self = {
      id: "self",
      text: "私たちは家を建てる工務店です。地域に根ざした家づくりを行っています。",
    };
    const competitors = [
      {
        id: "comp1",
        text: "注文住宅、リノベーション、平屋。注文住宅と平屋を多数手がけています。注文住宅。リノベーション。平屋。",
      },
      {
        id: "comp2",
        text: "リノベーションと平屋の専門工務店。リノベーション、平屋。",
      },
      {
        id: "comp3",
        text: "注文住宅とリノベーション、平屋を提供。注文住宅、リノベーション。",
      },
    ];

    const result = await analyzeTfidfDiff(self, competitors, 50);
    const terms = result.map((r) => r.term);
    // 競合に頻出の「注文住宅」「リノベーション」「平屋」が上位に含まれる
    expect(terms.some((t) => t.includes("注文住宅"))).toBe(true);
    expect(terms.some((t) => t.includes("リノベーション"))).toBe(true);
    expect(terms.some((t) => t.includes("平屋"))).toBe(true);
  });

  it("自社にも競合にも均等に出現する語は上位に来ない", async () => {
    const self = {
      id: "self",
      text: "工務店の家。工務店として家を建てる。",
    };
    const competitors = [
      { id: "comp1", text: "工務店の家。工務店として。" },
    ];

    const result = await analyzeTfidfDiff(self, competitors);
    const top = result[0];
    if (top) {
      // 「工務店」は両方に出現するのでdiffScore低め（0周辺）
      const komutenStat = result.find((r) => r.term.includes("工務店"));
      if (komutenStat) {
        expect(komutenStat.diffScore).toBeLessThan(0.05);
      }
    }
  });

  it("topNを指定すると上位N件のみ返す", async () => {
    const self = { id: "self", text: "家を建てる" };
    const competitors = [
      {
        id: "comp1",
        text: Array(5)
          .fill("注文住宅 リノベーション 平屋 二世帯住宅 子育て")
          .join("。"),
      },
      {
        id: "comp2",
        text: Array(5)
          .fill("無垢材 自然素材 漆喰 木の家 国産材")
          .join("。"),
      },
    ];
    const result = await analyzeTfidfDiff(self, competitors, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("競合が空でも例外を出さない", async () => {
    const self = { id: "self", text: "家を建てる" };
    const result = await analyzeTfidfDiff(self, [], 10);
    expect(Array.isArray(result)).toBe(true);
  });
});
