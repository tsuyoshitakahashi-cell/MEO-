export type PageCategory =
  | "product"
  | "concept"
  | "works"
  | "service"
  | "company";

export interface FetchedPage {
  url: string;
  finalUrl: string;
  status: number;
  html: string;
  error?: string;
}

export interface ExtractedContent {
  title: string;
  body: string;
  internalLinks: string[];
  snsLinks: SnsLinks;
}

export interface SnsLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  line?: string;
}

export interface ClassifiedPages {
  product: string[];
  concept: string[];
  works: string[];
  service: string[];
  company: string[];
  other: string[];
}

export interface Product {
  name: string;
  sourceUrl: string;
  summary: string;
  thumbnailUrl?: string;
  score: number;
}

export interface PageWithContent {
  url: string;
  category: PageCategory | "other";
  content: ExtractedContent;
}
