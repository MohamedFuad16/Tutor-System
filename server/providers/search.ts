/**
 * Web and image search with graceful provider fallback:
 *
 *   web:    Serper (Google results, needs SERPER_API_KEY) → Wikipedia (free)
 *   images: Serper Images (needs key)                      → Wikimedia Commons (free, CC-licensed)
 *   pages:  readPage(url) fetches one result and extracts its readable text,
 *           so the tutor can read a source instead of a two-line snippet.
 *           Guarded against SSRF: public http(s) hosts only, every redirect
 *           re-checked, size- and time-limited.
 *
 * Results are cached (TTL) because learners often ask the same thing twice
 * and search credits cost money.
 */
import type { WebImage, WebSource } from "../../shared/types.js";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { log, errorMessage } from "../lib/log.js";

type Lookup = (host: string) => Promise<string[]>;
type SearchOptions = { serperKey?: string; cacheTtlMs: number; fetchImpl?: typeof fetch; lookup?: Lookup };

export type WebPage = { url: string; title: string; domain: string; text: string; truncated: boolean };

const PAGE_MAX_BYTES = 2_000_000;
const PAGE_MAX_CHARS = 12_000;

/** Loopback, private, link-local, CGNAT, multicast and reserved ranges (v4 and v6). */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    return (
      lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff")
    );
  }
  return true;
}

const decodeEntities = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");

/** Readable text of an HTML page: the article/main body without scripts, menus and footers. */
export function extractReadable(html: string): { title: string; text: string } {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<(head|title|script|style|noscript|svg|template|iframe|form|nav|footer|header|aside)\b[\s\S]*?<\/\1>/gi,
      " ",
    );
  const main = /<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(body);
  if (main && main[2].replace(/<[^>]+>/g, "").trim().length > 400) body = main[2];
  const text = decodeEntities(
    body
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/blockquote)\b[^>]*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

// Wikimedia asks API clients to identify themselves with contact details, or they may be throttled (HTTP 429).
const USER_AGENT = "TutorLearningApp/2.0 (https://github.com/MohamedFuad16/Tutor-System; educational study assistant)";

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
  const lookup: Lookup =
    options.lookup ?? (async (host) => (await dnsLookup(host, { all: true })).map((entry) => entry.address));
  const webCache = new TtlCache<WebSource[]>(options.cacheTtlMs);
  const imageCache = new TtlCache<WebImage[]>(options.cacheTtlMs);
  const pageCache = new TtlCache<WebPage>(options.cacheTtlMs, 100);

  /** Throws unless the URL is http(s) on a host that resolves only to public addresses. */
  async function assertPublic(url: URL) {
    if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) pages can be read");
    if (url.username || url.password) throw new Error("URLs with credentials are not allowed");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("Private hosts are not allowed");
    const addresses = isIP(host) ? [host] : await lookup(host);
    if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error("Private hosts are not allowed");
  }

  /** Reads a body up to PAGE_MAX_BYTES. */
  async function readBody(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      chunks.push(value);
      if (size >= PAGE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
  }

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
          .replace(/\.[a-z]+$/i, "")
          .replace(/_/g, " "),
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

    /** Fetches a public web page and returns its readable text (see the header comment). */
    async readPage(rawUrl: string): Promise<WebPage> {
      let url = new URL(rawUrl.trim());
      const cached = pageCache.get(url.href);
      if (cached) return cached;
      let response: Response | null = null;
      for (let hop = 0; hop < 4; hop += 1) {
        await assertPublic(url);
        response = await fetchImpl(url, {
          redirect: "manual",
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
            "Accept-Language": "en;q=0.9,*;q=0.5",
          },
          signal: AbortSignal.timeout(9_000),
        });
        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location) {
          url = new URL(location, url);
          continue;
        }
        break;
      }
      if (!response || !response.ok) throw new Error(`HTTP ${response?.status ?? "error"} from ${url.hostname}`);
      const type = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) {
        throw new Error(`Can't read ${type.split(";")[0] || "this kind of"} content as a page`);
      }
      const raw = await readBody(response);
      const { title, text } = /text\/plain/i.test(type) ? { title: "", text: raw.trim() } : extractReadable(raw);
      const page: WebPage = {
        url: url.href,
        title: title || url.hostname,
        domain: domainOf(url.href),
        text: text.slice(0, PAGE_MAX_CHARS),
        truncated: text.length > PAGE_MAX_CHARS,
      };
      pageCache.set(url.href, page);
      return page;
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
        // Commons matches file titles, so a conversational query ("show me
        // pictures of a neuron") finds nothing; fall back to its keywords.
        for (const attempt of [...new Set([q, imageKeywords(q)])].filter(Boolean)) {
          try {
            results = await commonsImages(attempt, count);
          } catch (error) {
            log.warn("search.commons_failed", { error: errorMessage(error) });
          }
          if (results.length) break;
        }
      }
      imageCache.set(key, results);
      return results;
    },
  };
}

export type Search = ReturnType<typeof createSearch>;

const FILLER =
  /\b(?:please|can|could|would|you|show|me|us|some|find|get|give|display|pictures?|photos?|photographs?|images?|pics?|of|an?|the|what|does|do|look|looks|like|real|actual|for)\b/gi;

/** The subject of an image request: "Show me pictures of a neuron" → "neuron". */
export function imageKeywords(query: string) {
  return query
    .replace(/[?!.,]/g, " ")
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim();
}
