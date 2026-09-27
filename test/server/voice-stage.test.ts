/**
 * Voice stage tools: the silent tags the voice model uses as tool calls,
 * the instant commands the server recognises itself ("close it", "zoom in",
 * "highlight the database step"), validation of boards, 3D scenes and web
 * pages from the specialist, and ranking photos so one good one shows.
 */
import { describe, expect, it } from "vitest";
import type { WebImage } from "../../shared/types";
import type { VoiceVisual } from "../../shared/voice";
import { undash } from "../../shared/speech";
import { ActionTagFilter, actionTag, parseActionTag, parseView } from "../../server/voice/actions";
import { detectPageIntent, detectStageIntent } from "../../server/voice/intent";
import { parsePageRef, snapQuote } from "../../server/voice/pages";
import {
  matchStageTarget,
  rankImages,
  sanitizeBoard,
  sanitizeHtml,
  sanitizeScene,
  stageNote,
} from "../../server/voice/stage";

const photo: VoiceVisual = {
  id: "vis_photo",
  kind: "images",
  query: "Tokyo",
  images: [
    {
      title: "Tokyo",
      imageUrl: "https://x/a.jpg",
      thumbnailUrl: "https://x/a.jpg",
      sourceUrl: "https://x",
      domain: "x",
    },
  ],
};
const diagram: VoiceVisual = {
  id: "vis_api",
  kind: "diagram",
  diagram: {
    id: "vis_api",
    title: "How a REST API works",
    mermaid:
      "flowchart TD\n A[Client sends HTTP request] --> B[DNS resolves to server]\n B --> C{Authentication check}\n C -->|Approved| D[Route to endpoint]\n D --> E[CRUD on database]\n E --> F[Send HTTP response]\n C -->|Denied| G[401 error response]",
    steps: [],
  },
};
const board: VoiceVisual = {
  id: "vis_board",
  kind: "board",
  board: {
    title: "Quadratic",
    items: [
      { id: "L1", kind: "math", latex: "x^2 - 5x + 6 = 0" },
      { id: "L2", kind: "math", latex: "(x-2)(x-3) = 0" },
      { id: "L3", kind: "math", latex: "x = 2 \\text{ or } x = 3", box: true },
    ],
  },
};

describe("action tags", () => {
  it("parses every stage tool", () => {
    expect(parseActionTag("close")).toEqual({ kind: "close" });
    expect(parseActionTag(" Clear ")).toEqual({ kind: "close" });
    expect(parseActionTag("focus: E")).toEqual({ kind: "focus", target: "E" });
    expect(parseActionTag("highlight: the database step")).toEqual({ kind: "focus", target: "the database step" });
    expect(parseActionTag("view: zoom in")).toEqual({ kind: "view", view: "zoom_in" });
    expect(parseActionTag("view: next")).toEqual({ kind: "view", view: "next" });
    expect(parseActionTag("view: LR")).toEqual({ kind: "view", view: "sideways" });
    expect(parseActionTag("view: dance")).toBeNull();
    expect(parseActionTag("board: solve x^2 - 5x + 6 = 0")).toEqual({
      kind: "deep",
      mode: "board",
      task: "solve x^2 - 5x + 6 = 0",
    });
    expect(parseActionTag("build: a 3D solar system")).toEqual({
      kind: "deep",
      mode: "build",
      task: "a 3D solar system",
    });
    expect(parseActionTag("images: red panda")).toEqual({ kind: "images", query: "red panda" });
    expect(parseActionTag("deep diagram: the water cycle")).toEqual({
      kind: "deep",
      mode: "diagram",
      task: "the water cycle",
    });
  });

  it("round-trips through history notes and is never spoken", () => {
    for (const tag of ["[[close]]", "[[focus: E]]", "[[view: zoom in]]", "[[board: solve it]]", "[[build: a cell]]"]) {
      expect(actionTag(parseActionTag(tag.slice(2, -2))!)).toBe(tag);
    }
    const filter = new ActionTagFilter();
    const first = filter.push("Sure, closing it. [[clo");
    const second = filter.push("se]] Anything else?");
    expect(first.text + second.text + filter.flush()).toBe("Sure, closing it.  Anything else?");
    expect([...first.actions, ...second.actions]).toEqual([{ kind: "close" }]);
  });

  it("reads view phrases", () => {
    expect(parseView("spin it")).toBe("rotate");
    expect(parseView("stop")).toBe("stop");
    expect(parseView("show it in AR")).toBe("ar");
    expect(parseView("upright")).toBe("upright");
  });
});

