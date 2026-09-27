import { describe, expect, it } from "vitest";
import { createSearch, extractReadable, imageKeywords, isPrivateAddress } from "../../server/providers/search";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fakeFetch(routes: Record<string, Handler>, calls: string[] = []) {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return routes[key](url, init);
  }) as unknown as typeof fetch;
}

describe("search", () => {
  it("uses Serper images when a key is set", async () => {
    const calls: string[] = [];
    const search = createSearch({
      serperKey: "k",
      cacheTtlMs: 60_000,
      fetchImpl: fakeFetch(
        {
          "https://google.serper.dev/images": (_url, init) => {
            expect(JSON.parse(String(init?.body)).q).toBe("red panda");
            return json({
              images: [
                {
                  title: "Red panda",
                  imageUrl: "https://img.example/a.jpg",
                  thumbnailUrl: "https://img.example/a_t.jpg",
                  link: "https://zoo.example/panda",
                  domain: "zoo.example",
                  imageWidth: 800,
                  imageHeight: 600,
                },
                { title: "Insecure", imageUrl: "http://insecure.example/b.jpg" },
              ],
            });
          },
        },
        calls,
      ),
    });
    const images = await search.images("red panda", 6);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      title: "Red panda",
      thumbnailUrl: "https://img.example/a_t.jpg",
      domain: "zoo.example",
    });
    // Cached: a second identical query does not hit the network.
    await search.images("red panda", 6);
    expect(calls).toHaveLength(1);
  });

  it("falls back to Wikimedia Commons for images and Wikipedia for web when Serper fails or is absent", async () => {
    const search = createSearch({
      serperKey: "k",
      cacheTtlMs: 0,
      fetchImpl: fakeFetch({
        "https://google.serper.dev": () => json({ message: "quota" }, 403),
        "https://commons.wikimedia.org": (url) => {
          expect(url).toContain("gsrnamespace=6");
          return json({
            query: {
              pages: {
                "2": {
                  index: 2,
                  title: "File:Neuron_diagram.svg",
                  imageinfo: [
                    {
                      mime: "image/svg+xml",
                      thumburl: "https://upload.wikimedia.org/n.png",
                      descriptionurl: "https://commons.wikimedia.org/wiki/File:Neuron",
                      thumbwidth: 640,
                      thumbheight: 400,
                    },
                  ],
                },
                "1": {
                  index: 1,
                  title: "File:Neuron.jpg",
                  imageinfo: [
                    {
                      mime: "image/jpeg",
                      thumburl: "https://upload.wikimedia.org/a.jpg",
                      descriptionurl: "https://commons.wikimedia.org/wiki/File:Neuron.jpg",
                    },
                  ],
                },
                "3": {
                  index: 3,
                  title: "File:Paper.pdf",
                  imageinfo: [{ mime: "application/pdf", thumburl: "https://upload.wikimedia.org/p.jpg" }],
                },
              },
            },
          });
        },
        "https://en.wikipedia.org": () =>
          json({
            query: { search: [{ title: "Neuron", snippet: 'A <span class="searchmatch">neuron</span> is a cell' }] },
          }),
      }),
    });
    const images = await search.images("neuron", 5);
    expect(images.map((image) => image.title)).toEqual(["Neuron", "Neuron diagram"]);
    expect(images[0].domain).toBe("commons.wikimedia.org");
    const web = await search.web("neuron", 3);
    expect(web[0]).toMatchObject({
      title: "Neuron",
      url: "https://en.wikipedia.org/wiki/Neuron",
      snippet: "A neuron is a cell",
    });
  });

  it("returns empty results instead of throwing when everything is down", async () => {
    const search = createSearch({ cacheTtlMs: 0, fetchImpl: fakeFetch({ "https://": () => json({}, 500) }) });
    expect(await search.images("x")).toEqual([]);
    expect(await search.web("x")).toEqual([]);
    expect(search.providers).toEqual({ web: "wikipedia", images: "wikimedia" });
  });

  it("uses the learner's language for Wikipedia", async () => {
    const calls: string[] = [];
    const search = createSearch({
      cacheTtlMs: 0,
      fetchImpl: fakeFetch({ "https://ja.wikipedia.org": () => json({ query: { search: [] } }) }, calls),
    });
    await search.web("光合成", 3, "ja");
    expect(calls[0]).toContain("https://ja.wikipedia.org/w/api.php");
  });

  it("retries Commons with the subject when a conversational query finds nothing", async () => {
    const calls: string[] = [];
    const search = createSearch({
      cacheTtlMs: 0,
      fetchImpl: fakeFetch(
        {
          "https://commons.wikimedia.org": (url) => {
            const query = new URL(url).searchParams.get("gsrsearch") ?? "";
            if (!/^neuron/.test(query)) return json({});
            return json({
              query: {
                pages: {
                  "1": {
                    index: 1,
                    title: "File:Neuron.jpg",
                    imageinfo: [{ mime: "image/jpeg", thumburl: "https://upload.wikimedia.org/n.jpg" }],
                  },
                },
              },
            });
          },
        },
        calls,
      ),
    });
    expect(imageKeywords("Show me pictures of a neuron?")).toBe("neuron");
    expect(imageKeywords("photos of the Calvin cycle")).toBe("Calvin cycle");
    const images = await search.images("Show me pictures of a neuron", 4);
    expect(images.map((image) => image.title)).toEqual(["Neuron"]);
    expect(calls).toHaveLength(2);
  });
});

