import { extractCompoundNouns } from "./tokenize";

export interface CompanyDocument {
  /** 会社識別子（HPのURLなど） */
  id: string;
  /** 結合された本文テキスト */
  text: string;
}

export interface TermStat {
  term: string;
  /** 自社（baseline）における出現回数 */
  selfCount: number;
  /** 各競合における出現回数の合計 */
  competitorCount: number;
  /** 自社+競合中で何社（ドキュメント）に出現したか */
  documentFrequency: number;
  /** 競合のTF-IDFスコア（高いほど競合特有語） */
  competitorTfidf: number;
  /** 自社のTF-IDFスコア */
  selfTfidf: number;
  /** 競合-自社の差分（高いほど自社で不足） */
  diffScore: number;
}

const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 20;

/**
 * 自社をbaseline、競合との差分KW候補を上位N件抽出
 */
export async function analyzeTfidfDiff(
  self: CompanyDocument,
  competitors: CompanyDocument[],
  topN = 50,
): Promise<TermStat[]> {
  const allDocs = [self, ...competitors];

  // 各ドキュメントのterm bag
  const termBags = await Promise.all(
    allDocs.map(async (doc) => buildTermBag(doc.text)),
  );

  // ドキュメント頻度（df）算出
  const df = new Map<string, number>();
  for (const bag of termBags) {
    for (const term of bag.uniqueTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const N = allDocs.length;
  const selfBag = termBags[0];
  const competitorBags = termBags.slice(1);

  // 全ユニーク語を結合
  const allTerms = new Set<string>();
  for (const bag of termBags) {
    for (const term of bag.uniqueTerms) {
      allTerms.add(term);
    }
  }

  const stats: TermStat[] = [];

  for (const term of allTerms) {
    const documentFrequency = df.get(term) ?? 0;
    const idf = Math.log(N / documentFrequency);

    const selfCount = selfBag.counts.get(term) ?? 0;
    const selfTf = selfBag.totalTokens > 0 ? selfCount / selfBag.totalTokens : 0;
    const selfTfidf = selfTf * idf;

    let competitorCount = 0;
    let competitorTfidfSum = 0;
    for (const bag of competitorBags) {
      const c = bag.counts.get(term) ?? 0;
      competitorCount += c;
      const tf = bag.totalTokens > 0 ? c / bag.totalTokens : 0;
      competitorTfidfSum += tf * idf;
    }
    const competitorTfidf =
      competitorBags.length > 0 ? competitorTfidfSum / competitorBags.length : 0;

    const diffScore = competitorTfidf - selfTfidf;

    stats.push({
      term,
      selfCount,
      competitorCount,
      documentFrequency,
      competitorTfidf,
      selfTfidf,
      diffScore,
    });
  }

  return stats
    .filter((s) => s.competitorCount >= 2) // 1社1回だけのノイズ除去
    .filter((s) => s.term.length >= MIN_TERM_LENGTH)
    .filter((s) => s.term.length <= MAX_TERM_LENGTH)
    .sort((a, b) => b.diffScore - a.diffScore)
    .slice(0, topN);
}

interface TermBag {
  counts: Map<string, number>;
  uniqueTerms: Set<string>;
  totalTokens: number;
}

async function buildTermBag(text: string): Promise<TermBag> {
  const terms = await extractCompoundNouns(text);
  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return {
    counts,
    uniqueTerms: new Set(counts.keys()),
    totalTokens: terms.length,
  };
}
