import { act, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsView } from "../src/views/AnalyticsView";
import {
  db,
  type ConversationInteraction,
  type PersistentConcept,
  type SessionMemoryRecord,
} from "../src/memory/longterm.memory";

vi.mock("recharts", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: ReactNode }): ReactNode =>
    React.createElement("div", null, children);
  const Primitive = (): null => null;

  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
    Tooltip: Primitive,
    CartesianGrid: Primitive,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: Primitive,
  };
});

const concept = (
  id: string,
  name: string,
  mastery: number,
  confidence: number,
): PersistentConcept => ({
  id,
  name,
  description: `${name} concept`,
  mastery,
  confidence,
  p_learn: mastery,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: [],
  relatedConcepts: [],
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: Date.now(),
  firstLearnedAt: Date.now(),
  linkedAnnotations: [],
});

const interaction = (id: string): ConversationInteraction => ({
  id,
  sessionId: "session:analytics",
  timestamp: Date.now(),
  userMessage: "How does retrieval practice work?",
  assistantMessage: "It strengthens recall through repeated testing.",
  identifiedConcepts: ["retrieval-practice"],
  userConfusionDetected: false,
});

const session = (id: string): SessionMemoryRecord => ({
  id,
  startTime: Date.now(),
  pagesVisited: [],
  conceptsDiscussed: ["retrieval-practice"],
  solvedProblems: 0,
  mistakes: [],
});

const expectStat = (label: string, value: string) => {
  const heading = screen.getByText(label);
  const card = heading.closest("div");
  expect(card).toBeTruthy();
  expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("rendered Analytics Dexie subscriptions", () => {
  it("updates visible progress cards and chart summaries after Dexie changes", async () => {
    render(<AnalyticsView />);

    await waitFor(() => {
      expectStat("Total Concepts", "0");
      expectStat("Interactions", "0");
      expectStat("Study Sessions", "0");
    });

    await act(async () => {
      await db.concepts.put(
        concept("retrieval-practice", "Retrieval Practice", 0.82, 0.6),
      );
      await db.interactions.put(interaction("interaction:analytics"));
      await db.sessions.put(session("session:analytics"));
    });

    await waitFor(() => {
      expectStat("Total Concepts", "1");
      expectStat("Interactions", "1");
      expectStat("Study Sessions", "1");
    });

    expect(
      screen.getByText(/Retrieval Practice: Mastery 82%, Confidence 60%/),
    ).toBeInTheDocument();

    await act(async () => {
      await db.concepts.put(
        concept("spaced-repetition", "Spaced Repetition", 0.42, 0.5),
      );
    });

    await waitFor(() => {
      expectStat("Total Concepts", "2");
    });

    expect(
      screen.getByText(/Spaced Repetition: Mastery 42%, Confidence 50%/),
    ).toBeInTheDocument();
  });
});