describe("instant screen commands", () => {
  it("closes what is on screen", () => {
    expect(detectStageIntent("Can you close it?", photo)).toEqual({ actions: [{ kind: "close" }], pure: true });
    expect(detectStageIntent("Okay, close it.", diagram)).toEqual({ actions: [{ kind: "close" }], pure: true });
    expect(detectStageIntent("please remove the picture", photo)?.actions).toEqual([{ kind: "close" }]);
    expect(detectStageIntent("clear the screen", board)?.actions).toEqual([{ kind: "close" }]);
    expect(detectStageIntent("that's enough", board)?.actions).toEqual([{ kind: "close" }]);
    // A command plus a question still gets a real answer.
    expect(detectStageIntent("close it and tell me about Kyoto", photo)).toEqual({
      actions: [{ kind: "close" }],
      pure: false,
    });
  });

  it("leaves everything else to the model", () => {
    expect(detectStageIntent("close it", null)).toBeNull();
    expect(detectStageIntent("don't close it", photo)).toBeNull();
    expect(detectStageIntent("how close is the moon", photo)).toBeNull();
    expect(detectStageIntent("what is a closure in JavaScript", photo)).toBeNull();
  });

  it("moves the view", () => {
    expect(detectStageIntent("zoom in please", photo)).toEqual({
      actions: [{ kind: "view", view: "zoom_in" }],
      pure: true,
    });
    expect(detectStageIntent("show me another one", photo)?.actions).toEqual([{ kind: "view", view: "next" }]);
    expect(detectStageIntent("can you turn it sideways", diagram)?.actions).toEqual([
      { kind: "view", view: "sideways" },
    ]);
    expect(detectStageIntent("rotate it", board)?.actions).toEqual([{ kind: "view", view: "rotate" }]);
  });

  it("points at the part the learner names, even misheard", () => {
    expect(detectStageIntent("Can you highlight the, uh, crackdown database section?", diagram)).toEqual({
      actions: [{ kind: "focus", target: "E" }],
      pure: false,
    });
    expect(detectStageIntent("point to the authentication check", diagram)?.actions).toEqual([
      { kind: "focus", target: "C" },
    ]);
    expect(detectStageIntent("highlight the answer", board)?.actions).toEqual([{ kind: "focus", target: "L3" }]);
    expect(detectStageIntent("highlight bananas", diagram)).toBeNull();
  });
});

describe("stage targets and notes", () => {
  it("resolves ids, labels and line numbers", () => {
    expect(matchStageTarget(diagram, "E")).toBe("E");
    expect(matchStageTarget(diagram, "route to endpoint")).toBe("D");
    expect(matchStageTarget(board, "line 2")).toBe("L2");
    expect(matchStageTarget(board, "the final answer")).toBe("L3");
    expect(matchStageTarget(photo, "anything")).toBeNull();
  });

  it("tells the model what is on screen, with ids it can point at", () => {
    expect(stageNote(null)).toMatch(/Nothing is on the screen/);
    expect(stageNote(diagram)).toContain("E = CRUD on database");
    expect(stageNote(board)).toContain("L2 = $(x-2)(x-3) = 0$");
    expect(stageNote(photo)).toContain('A photo: "Tokyo"');
  });
});

