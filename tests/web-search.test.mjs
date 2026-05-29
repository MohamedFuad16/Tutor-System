import test from "node:test";
import assert from "node:assert/strict";

import {
  detectFreshnessSearch,
  formatSourcesForPrompt,
  searchSerper,
} from "../server/web-search.ts";

const originalFetch = globalThis.fetch;
const originalSerperKey = process.env.SERPER_API_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSerperKey === undefined) {
    delete process.env.SERPER_API_KEY;
  } else {
    process.env.SERPER_API_KEY = originalSerperKey;
  }
});

test("detectFreshnessSearch ignores source-material questions unless web search is explicit", () => {
  assert.equal(detectFreshnessSearch("summarize this PDF page"), null);

  assert.deepEqual(
    detectFreshnessSearch("search the web for today's AI news"),
    {
      query: "search the web for today's AI news",
      mode: "news",
    },
  );
});

test("formatSourcesForPrompt keeps source ordering and metadata", () => {
  const prompt = formatSourcesForPrompt([
    {
      id: "src_1",
      type: "search",
      title: "Example Result",
      url: "https://example.com/article",
      domain: "example.com",
      faviconUrl: "https://example.com/favicon.ico",
      snippet: "A concise snippet.",
      date: "2026-05-29",
      position: 1,
    },
  ]);

  assert.equal(
    prompt,
    "[1] Example Result | example.com | 2026-05-29 | A concise snippet. | https://example.com/article",
  );
});

test("searchSerper isolates cached results by API key", async () => {
  const seenKeys = [];
  globalThis.fetch = async (_url, init) => {
    seenKeys.push(init.headers["X-API-KEY"]);
    return Response.json({
      organic: [
        {
          title: `Result for ${init.headers["X-API-KEY"]}`,
          link: "https://example.com/search?utm_source=test#section",
          snippet: "Cached safely per key.",
          position: 1,
        },
      ],
    });
  };

  const first = await searchSerper({
    query: "cache isolation",
    apiKey: "tenant-a-key",
  });
  const second = await searchSerper({
    query: "cache isolation",
    apiKey: "tenant-b-key",
  });

  assert.deepEqual(seenKeys, ["tenant-a-key", "tenant-b-key"]);
  assert.equal(first[0].title, "Result for tenant-a-key");
  assert.equal(second[0].title, "Result for tenant-b-key");
});

test("searchSerper does not retry requests after caller aborts", async () => {
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    controller.abort();
    throw new DOMException("The operation was aborted.", "AbortError");
  };

  await assert.rejects(
    searchSerper({
      query: "abort me",
      apiKey: "test-key",
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});
