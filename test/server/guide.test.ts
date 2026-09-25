import { describe, expect, it } from "vitest";
import { emptyGuide } from "../../shared/guide";
import { applyGuideOps, sanitizeConsolidated, similarity } from "../../server/services/guide";

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
});

describe("similarity", () => {
  it("scores overlapping titles highly", () => {
    expect(similarity("The Calvin cycle", "Calvin cycle")).toBe(1);
    expect(similarity("Mitochondria", "Photosynthesis")).toBe(0);
  });
});