describe("board validation", () => {
  it("numbers lines, keeps narration, drops what can't be drawn", () => {
    const result = sanitizeBoard({
      title: "Solve it",
      speech: "Let's go.",
      items: [
        { latex: "x^2 - 5x + 6 = 0", say: "Our equation.", note: "start" },
        { text: "Factor it", say: "Now factor." },
        { plot: { fns: ["x^2 - 5*x + 6", "alert(1)"], xMin: -1, xMax: 6 }, say: "The graph." },
        { plot: { fns: ["window.close()"] } },
        { nothing: true },
        { latex: "x = 2 \\text{ or } x = 3", say: "Done.", box: true },
      ],
    });
    expect(result?.value.items.map((item) => [item.id, item.kind])).toEqual([
      ["L1", "math"],
      ["L2", "text"],
      ["L3", "plot"],
      ["L4", "math"],
    ]);
    expect(result?.value.items[2].plot?.fns).toEqual(["x^2 - 5*x + 6"]);
    expect(result?.value.items[3].box).toBe(true);
    expect(result?.steps.map((step) => step.node)).toEqual(["L1", "L2", "L3", "L4"]);
    expect(sanitizeBoard({ items: [] })).toBeNull();
  });
});

describe("scene validation", () => {
  it("keeps known shapes, unique ids and resolvable orbits", () => {
    const result = sanitizeScene({
      type: "scene",
      title: "Solar system",
      speech: "Here it is.",
      scene: {
        mood: "space",
        objects: [
          { id: "Sun", shape: "sphere", size: 2, color: "#ffb347", glow: true, label: "Sun" },
          { id: "earth", shape: "sphere", size: 0.6, orbit: { center: "Sun", radius: 7, speed: 999 } },
          { id: "earth", shape: "sphere", size: 0.2, orbit: { center: "ghost", radius: 1 } },
          { id: "x", shape: "teapot" },
          { id: "bad", shape: "box", position: [1, "a", 3], color: "url(javascript:alert(1))" },
          { id: "rod", shape: "cylinder", from: [0, 0, 0], to: [0, 5, 0], size: 1e9 },
        ],
      },
      steps: [
        { focus: "Sun", say: "The Sun." },
        { focus: "pluto", say: "Nope." },
      ],
    });
    const objects = result!.value.objects;
    expect(objects.map((object) => object.id)).toEqual(["sun", "earth", "earth-2", "bad", "rod"]);
    expect(objects[1].orbit).toMatchObject({ center: "sun", radius: 7, speed: 60 });
    expect(objects[2].orbit?.center).toBeUndefined();
    expect(objects[3].position).toBeUndefined();
    expect(objects[3].color).toBeUndefined();
    expect(objects[4].size).toBe(500);
    expect(result!.value.mood).toBe("space");
    expect(result!.steps).toEqual([{ node: "sun", say: "The Sun." }]);
    expect(sanitizeScene({ objects: [{ shape: "teapot" }] })).toBeNull();
  });
});

describe("web page validation", () => {
  it("wraps fragments and strips self-navigation", () => {
    const page = sanitizeHtml(
      '<meta http-equiv="refresh" content="0;url=https://evil.example"><h1>Hello there, world</h1>',
    );
    expect(page).toMatch(/^<!doctype html><html>/);
    expect(page).not.toContain("refresh");
    expect(sanitizeHtml("```html\n<!doctype html><html><body><p>Fenced but fine page</p></body></html>\n```")).toMatch(
      /^<!doctype html>/,
    );
    expect(sanitizeHtml("hi")).toBeNull();
  });
});

describe("photo ranking", () => {
  const image = (domain: string, width: number, height: number, title = "Tokyo skyline"): WebImage => ({
    title,
    imageUrl: `https://${domain}/img.jpg`,
    thumbnailUrl: `https://${domain}/thumb.jpg`,
    sourceUrl: `https://${domain}/page`,
    domain,
    width,
    height,
  });
  it("puts a large, clean, on-topic photo first", () => {
    const ranked = rankImages(
      [
        image("www.shutterstock.com", 1500, 1000),
        image("example.com", 200, 150),
        image("en.wikipedia.org", 1600, 1067),
        image("icons.example", 800, 800, "Tokyo icon vector"),
      ],
      "Tokyo skyline",
    );
    expect(ranked[0].domain).toBe("en.wikipedia.org");
    expect(ranked.at(-1)?.domain).not.toBe("en.wikipedia.org");
  });
});

