import { act, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "dexie-react-hooks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  db,
  type Flashcard,
  type LearningBook,
  type PersistentConcept,
  type TraceLog,
} from "../src/memory/longterm.memory";

function DexieProbe() {
  const concepts = useLiveQuery(() => db.concepts.toArray(), []);
  const flashcards = useLiveQuery(() => db.flashcards.toArray(), []);
  const learningBooks = useLiveQuery(() => db.learningBooks.toArray(), []);
  const traceLogs = useLiveQuery(() => db.traceLogs.toArray(), []);

  return (
    <section aria-label="Dexie hook probe">
      <p>Concepts: {concepts?.map((concept) => concept.name).join(", ")}</p>
      <p>Flashcards: {flashcards?.map((card) => card.front).join(", ")}</p>
      <p>Books: {learningBooks?.map((book) => book.title).join(", ")}</p>
      <p>Trace logs: {traceLogs?.map((log) => log.action).join(", ")}</p>
    </section>
  );
}

const concept = (name: string): PersistentConcept => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  description: `${name} concept`,
  mastery: 0.2,
  confidence: 0.3,
  p_learn: 0.2,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: [],
  relatedConcepts: [],
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: 0,
  firstLearnedAt: 0,
  linkedAnnotations: [],
});

const learningBook = (title: string): LearningBook => ({
  id: `book:${title.toLowerCase().replace(/\s+/g, "-")}`,
  sessionId: "session:test",
  title,
  userName: "Learner",
  source: "chat",
  overview: "",
  summary: "",
  knowledgeSummary: "",
  chapters: [],
  conceptIds: [],
  conversationCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const flashcard = (front: string): Flashcard => ({
  id: `card:${front.toLowerCase().replace(/\s+/g, "-")}`,
  front,
  back: "Back",
  nextReviewAt: Date.now(),
});

const traceLog = (action: string): TraceLog => ({
  id: `trace:${action.toLowerCase().replace(/\s+/g, "-")}`,
  timestamp: Date.now(),
  action,
  payload: { source: "render-test" },
  llmExplanation: "Rendered hook test trace.",
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("rendered Dexie React hooks", () => {
  it("updates rendered output when concepts, flashcards, books, and trace logs change", async () => {
    render(<DexieProbe />);

    await act(async () => {
      await db.concepts.put(concept("Spaced Repetition"));
      await db.flashcards.put(flashcard("What is retrieval practice?"));
      await db.learningBooks.put(learningBook("Graphify Study Notes"));
      await db.traceLogs.put(traceLog("document_ingested"));
    });

    expect(await screen.findByText(/Spaced Repetition/)).toBeInTheDocument();
    expect(
      await screen.findByText(/What is retrieval practice\?/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Graphify Study Notes/)).toBeInTheDocument();
    expect(await screen.findByText(/document_ingested/)).toBeInTheDocument();

    await act(async () => {
      await db.learningBooks.update("book:graphify-study-notes", {
        title: "Graphify Study Notes Updated",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Graphify Study Notes Updated/),
      ).toBeInTheDocument();
    });

    await act(async () => {
      await db.flashcards.delete("card:what-is-retrieval-practice?");
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/What is retrieval practice\?/),
      ).not.toBeInTheDocument();
    });
  });
});
