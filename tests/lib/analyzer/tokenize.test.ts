import { describe, it, expect } from "vitest";
import { extractTerms, extractCompoundNouns, tokenize } from "@/lib/analyzer/tokenize";

describe("tokenize", () => {
  it("日本語文を形態素解析できる", async () => {
    const tokens = await tokenize("注文住宅の工務店です。");
    expect(tokens.length).toBeGreaterThan(0);
    const surfaces = tokens.map((t) => t.surface);
    expect(surfaces).toContain("注文");
    expect(surfaces).toContain("住宅");
  });

  it("空文字でも例外を投げない", async () => {
    const tokens = await tokenize("");
    expect(tokens).toEqual([]);
  });
});

describe("extractTerms", () => {
  it("名詞のみを抽出する（動詞・形容詞は除外）", async () => {
    const terms = await extractTerms("住宅を建てる楽しさを伝えます。");
    expect(terms).toContain("住宅");
    // 動詞「建てる」「伝え」「ます」などは除外
    expect(terms).not.toContain("建てる");
    expect(terms).not.toContain("伝える");
  });

  it("ストップワードを除外する", async () => {
    const terms = await extractTerms("こと、もの、ところ");
    expect(terms).not.toContain("こと");
    expect(terms).not.toContain("もの");
    expect(terms).not.toContain("ところ");
  });

  it("1文字の単語は除外", async () => {
    const terms = await extractTerms("私 家 庭 室");
    // 1文字の名詞は除外（家、庭、室 は1文字なので除外される想定）
    expect(terms.filter((t) => t.length === 1)).toEqual([]);
  });
});

describe("extractCompoundNouns", () => {
  it("複合名詞を結合して抽出する", async () => {
    const compounds = await extractCompoundNouns(
      "注文住宅の耐震等級3を標準仕様としています。",
    );
    expect(compounds.some((c) => c.includes("注文住宅"))).toBe(true);
    expect(compounds.some((c) => c.includes("耐震等級"))).toBe(true);
  });

  it("複数語からなる固有名詞を1つにまとめる", async () => {
    const compounds = await extractCompoundNouns("福岡県飯塚市相田");
    // 「福岡県飯塚市相田」のような結合があるべき
    expect(compounds.some((c) => c.includes("飯塚"))).toBe(true);
  });
});
