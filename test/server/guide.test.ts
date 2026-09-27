import { describe, expect, it, vi } from "vitest";
import { GUIDE_STYLE, emptyGuide, type StudyGuide } from "../../shared/guide";
import type { ServerEvent } from "../../shared/types";
import { EventHub } from "../../server/lib/events";
import type { LlmProvider } from "../../server/providers/llm";
import { createMockLlm } from "../../server/providers/mock";
import { applyGuideOps, createGuideService, sanitizeConsolidated, similarity } from "../../server/services/guide";
import type { Store } from "../../server/store";

const base = () => emptyGuide("book_1", "Biology");

describe("applyGuideOps", () => {
  it("creates sections, concepts, links, glossary and maps page refs", () => {
    const guide = applyGuideOps(
      base(),
      [
        {
          op: "set_overview",
          title: "Photosynthesis",
          summary: "How plants make food.",
          goals: ["Explain the Calvin cycle"],
        },
        {
          op: "upsert_section",
          title: "The Calvin cycle",
          icon: "flow",
          tldr: "Carbon fixation in the stroma.",
          keyPoints: ["RuBisCO fixes CO2", "Uses ATP and NADPH"],
          concepts: ["Calvin cycle", "RuBisCO"],
          pages: [
            { doc: "D1", page: 2 },
            { doc: "D9", page: 3 },
          ],
          selfCheck: [{ q: "Where does it happen?", a: "In the stroma." }],
        },
        {
          op: "add_concepts",
          concepts: [{ name: "ATP", kind: "supporting", blurb: "Energy currency" }],
          links: [{ from: "ATP", to: "Calvin cycle", label: "powers" }],
        },
        { op: "add_glossary", items: [{ term: "Stroma", definition: "Fluid inside the chloroplast." }] },
      ],
      new Map([["D1", "doc_a"]]),
    );
    expect(guide.title).toBe("Photosynthesis");
    expect(guide.sections).toHaveLength(1);
    expect(guide.sections[0].id).toBe("the-calvin-cycle");
    expect(guide.sections[0].conceptIds).toEqual(["calvin-cycle", "rubisco"]);
    expect(guide.sections[0].sourcePages).toEqual([{ documentId: "doc_a", page: 2 }]);
    expect(guide.concepts.map((c) => c.label)).toEqual(["Calvin cycle", "RuBisCO", "ATP"]);
    expect(guide.edges).toEqual([{ from: "atp", to: "calvin-cycle", label: "powers" }]);
    expect(guide.glossary).toHaveLength(1);
  });

  it("merges into an existing section by id or similar title and de-duplicates points", () => {
    let guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Light reactions",
        keyPoints: ["Water is split"],
        selfCheck: [{ q: "What is split?", a: "Water" }],
      },
    ]);
    guide = applyGuideOps(guide, [
      {
        op: "upsert_section",
        title: "The light reactions",
        keyPoints: ["water is split", "Oxygen is released"],
        selfCheck: [{ q: "What is split?", a: "Water!" }],
      },
    ]);
    expect(guide.sections).toHaveLength(1);
    expect(guide.sections[0].keyPoints).toEqual(["Water is split", "Oxygen is released"]);
    expect(guide.sections[0].selfCheck).toHaveLength(1);
    guide = applyGuideOps(guide, [{ op: "upsert_section", id: "light-reactions", tldr: "Happen in thylakoids." }]);
    expect(guide.sections[0].tldr).toBe("Happen in thylakoids.");
  });

  it("ignores unknown ops and malformed values without throwing", () => {
    const guide = applyGuideOps(base(), [
      { op: "delete_everything" },
      { op: "upsert_section" },
      { op: "add_glossary", items: "nope" },
    ] as never);
    expect(guide.sections).toHaveLength(0);
  });

  it("repairs a section diagram before storing it", () => {
    const guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Training loop",
        diagram: { mermaid: String.raw`A[Input data] --> B[Forward pass\nprediction]`, caption: "One step" },
      },
    ]);
    expect(guide.sections[0].diagram).toEqual({
      mermaid: "flowchart TD\nA[Input data] --> B[Forward pass<br/>prediction]",
      caption: "One step",
    });
  });

  it("caps key points per section", () => {
    const guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Many",
        keyPoints: Array.from({ length: 20 }, (_, i) => `Distinct fact number ${i} about topic ${i * 7}`),
      },
    ]);
    expect(guide.sections[0].keyPoints.length).toBeLessThanOrEqual(8);
  });

  it("stores a subject format, an objective, terms and formulas", () => {
    let guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Speed",
        format: "math",
        objective: "Calculate speed from distance and time",
        terms: [
          { term: "Speed", definition: "How far something goes each second." },
          { term: "Distance", definition: "How far it went." },
          { term: "", definition: "No term" },
        ],
        formulas: [
          {
            name: "Speed",
            latex: "$v = \\frac{d}{t}$",
            symbols: [
              { symbol: "v", meaning: "speed in metres per second" },
              { symbol: "d", meaning: "" },
            ],
          },
        ],
      },
    ]);
    const section = guide.sections[0];
    expect(section.format).toBe("math");
    expect(section.objective).toBe("Calculate speed from distance and time");
    expect(section.terms).toHaveLength(2);
    expect(section.formulas).toEqual([
      { name: "Speed", latex: "v = \\frac{d}{t}", symbols: [{ symbol: "v", meaning: "speed in metres per second" }] },
    ]);

    guide = applyGuideOps(guide, [
      {
        op: "upsert_section",
        id: "speed",
        format: "poetry",
        objective: "",
        terms: [
          { term: "speed", definition: "Distance covered per unit of time." },
          ...Array.from({ length: 10 }, (_, i) => ({ term: `Extra term ${i}`, definition: `Meaning ${i}` })),
        ],
        formulas: [
          { latex: "v=\\frac{d}{t}", symbols: [{ symbol: "t", meaning: "time in seconds" }] },
          ...["a", "b", "c", "d"].map((x) => ({ latex: `${x}^2`, symbols: [] })),
        ],
      },
    ]);
    const merged = guide.sections[0];
    // An unknown format and an empty objective change nothing.
    expect(merged.format).toBe("math");
    expect(merged.objective).toBe("Calculate speed from distance and time");
    // Capped, keeping the newest.
    expect(merged.terms!.map((entry) => entry.term)).toEqual(
      Array.from({ length: 8 }, (_, i) => `Extra term ${i + 2}`),
    );
    expect(merged.formulas!.map((formula) => formula.latex)).toEqual(["a^2", "b^2", "c^2", "d^2"]);
  });

  it("updates a repeated term and formula in place", () => {
    const guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Speed",
        terms: [{ term: "Speed", definition: "Old." }],
        formulas: [{ latex: "v = d / t", symbols: [] }],
      },
      {
        op: "upsert_section",
        id: "speed",
        terms: [{ term: "speed", definition: "New." }],
        formulas: [{ name: "Speed", latex: "v=d/t", symbols: [{ symbol: "v", meaning: "speed" }] }],
      },
    ]);
    expect(guide.sections[0].terms).toEqual([{ term: "Speed", definition: "New." }]);
    expect(guide.sections[0].formulas).toEqual([
      { latex: "v = d / t", name: "Speed", symbols: [{ symbol: "v", meaning: "speed" }] },
    ]);
  });

  it("replaces a worked example only with a complete one", () => {
    const worked = {
      problem: "A car drives 120 km in 2 hours. How fast is it going?",
      steps: [
        { label: "Write the formula", work: "$v = d / t$" },
        { label: "Put in the numbers", work: "$v = 120 / 2$" },
        { label: "Work it out", work: "$v = 60$" },
      ],
      answer: "60 km/h",
    };
    let guide = applyGuideOps(base(), [{ op: "upsert_section", title: "Speed", worked }]);
    expect(guide.sections[0].worked).toEqual(worked);
    guide = applyGuideOps(guide, [
      { op: "upsert_section", id: "speed", worked: { problem: "No steps", steps: [], answer: "x" } },
      { op: "upsert_section", id: "speed", worked: { steps: [{ label: "a", work: "b" }] } },
      { op: "upsert_section", id: "speed", worked: "nonsense" },
    ]);
    expect(guide.sections[0].worked).toEqual(worked);
    guide = applyGuideOps(guide, [
      {
        op: "upsert_section",
        id: "speed",
        worked: { problem: "Walk 3 km in 1 hour.", steps: [{ label: "Divide", work: "3 / 1 = 3" }], answer: "3 km/h" },
      },
    ]);
    expect(guide.sections[0].worked?.problem).toBe("Walk 3 km in 1 hour.");
    const long = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Long",
        worked: { problem: "P", steps: Array.from({ length: 12 }, (_, i) => ({ label: `S${i}`, work: `${i}` })) },
      },
    ]);
    expect(long.sections[0].worked?.steps).toHaveLength(8);
    expect(long.sections[0].worked?.answer).toBe("");
  });

  it("adds timeline events without repeats and keeps them in year order", () => {
    let guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "World War One",
        format: "history",
        timeline: [
          { when: "1918", what: "The war ends with the armistice." },
          { when: "1914", what: "The war begins in Europe." },
        ],
      },
    ]);
    guide = applyGuideOps(guide, [
      {
        op: "upsert_section",
        id: "world-war-one",
        timeline: [
          { when: "1914", what: "The war begins in Europe!" },
          { when: "1916", what: "The Battle of the Somme." },
        ],
      },
    ]);
    expect(guide.sections[0].timeline!.map((event) => event.when)).toEqual(["1914", "1916", "1918"]);

    // Dates before the common era are left in the order they were given.
    const ancient = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Rome",
        timeline: [
          { when: "753 BC", what: "Rome is founded." },
          { when: "509 BC", what: "The republic begins." },
        ],
      },
    ]);
    expect(ancient.sections[0].timeline!.map((event) => event.when)).toEqual(["753 BC", "509 BC"]);
  });

  it("adds section mistakes, skipping near-duplicates, up to four", () => {
    const guide = applyGuideOps(base(), [
      {
        op: "upsert_section",
        title: "Forces",
        mistakes: [
          { wrong: "Heavy objects fall faster than light ones", right: "Without air, they fall at the same rate." },
          { wrong: "Heavy objects always fall faster than light ones", right: "Duplicate." },
          ...["Mass and weight are the same", "Friction always slows things", "A force is needed to keep moving"].map(
            (wrong) => ({ wrong, right: "Not quite." }),
          ),
          { wrong: "Gravity stops in space", right: "It gets weaker but never stops." },
        ],
      },
    ]);
    expect(guide.sections[0].mistakes).toHaveLength(4);
    expect(guide.sections[0].mistakes!.some((entry) => entry.right === "Duplicate.")).toBe(false);
  });

  it("writes prose without em or en dashes but leaves math and diagrams alone", () => {
    const guide = applyGuideOps(base(), [
      {
        op: "set_overview",
        title: "Motion — the basics",
        summary: "Speed — how fast — is simple.",
        goals: ["Use 3–5 examples"],
      },
      {
        op: "upsert_section",
        title: "Speed — distance over time",
        tldr: "Speed tells you how fast — nothing more.",
        explanation: "**Speed** — distance per second. Also $a — b$ stays.",
        keyPoints: ["Units — metres per second"],
        terms: [{ term: "Speed", definition: "How fast — per second." }],
        formulas: [{ name: "Speed — basic", latex: "v = d — t", symbols: [{ symbol: "v", meaning: "speed — m/s" }] }],
        selfCheck: [{ q: "What is speed — really?", a: "Distance — over time." }],
        diagram: { mermaid: "flowchart TD\nA[Start — here] --> B", caption: "A — B" },
      },
      { op: "add_glossary", items: [{ term: "Velocity", definition: "Speed — with a direction." }] },
    ]);
    const section = guide.sections[0];
    expect(guide.title).toBe("Motion: the basics");
    expect(guide.summary).toBe("Speed, how fast, is simple.");
    expect(guide.goals).toEqual(["Use 3 to 5 examples"]);
    expect(section.title).toBe("Speed: distance over time");
    expect(section.tldr).toBe("Speed tells you how fast, nothing more.");
    expect(section.explanation).toBe("**Speed**: distance per second. Also $a — b$ stays.");
    expect(section.keyPoints).toEqual(["Units, metres per second"]);
    expect(section.terms![0].definition).toBe("How fast, per second.");
    expect(section.formulas![0]).toEqual({
      name: "Speed, basic",
      latex: "v = d — t",
      symbols: [{ symbol: "v", meaning: "speed, m/s" }],
    });
    expect(section.selfCheck[0]).toEqual({ q: "What is speed, really?", a: "Distance, over time." });
    expect(section.diagram).toEqual({ mermaid: "flowchart TD\nA[Start — here] --> B", caption: "A, B" });
    expect(guide.glossary[0].definition).toBe("Speed, with a direction.");
  });
});

