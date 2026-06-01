export type WebSearchMode = "search" | "news";

export type NormalizedWebSource = {
  id: string;
  type: WebSearchMode;
  title: string;
  url: string;
  domain: string;
  faviconUrl: string;
  snippet: string;
  date?: string;
  position: number;
};

type SearchOptions = {
  query: string;
  mode?: WebSearchMode;
  maxResults?: number;
  signal?: AbortSignal;
  apiKey?: string;
};

const SERPER_ENDPOINTS: Record<WebSearchMode, string> = {
  search: "https://google.serper.dev/search",
  news: "https://google.serper.dev/news",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
const cache = new Map<string, { expiresAt: number; results: NormalizedWebSource[] }>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stableId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return `src_${Math.abs(hash).toString(36)}`;
};

const canonicalUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    return parsed.toString();
  } catch {
    return url;
  }
};

const domainFromUrl = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
};

const faviconForDomain = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

const normalizeRows = (payload: any, mode: WebSearchMode, maxResults: number) => {
  const rows = [
    ...(Array.isArray(payload?.organic) ? payload.organic : []),
    ...(Array.isArray(payload?.news) ? payload.news : []),
    ...(Array.isArray(payload?.topStories) ? payload.topStories : []),
  ];
  const seen = new Set<string>();
  const results: NormalizedWebSource[] = [];

  rows.forEach((row: any, index: number) => {
    const rawUrl = row.link || row.url || row.sourceUrl;
    const title = String(row.title || "").trim();
    if (!rawUrl || !title) return;

    const url = canonicalUrl(String(rawUrl));
    if (seen.has(url)) return;
    seen.add(url);

    const domain = domainFromUrl(url);
    results.push({
      id: stableId(`${mode}:${url}`),
      type: mode,
      title,
      url,
      domain,
      faviconUrl: faviconForDomain(domain),
      snippet: String(row.snippet || row.summary || row.description || "").trim(),
      date: row.date || row.publishedAt || undefined,
      position: Number(row.position || index + 1),
    });
  });

  return results.slice(0, maxResults);
};

export function detectFreshnessSearch(text: string): { query: string; mode: WebSearchMode } | null {
  const value = text.toLowerCase();
  const explicit = /\b(search|web|browse|internet|google|look up)\b/.test(value);
  const fresh = /\b(latest|current|recent|today|yesterday|this week|this month|now|new|news|trend|trending|pricing|price|release|released|ranking|rankings|best .*20\d{2}|who won|score|game|election|weather)\b/.test(value);
  if (!explicit && !fresh) return null;
  const mode: WebSearchMode = /\b(news|today|headline|headlines|happened)\b/.test(value) ? "news" : "search";
  return { query: text.trim().slice(0, 240), mode };
}

export async function searchSerper(options: SearchOptions): Promise<NormalizedWebSource[]> {
  const query = options.query.trim();
  const mode = options.mode || "search";
  const maxResults = Math.min(Math.max(options.maxResults || 6, 1), 10);
  const key = options.apiKey || process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not configured.");
  if (!query) return [];

  const cacheKey = `${mode}:${query.toLowerCase()}:${maxResults}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortListener = () => controller.abort();
    options.signal?.addEventListener("abort", abortListener, { once: true });

    try {
      const response = await fetch(SERPER_ENDPOINTS[mode], {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: maxResults }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SERPER ${mode} failed with ${response.status}`);
      }

      const payload = await response.json();
      const results = normalizeRows(payload, mode, maxResults);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });
      return results;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(250 * attempt);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortListener);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("SERPER search failed.");
}

export type ImageResult = {
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  source: string;
  link: string;
  width?: number;
  height?: number;
};

const imageCache = new Map<
  string,
  { expiresAt: number; results: ImageResult[] }
>();

export async function searchSerperImages(
  query: string,
  count = 6,
  apiKey?: string,
  signal?: AbortSignal,
): Promise<ImageResult[]> {
  const q = query.trim();
  const num = Math.min(Math.max(count, 1), 12);
  const key = apiKey || process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not configured.");
  if (!q) return [];

  const cacheKey = `img:${q.toLowerCase()}:${num}`;
  const cached = imageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortListener = () => controller.abort();
    signal?.addEventListener("abort", abortListener, { once: true });
    try {
      const response = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`SERPER images failed with ${response.status}`);
      }
      const payload = await response.json();
      const rows = Array.isArray(payload?.images) ? payload.images : [];
      const results: ImageResult[] = rows
        .map((row: any) => ({
          imageUrl: String(row.imageUrl || ""),
          thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : undefined,
          title: String(row.title || "").trim(),
          source: String(row.source || row.domain || "").trim(),
          link: String(row.link || row.imageUrl || ""),
          width: Number(row.imageWidth) || undefined,
          height: Number(row.imageHeight) || undefined,
        }))
        .filter((r: ImageResult) => /^https?:\/\//.test(r.imageUrl))
        .slice(0, num);
      imageCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        results,
      });
      return results;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(250 * attempt);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortListener);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("SERPER image search failed.");
}

export function formatSourcesForPrompt(sources: NormalizedWebSource[]) {
  if (sources.length === 0) return "No web sources were returned.";
  return sources.map((source, index) => {
    const date = source.date ? ` | ${source.date}` : "";
    return `[${index + 1}] ${source.title} | ${source.domain}${date} | ${source.snippet} | ${source.url}`;
  }).join("\n");
}
