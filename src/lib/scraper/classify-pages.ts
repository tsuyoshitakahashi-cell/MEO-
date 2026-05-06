import type { ClassifiedPages, PageCategory } from "@/types/scraper";

interface CategoryRule {
  category: PageCategory;
  patterns: RegExp[];
}

const RULES: CategoryRule[] = [
  {
    category: "product",
    patterns: [
      /\/modelhouse\b/i,
      /\/model-?house\b/i,
      /\/product\b/i,
      /\/products\b/i,
      /\/lineup\b/i,
      /\/line-?up\b/i,
      /\/house\b/i,
      /\/home\/(?:model|product)/i,
      /\/series\b/i,
      /\/plan\b/i,
      /\/plans\b/i,
    ],
  },
  {
    category: "works",
    patterns: [
      /\/works\b/i,
      /\/case\b/i,
      /\/cases\b/i,
      /\/casestudy\b/i,
      /\/case-?study\b/i,
      /\/gallery\b/i,
      /\/example\b/i,
      /\/examples\b/i,
      /\/portfolio\b/i,
      /\/jirei\b/i,
      /\/施工事例/i,
      /\/construction\b/i,
    ],
  },
  {
    category: "concept",
    patterns: [
      /\/concept\b/i,
      /\/about\b/i,
      /\/philosophy\b/i,
      /\/story\b/i,
      /\/thought\b/i,
      /\/mission\b/i,
      /\/vision\b/i,
      /\/想い/i,
      /\/omoi\b/i,
    ],
  },
  {
    category: "service",
    patterns: [
      /\/service\b/i,
      /\/services\b/i,
      /\/feature\b/i,
      /\/features\b/i,
      /\/strength\b/i,
      /\/strengths\b/i,
      /\/menu\b/i,
      /\/reason\b/i,
      /\/why\b/i,
    ],
  },
  {
    category: "company",
    patterns: [
      /\/company\b/i,
      /\/profile\b/i,
      /\/access\b/i,
      /\/info\b/i,
      /\/corporate\b/i,
      /\/会社概要/i,
      /\/kaisha\b/i,
    ],
  },
];

export function classifyUrl(url: string): PageCategory | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(pathname))) {
      return rule.category;
    }
  }
  return null;
}

export function classifyPages(urls: string[]): ClassifiedPages {
  const result: ClassifiedPages = {
    product: [],
    concept: [],
    works: [],
    service: [],
    company: [],
    other: [],
  };

  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);

    const category = classifyUrl(url);
    if (category) {
      result[category].push(url);
    } else {
      result.other.push(url);
    }
  }

  return result;
}

export const CATEGORY_PRIORITY: PageCategory[] = [
  "concept",
  "product",
  "works",
  "service",
  "company",
];

export function pickPriorityPages(
  classified: ClassifiedPages,
  maxPerCategory = 1,
  totalLimit = 5,
): string[] {
  const picked: string[] = [];
  for (const category of CATEGORY_PRIORITY) {
    const urls = classified[category].slice(0, maxPerCategory);
    for (const url of urls) {
      if (picked.length >= totalLimit) break;
      picked.push(url);
    }
    if (picked.length >= totalLimit) break;
  }
  return picked;
}
