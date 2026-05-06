import { notFound } from "next/navigation";
import { getCase } from "@/server/actions/case-crud";
import { CompetitorForm } from "@/components/competitor-form";
import type { InitialCase } from "@/components/competitor-form";
import type { GenerateResult } from "@/lib/generator/generate";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Params) {
  const { id } = await params;
  const result = await getCase(id);
  if (!result.ok || !result.data) {
    notFound();
  }
  const c = result.data;

  const initial: InitialCase = {
    id: c.id,
    name: c.name,
    selfUrl: c.input.selfUrl,
    competitorUrls: c.input.competitorUrls,
    competitorAnalysis: c.competitorAnalysis
      ? {
          selfUrl: c.input.selfUrl,
          competitorUrls: c.input.competitorUrls,
          topTermsCount: c.competitorAnalysis.keywords.length,
          selection: {
            keywords: c.competitorAnalysis.keywords.map((kw) => ({
              term: kw.term,
              category: kw.category,
              competitorCount: kw.competitorCount,
              selfCount: kw.selfCount,
              aiCitationScore: kw.aiCitationScore,
              recommendation: kw.recommendation,
              reason: "（保存時の選定理由は記録されていません）",
            })),
          },
        }
      : null,
    selectedTerms: c.competitorAnalysis
      ? c.competitorAnalysis.keywords
          .filter((kw) => kw.selected)
          .map((kw) => kw.term)
      : [],
    generateResult: c.generatedTexts
      ? ({
          selfUrl: c.input.selfUrl,
          selectedKeywords: c.competitorAnalysis
            ? c.competitorAnalysis.keywords
                .filter((kw) => kw.selected)
                .map((kw) => kw.term)
            : [],
          texts: {
            businessDesc: c.generatedTexts.businessDesc,
            serviceDescs: c.generatedTexts.serviceDescs,
            productDescs: c.generatedTexts.productDescs,
          },
          detectedProducts: [],
        } as GenerateResult)
      : null,
  };

  return <CompetitorForm initial={initial} />;
}
