import { describe, it, expect } from "vitest";
import {
  classifyUrl,
  classifyPages,
  pickPriorityPages,
} from "@/lib/scraper/classify-pages";

describe("classifyUrl", () => {
  it("商品系URLを product に分類する", () => {
    expect(classifyUrl("https://example.com/modelhouse/")).toBe("product");
    expect(classifyUrl("https://example.com/product/")).toBe("product");
    expect(classifyUrl("https://example.com/lineup/")).toBe("product");
    expect(classifyUrl("https://example.com/lineup/natural/")).toBe("product");
    expect(classifyUrl("https://example.com/plans")).toBe("product");
  });

  it("コンセプト系URLを concept に分類する", () => {
    expect(classifyUrl("https://example.com/concept/")).toBe("concept");
    expect(classifyUrl("https://example.com/about/")).toBe("concept");
    expect(classifyUrl("https://example.com/philosophy")).toBe("concept");
  });

  it("施工事例系URLを works に分類する", () => {
    expect(classifyUrl("https://example.com/works/")).toBe("works");
    expect(classifyUrl("https://example.com/case/")).toBe("works");
    expect(classifyUrl("https://example.com/jirei/")).toBe("works");
    expect(classifyUrl("https://example.com/gallery/case-001")).toBe("works");
  });

  it("サービス系URLを service に分類する", () => {
    expect(classifyUrl("https://example.com/service/")).toBe("service");
    expect(classifyUrl("https://example.com/feature/")).toBe("service");
    expect(classifyUrl("https://example.com/strength")).toBe("service");
  });

  it("会社系URLを company に分類する", () => {
    expect(classifyUrl("https://example.com/company/")).toBe("company");
    expect(classifyUrl("https://example.com/profile/")).toBe("company");
    expect(classifyUrl("https://example.com/access/")).toBe("company");
  });

  it("マッチしないURLは null を返す", () => {
    expect(classifyUrl("https://example.com/")).toBeNull();
    expect(classifyUrl("https://example.com/news/")).toBeNull();
    expect(classifyUrl("https://example.com/contact/")).toBeNull();
  });

  it("不正なURLはパスとして扱う", () => {
    expect(classifyUrl("/concept/")).toBe("concept");
    expect(classifyUrl("not a url")).toBeNull();
  });
});

describe("classifyPages", () => {
  it("URL配列を5カテゴリに分類する", () => {
    const urls = [
      "https://example.com/concept/",
      "https://example.com/modelhouse/",
      "https://example.com/works/case-001/",
      "https://example.com/service/",
      "https://example.com/company/",
      "https://example.com/news/",
    ];
    const result = classifyPages(urls);
    expect(result.concept).toEqual(["https://example.com/concept/"]);
    expect(result.product).toEqual(["https://example.com/modelhouse/"]);
    expect(result.works).toEqual(["https://example.com/works/case-001/"]);
    expect(result.service).toEqual(["https://example.com/service/"]);
    expect(result.company).toEqual(["https://example.com/company/"]);
    expect(result.other).toEqual(["https://example.com/news/"]);
  });

  it("重複URLを排除する", () => {
    const urls = [
      "https://example.com/concept/",
      "https://example.com/concept/",
    ];
    const result = classifyPages(urls);
    expect(result.concept).toHaveLength(1);
  });
});

describe("pickPriorityPages", () => {
  it("優先順位（concept→product→works→service→company）で最大5ページ選定", () => {
    const classified = {
      concept: ["c1"],
      product: ["p1"],
      works: ["w1"],
      service: ["s1"],
      company: ["co1"],
      other: ["o1"],
    };
    const picked = pickPriorityPages(classified);
    expect(picked).toEqual(["c1", "p1", "w1", "s1", "co1"]);
  });

  it("カテゴリが不足していてもエラーにならない", () => {
    const classified = {
      concept: [],
      product: ["p1", "p2"],
      works: [],
      service: [],
      company: [],
      other: [],
    };
    const picked = pickPriorityPages(classified, 1);
    expect(picked).toEqual(["p1"]);
  });

  it("totalLimit を超えない", () => {
    const classified = {
      concept: ["c1", "c2"],
      product: ["p1", "p2"],
      works: ["w1", "w2"],
      service: [],
      company: [],
      other: [],
    };
    const picked = pickPriorityPages(classified, 2, 3);
    expect(picked).toHaveLength(3);
  });
});