describe("sanitizeConsolidated", () => {
  it("rejects a rewrite that loses most sections", () => {
    const original = applyGuideOps(
      base(),
      ["Alpha topic", "Beta topic", "Gamma topic", "Delta topic", "Epsilon topic"].map((title) => ({
        op: "upsert_section",
        title,
        tldr: title,
      })),
    );
    const result = sanitizeConsolidated(original, { title: "x", sections: [{ title: "Alpha topic" }] });
    expect(result).toBe(original);
  });

  it("accepts a faithful rewrite and keeps source pages", () => {
    const original = applyGuideOps(
      base(),
      [{ op: "upsert_section", title: "Alpha topic", pages: [{ doc: "D1", page: 4 }] }],
      new Map([["D1", "doc_a"]]),
    );
    const result = sanitizeConsolidated(original, {
      title: "Better",
      summary: "S",
      sections: [{ title: "Alpha topic", tldr: "Merged" }],
    });
    expect(result.title).toBe("Better");
    expect(result.sections[0].sourcePages).toEqual([{ documentId: "doc_a", page: 4 }]);
  });

  it("carries the subject fields through and keeps section ids", () => {
    const original = applyGuideOps(
      base(),
      [{ op: "upsert_section", title: "Rates of change", pages: [{ doc: "D1", page: 7 }] }],
      new Map([["D1", "doc_a"]]),
    );
    const result = sanitizeConsolidated(original, {
      title: "Motion",
      sections: [
        {
          id: "rates-of-change",
          title: "Speed and velocity",
          format: "science",
          objective: "Tell speed and velocity apart",
          terms: [{ term: "Velocity", definition: "Speed in a given direction." }],
          formulas: [{ latex: "v = d/t", symbols: [{ symbol: "d", meaning: "distance in metres" }] }],
          worked: { problem: "P", steps: [{ label: "L", work: "W" }], answer: "A" },
          timeline: [{ when: "1687", what: "Newton publishes the laws of motion." }],
          mistakes: [{ wrong: "Speed and velocity are the same", right: "Velocity has a direction." }],
        },
      ],
    });
    const section = result.sections[0];
    expect(section.id).toBe("rates-of-change");
    expect(section.sourcePages).toEqual([{ documentId: "doc_a", page: 7 }]);
    expect(section.format).toBe("science");
    expect(section.objective).toBe("Tell speed and velocity apart");
    expect(section.terms).toHaveLength(1);
    expect(section.formulas).toHaveLength(1);
    expect(section.worked?.steps).toHaveLength(1);
    expect(section.timeline).toHaveLength(1);
    expect(section.mistakes).toHaveLength(1);
  });
});

