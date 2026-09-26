import { describe, expect, it } from "vitest";
import { createSearch, imageKeywords } from "../../server/providers/search";

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