describe("spoken captions", () => {
  it("have no dashes", () => {
    expect(undash("The server does its work — often that means a query.")).toBe(
      "The server does its work, often that means a query.",
    );
    expect(undash("Pages 12–14 cover it")).toBe("Pages 12 to 14 cover it");
    expect(undash("— and that's it —.")).toBe("and that's it.");
  });
});

describe("document pages", () => {
  const PAGE =
    "The light-dependent reactions\n\nThe light-dependent reactions happen in the thylakoid membranes. Chlorophyll absorbs light, which excites electrons.\nWater molecules are split in a process called photolysis, releasing oxygen as a by-product. The energy of the excited\nelectrons is used to make ATP and NADPH.";

  it("reads page references from tags", () => {
    expect(parsePageRef("D2 p.12 | Water is split")).toEqual({ doc: 2, page: 12, quote: "Water is split" });
    expect(parsePageRef('page 3 "the first law"')).toEqual({ page: 3, quote: "the first law" });
    expect(parsePageRef("next")).toEqual({ relative: 1 });
    expect(parsePageRef("this")).toEqual({ current: true });
    expect(parsePageRef("7")).toEqual({ page: 7 });
    expect(parsePageRef("the definition of osmosis")).toEqual({ quote: "the definition of osmosis" });
    expect(parseActionTag("page: D1 p.2 | photolysis")).toEqual({
      kind: "page",
      ref: { doc: 1, page: 2, quote: "photolysis" },
    });
    expect(parseActionTag("read: page 4 with me")).toEqual({ kind: "deep", mode: "read", task: "page 4 with me" });
  });

  it("snaps quotes to the exact words, across line breaks and punctuation", () => {
    expect(snapQuote(PAGE, "water molecules are split in a process called photolysis")).toBe(
      "Water molecules are split in a process called photolysis",
    );
    expect(snapQuote(PAGE, "The energy of the excited electrons is used to make ATP and NADPH")).toBe(
      "The energy of the excited electrons is used to make ATP and NADPH.",
    );
    // A description lights the whole sentence, not the heading above it.
    expect(snapQuote(PAGE, "thylakoid membranes", { sentence: true })).toBe(
      "The light-dependent reactions happen in the thylakoid membranes.",
    );
    // Paraphrase: the best matching sentence.
    expect(snapQuote(PAGE, "chlorophyll takes in light and that excites the electrons")).toBe(
      "Chlorophyll absorbs light, which excites electrons.",
    );
    expect(snapQuote(PAGE, "the French revolution began in 1789")).toBeNull();
  });

  it("recognises page commands", () => {
    const docs = { hasDocuments: true, stage: null };
    const onPage = {
      hasDocuments: true,
      stage: {
        id: "v",
        kind: "page" as const,
        documentId: "d",
        label: "D1",
        title: "Notes",
        page: 2,
        pageCount: 3,
        highlights: [],
      },
    };
    expect(detectPageIntent("Show me page 12", docs)).toEqual({
      actions: [{ kind: "page", ref: { page: 12 } }],
      pure: true,
    });
    expect(detectPageIntent("can you go to page three of the second document", docs)?.actions).toEqual([
      { kind: "page", ref: { page: 3, doc: 2 } },
    ]);
    expect(detectPageIntent("show me the page I'm reading", docs)?.actions).toEqual([
      { kind: "page", ref: { current: true } },
    ]);
    expect(detectPageIntent("next page", docs)).toBeNull();
    expect(detectPageIntent("next page", onPage)?.actions).toEqual([{ kind: "page", ref: { relative: 1 } }]);
    expect(detectPageIntent("Walk me through page 4 with me", docs)?.actions[0]).toMatchObject({
      kind: "deep",
      mode: "read",
    });
    expect(detectPageIntent("where does it say that light excites electrons?", docs)?.actions).toEqual([
      { kind: "page", ref: { quote: "that light excites electrons", describe: true } },
    ]);
    expect(detectPageIntent("highlight the line about photolysis", onPage)?.actions).toEqual([
      { kind: "page", ref: { current: true, quote: "photolysis", describe: true } },
    ]);
    expect(detectPageIntent("show me page 12", { hasDocuments: false, stage: null })).toBeNull();
    expect(detectPageIntent("what is on page 12 about?", docs)).toBeNull();
  });
});