describe("readPage", () => {
  const html = (body: string, status = 200, headers: Record<string, string> = {}) =>
    new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
  const publicDns = async () => ["93.184.216.34"];
  const ARTICLE = `<html><head><title>Mitochondria &amp; ATP</title><script>track()</script></head><body>
    <nav>Home | About</nav><header>Site header</header>
    <article><h1>Mitochondria</h1><p>Mitochondria make ATP through oxidative phosphorylation.</p>
    <ul><li>Inner membrane</li><li>Matrix</li></ul>${"<p>More detail about cellular respiration. </p>".repeat(20)}</article>
    <footer>Copyright</footer></body></html>`;

  it("returns the readable article text, not scripts, menus or footers", async () => {
    const search = createSearch({
      cacheTtlMs: 0,
      lookup: publicDns,
      fetchImpl: fakeFetch({ "https://example.com/cells": () => html(ARTICLE) }),
    });
    const page = await search.readPage("https://example.com/cells");
    expect(page.title).toBe("Mitochondria & ATP");
    expect(page.domain).toBe("example.com");
    expect(page.text).toContain("Mitochondria make ATP through oxidative phosphorylation.");
    expect(page.text).toContain("• Inner membrane");
    expect(page.text).not.toMatch(/track\(\)|Home \| About|Copyright|Site header/);
  });

  it("refuses private, loopback and metadata addresses, including via redirects and DNS", async () => {
    const calls: string[] = [];
    const search = createSearch({
      cacheTtlMs: 0,
      lookup: async (host) => (host === "evil.example" ? ["10.0.0.5"] : ["93.184.216.34"]),
      fetchImpl: fakeFetch(
        {
          "https://redirect.example/": () => html("", 302, { location: "http://169.254.169.254/latest/meta-data/" }),
        },
        calls,
      ),
    });
    for (const url of [
      "http://localhost:3000/api/system",
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://192.168.1.1/",
      "https://evil.example/", // public name resolving to a private address
      "file:///etc/passwd",
      "https://user:pass@example.com/",
    ]) {
      await expect(search.readPage(url), url).rejects.toThrow();
    }
    await expect(search.readPage("https://redirect.example/")).rejects.toThrow(/Private hosts/);
    // Nothing was fetched except the public redirect hop.
    expect(calls).toEqual(["https://redirect.example/"]);
  });

  it("follows public redirects and rejects content that isn't a page", async () => {
    const search = createSearch({
      cacheTtlMs: 0,
      lookup: publicDns,
      fetchImpl: fakeFetch({
        "https://short.example/x": () => html("", 301, { location: "https://example.com/cells" }),
        "https://example.com/cells": () => html(ARTICLE),
        "https://example.com/paper.pdf": () =>
          new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } }),
      }),
    });
    expect((await search.readPage("https://short.example/x")).url).toBe("https://example.com/cells");
    await expect(search.readPage("https://example.com/paper.pdf")).rejects.toThrow(/application\/pdf/);
  });

  it("classifies addresses", () => {
    for (const address of [
      "10.1.2.3",
      "172.20.0.1",
      "192.168.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ])
      expect(isPrivateAddress(address), address).toBe(true);
    for (const address of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"])
      expect(isPrivateAddress(address), address).toBe(false);
  });

  it("falls back to the whole body when there is no article element", () => {
    expect(extractReadable("<title>T</title><body><p>Plain page text.</p></body>").text).toBe("Plain page text.");
  });
});
