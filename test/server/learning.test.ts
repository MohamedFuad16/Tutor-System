import { describe, expect, it } from "vitest";
import { bktUpdate, scheduleCard } from "../../server/store/learning";
import { mermaidNodes } from "../../server/services/learning";
import { chunkPages } from "../../server/store/retrieval";
import { createStore } from "../../server/store";
import os from "node:os";
import path from "node:path";

describe("bktUpdate", () => {
  it("raises mastery on correct answers and lowers it on wrong ones", () => {
    const up = bktUpdate(0.3, 1, 0.25);
    const down = bktUpdate(0.3, 0, 0.25);
    expect(up).toBeGreaterThan(0.3);
    expect(down).toBeLessThan(0.3);
  });

  it("gives less credit when guessing is easy (MCQ) than for free recall", () => {
    expect(bktUpdate(0.3, 1, 0.5)).toBeLessThan(bktUpdate(0.3, 1, 0.05));
  });

  it("stays within (0, 1)", () => {
    let mastery = 0.2;
    for (let i = 0; i < 50; i += 1) mastery = bktUpdate(mastery, 1, 0.1);
    expect(mastery).toBeLessThan(1);
    expect(mastery).toBeGreaterThan(0.9);
  });
});

describe("scheduleCard", () => {
  const fresh = { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 };
  it("follows the SM-2 ladder for good answers", () => {
    const first = scheduleCard(fresh, "good");
    expect(first.intervalDays).toBe(1);
    const second = scheduleCard(first, "good");
    expect(second.intervalDays).toBe(3);
    const third = scheduleCard(second, "good");
    expect(third.intervalDays).toBeCloseTo(7.5);
  });

  it("resets and relearns in minutes on a lapse", () => {
    const lapsed = scheduleCard({ intervalDays: 10, ease: 2.5, reps: 4, lapses: 0 }, "again");
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeCloseTo(2.3);
    expect(lapsed.dueAt - Date.now()).toBeLessThan(11 * 60_000);
  });
});

describe("mermaidNodes", () => {
  it("extracts node ids and labels in order", () => {
    const nodes = mermaidNodes(
      'flowchart TD\n  A["Light"] --> B(Chlorophyll)\n  B --> C{Split water?}\n  %% comment X[Nope]\n  C -->|yes| D[[Oxygen]]',
    );
    expect(nodes.map((n) => n.id)).toEqual(["A", "B", "C", "D"]);
    expect(nodes[0].label).toBe("Light");
  });
});

describe("retrieval", () => {
  it("chunks pages without crossing page boundaries", () => {
    const chunks = chunkPages(["short page", "x".repeat(3000), ""]);
    expect(chunks[0]).toEqual({ page: 1, text: "short page" });
    expect(chunks.filter((c) => c.page === 2).length).toBeGreaterThan(2);
    expect(chunks.some((c) => c.page === 3)).toBe(false);
  });

  it("finds English and Japanese passages with BM25", () => {
    const store = createStore(path.join(os.tmpdir(), `tutor-test-${Date.now()}`), { inMemory: true });
    store.library.ensureUser("learner_test_1");
    const book = store.library.createBook("learner_test_1", "Bio");
    const docId = store.library.createDocument({
      userId: "learner_test_1",
      bookId: book.id,
      title: "Doc",
      filename: "d.pdf",
      sizeBytes: 1,
    });
    const pages = [
      "The Calvin cycle fixes carbon dioxide using RuBisCO.",
      "Mitochondria produce ATP.",
      "光合成は葉緑体で行われる。",
    ];
    store.library.saveExtraction({ documentId: docId, bookId: book.id, pages, chunks: chunkPages(pages), ocrPages: 0 });
    expect(store.retrieval.search("learner_test_1", book.id, "What does RuBisCO do?")[0].page).toBe(1);
    expect(store.retrieval.search("learner_test_1", book.id, "photosynthesis mitochondria")[0].page).toBe(2);
    expect(store.retrieval.search("learner_test_1", book.id, "光合成とは")[0].page).toBe(3);
    // Other learners cannot see this book's passages.
    expect(store.retrieval.search("someone_else_1", book.id, "RuBisCO")).toHaveLength(0);
    store.close();
  });
});
