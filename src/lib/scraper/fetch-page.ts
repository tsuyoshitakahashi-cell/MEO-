import type { FetchedPage } from "@/types/scraper";

const USER_AGENT =
  "Mozilla/5.0 (compatible; MEOTextToolBot/1.0; +https://github.com/tsuyoshitakahashi-cell/MEO-)";

const TIMEOUT_MS = 10_000;

export async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const html = await response.text();

    return {
      url,
      finalUrl: response.url,
      status: response.status,
      html,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    return {
      url,
      finalUrl: url,
      status: 0,
      html: "",
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchPagesParallel(
  urls: string[],
  concurrency = 5,
): Promise<FetchedPage[]> {
  const results: FetchedPage[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const result = await fetchPage(url);
      results.push(result);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
