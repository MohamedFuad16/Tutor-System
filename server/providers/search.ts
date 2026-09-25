/**
 * Web and image search with graceful provider fallback:
 *
 *   web:    Serper (Google results, needs SERPER_API_KEY) → Wikipedia (free)
 *   images: Serper Images (needs key)                      → Wikimedia Commons (free, CC-licensed)
 *
 * Results are cached (TTL) because learners often ask the same thing twice
 * and search credits cost money.
 */
import type { WebImage, WebSource } from "../../shared/types.js";
import { log, errorMessage } from "../lib/log.js";

type SearchOptions = { serperKey?: string; cacheTtlMs: number; fetchImpl?: typeof fetch };

const USER_AGENT = "TutorLearningApp/2.0 (educational study assistant)";

class TtlCache<T> {
  private map = new Map<string, { value: T; expires: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 500,
  ) {}
  get(key: string) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T) {
    if (this.ttlMs <= 0) return;
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https:\/\//i.test(value);

export function createSearch(options: SearchOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const webCache = new TtlCache<WebSource[]>(options.cacheTtlMs);
  const imageCache = new TtlCache<WebImage[]>(options.cacheTtlMs);

  async function getJson(url: string, init: RequestInit = {}, timeoutMs = 6_000) {
    const response = await fetchImpl(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${domainOf(url)}`);
    return response.json() as Promise<any>;
  }

  async function serperWeb(query: string, count: number): Promise<WebSource[]> {
    const data = await getJson("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": options.serperKey!, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(10, count) }),
    });
    return (data.organic ?? [])
      .filter((row: any) => isHttpUrl(row.link))
      .slice(0, count)
      .map((row: any) => ({
        title: String(row.title ?? "").slice(0, 200),
        url: row.link,
        domain: domainOf(row.link),
        snippet: String(row.snippet ?? "").slice(0, 400),
        date: row.date,
      }));
  }

  async function wikipediaWeb(query: string, count: number, language: string): Promise<WebSource[]> {
    const lang = /^[a-z]{2}$/.test(language) ? language : "en";
    const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    url.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(Math.min(10, count)),
      format: "json",
      origin: "*",
    }).toString();
    const data = await getJson(url.toString());
    return (data.query?.search ?? []).map((row: any) => {
      const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(row.title).replace(/ /g, "_"))}`;
      return {
        title: row.title,
        url: pageUrl,
        domain: `${lang}.wikipedia.org`,
        snippet: stripHtml(String(row.snippet ?? "")),
      };
    });
  }

  async function serperImages(query: string, count: number): Promise<WebImage[]> {
    const data = await getJson("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": options.serperKey!, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(10, count) }),
    });
    return (data.images ?? [])
      .filter((row: any) => isHttpUrl(row.imageUrl))
      .slice(0, count)
      .map((row: any) => ({
        title: String(row.title ?? "").slice(0, 160),
        imageUrl: row.imageUrl,
        thumbnailUrl: isHttpUrl(row.thumbnailUrl) ? row.thumbnailUrl : row.imageUrl,
        sourceUrl: isHttpUrl(row.link) ? row.link : row.imageUrl,
        domain: row.domain || domainOf(row.link || row.imageUrl),
        width: Number(row.imageWidth) || undefined,
        height: Number(row.imageHeight) || undefined,
      }));
  }

  async function commonsImages(query: string, count: number): Promise<WebImage[]> {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${query} filetype:bitmap|drawing`,
      gsrnamespace: "6",
      gsrlimit: String(Math.min(20, count * 2)),
      prop: "imageinfo",
      iiprop: "url|size|mime",
      iiurlwidth: "640",
    }).toString();
    const data = await getJson(url.toString());
    const pages = Object.values<any>(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return pages
      .map((page) => ({ page, info: page.imageinfo?.[0] }))
      .filter(
        ({ info }) => info && /^image\/(png|jpe?g|gif|webp|svg)/.test(info.mime ?? "") && isHttpUrl(info.thumburl),
      )
      .slice(0, count)
      .map(({ page, info }) => ({
        title: String(page.title ?? "")
          .replace(/^File:/, "")
          .replace(/\.[a-z]+$/i, ""),
        imageUrl: info.thumburl,
        thumbnailUrl: info.thumburl,
        sourceUrl: info.descriptionurl || info.url,
        domain: "commons.wikimedia.org",
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
      }));
  }

  return {
    get providers() {
      return { web: options.serperKey ? "serper" : "wikipedia", images: options.serperKey ? "serper" : "wikimedia" };
    },

    async web(query: string, count = 5, language = "en"): Promise<WebSource[]> {
      const q = query.trim().slice(0, 240);
      if (!q) return [];
      const key = `${language}:${count}:${q.toLowerCase()}`;
      const cached = webCache.get(key);
      if (cached) return cached;
      let results: WebSource[] = [];
      if (options.serperKey) {
        try {
          results = await serperWeb(q, count);
        } catch (error) {
          log.warn("search.serper_failed", { error: errorMessage(error) });
        }
      }
      if (!results.length) {
        try {
          results = await wikipediaWeb(q, count, language);
        } catch (error) {
          log.warn("search.wikipedia_failed", { error: errorMessage(error) });
        }
      }
      webCache.set(key, results);
      return results;
    },

    async images(query: string, count = 6): Promise<WebImage[]> {
      const q = query.trim().slice(0, 200);
      if (!q) return [];
      const key = `${count}:${q.toLowerCase()}`;
      const cached = imageCache.get(key);
      if (cached) return cached;
      let results: WebImage[] = [];
      if (options.serperKey) {
        try {
          results = await serperImages(q, count);
        } catch (error) {
          log.warn("search.serper_images_failed", { error: errorMessage(error) });
        }
      }
      if (!results.length) {
        try {
          results = await commonsImages(q, count);
        } catch (error) {
          log.warn("search.commons_failed", { error: errorMessage(error) });
        }
      }
      imageCache.set(key, results);
      return results;
    },
  };
}

export type Search = ReturnType<typeof createSearch>;