describe("guide service restyle", () => {
  const USER = "learner_1";
  const BOOK = "book_1";

  /** An old-style guide (no `style`) with one section written with em dashes. */
  const oldGuide = (): StudyGuide => {
    const guide = applyGuideOps(base(), [
      { op: "upsert_section", title: "Osmosis", tldr: "Water moves in, then out.", keyPoints: ["Water moves"] },
    ]);
    guide.sections[0].tldr = "Water moves — in and out.";
    guide.version = 3;
    delete guide.style;
    return guide;
  };

  function setup(llm: LlmProvider, stored: StudyGuide, fresh: unknown[] = []) {
    const saves: Array<{ guide: StudyGuide; coveredSeq: number; syncs: number }> = [];
    let current = { guide: stored, coveredSeq: 5, syncs: 2 };
    const store = {
      library: {
        getBook: () => ({ id: BOOK, title: "Biology" }),
        listDocuments: () => [],
        suggestBookTitle: () => undefined,
      },
      guides: {
        get: () => structuredClone(current),
        save: (_user: string, guide: StudyGuide, coveredSeq: number, syncs: number) => {
          current = { guide, coveredSeq, syncs };
          saves.push(current);
        },
      },
      messages: {
        since: (_book: string, seq: number) => fresh.filter((message) => (message as { seq: number }).seq > seq),
        countSince: () => ({ n: 0, maxSeq: null }),
      },
      learning: { ensureConcept: () => undefined, addCards: () => undefined },
    } as unknown as Store;
    const events = new EventHub();
    const seen: ServerEvent[] = [];
    events.subscribe(USER, (event) => seen.push(event));
    const service = createGuideService({ store, llm, events, debounceMs: 10, maxPendingMessages: 50 });
    // Register the owner without letting the debounced run race the test.
    service.syncNow(USER, BOOK);
    service.stop();
    return { service, saves, seen };
  }

  it("rewrites an old guide once in the current style, even without new messages", async () => {
    const { service, saves, seen } = setup(createMockLlm({ tokenDelayMs: 0 }), oldGuide());
    await service.sync(BOOK);
    expect(saves).toHaveLength(1);
    const saved = saves[0];
    expect(saved.guide.style).toBe(GUIDE_STYLE);
    expect(saved.guide.version).toBe(4);
    expect(saved.coveredSeq).toBe(5);
    expect(saved.syncs).toBe(2);
    expect(saved.guide.sections[0].id).toBe("osmosis");
    expect(saved.guide.sections[0].tldr).toBe("Water moves, in and out.");
    expect(seen.map((event) => event.type)).toEqual(["guide.syncing", "guide.updated"]);
    // Now current: nothing more to do.
    await service.sync(BOOK);
    expect(saves).toHaveLength(1);
  });

  it("does not retry a rewrite that failed", async () => {
    const complete = vi.fn(async () => ({
      text: "not json",
      reasoning: "",
      toolCalls: [],
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1 },
      model: "test",
    }));
    const llm = { ...createMockLlm({ tokenDelayMs: 0 }), complete } as LlmProvider;
    const { service, saves, seen } = setup(llm, oldGuide());
    await service.sync(BOOK);
    await service.sync(BOOK);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(saves).toHaveLength(0);
    expect(seen).toEqual([
      { type: "guide.syncing", bookId: BOOK },
      { type: "guide.updated", bookId: BOOK, version: 3 },
    ]);
  });

  it("folds in new messages and rewrites an old guide in the same sync", async () => {
    const message = { role: "user", content: "What is diffusion?", parts: [], channel: "text", seq: 6 };
    const { service, saves } = setup(createMockLlm({ tokenDelayMs: 0 }), oldGuide(), [message]);
    await service.sync(BOOK);
    expect(saves).toHaveLength(1);
    expect(saves[0].guide.style).toBe(GUIDE_STYLE);
    expect(saves[0].coveredSeq).toBe(6);
    expect(saves[0].syncs).toBe(3);
    expect(saves[0].guide.sections.map((section) => section.title)).toEqual(["Osmosis", "What is diffusion"]);
  });

  it("leaves a current guide alone when there is nothing new", async () => {
    const guide = { ...oldGuide(), style: GUIDE_STYLE };
    const { service, saves, seen } = setup(createMockLlm({ tokenDelayMs: 0 }), guide);
    await service.sync(BOOK);
    expect(saves).toHaveLength(0);
    expect(seen).toHaveLength(0);
  });
});

describe("similarity", () => {
  it("scores overlapping titles highly", () => {
    expect(similarity("The Calvin cycle", "Calvin cycle")).toBe(1);
    expect(similarity("Mitochondria", "Photosynthesis")).toBe(0);
  });
});
