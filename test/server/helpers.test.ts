import { describe, expect, it } from "vitest";
import { parseJsonObject } from "../../server/providers/llm";
import { citedSources, historyText } from "../../server/services/tutor";
import type { ContextPacket } from "../../server/services/context";

describe("parseJsonObject", () => {
  it("extracts JSON from fenced blocks, prose and nested braces", () => {
    expect(parseJsonObject('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('Sure! Here it is: {"ops": [{"op": "x", "s": "a } b"}]} Hope that helps.')).toEqual({
      ops: [{ op: "x", s: "a } b" }],
    });
    expect(parseJsonObject('{"text": "quote \\" inside"}')).toEqual({ text: 'quote " inside' });
  });

  it("returns null for missing or broken JSON", () => {
    expect(parseJsonObject("no json here")).toBeNull();
    expect(parseJsonObject('{"a": ')).toBeNull();
    expect(parseJsonObject("")).toBeNull();
  });
});

describe("citedSources", () => {
  const context: ContextPacket = {
    text: "",
    learnerLevel: "new",
    documentLabels: [
      { label: "D1", id: "doc_a", title: "Biology" },
      { label: "D2", id: "doc_b", title: "Chemistry" },
    ],
    sources: [{ documentId: "doc_b", page: 7, snippet: "Enzymes lower activation energy" }],
  };

  it("maps [D# p.#] citations to documents, dedupes, keeps offered snippets", () => {
    const sources = citedSources("A [D1 p.3]. B [D2 p.7] and again [D2 p.7]. Range [D1 p.4-5]. Bad [D9 p.1].", context);
    expect(sources).toEqual([
      { documentId: "doc_a", documentTitle: "Biology", page: 3, snippet: undefined },
      { documentId: "doc_b", documentTitle: "Chemistry", page: 7, snippet: "Enzymes lower activation energy" },
      { documentId: "doc_a", documentTitle: "Biology", page: 4, snippet: undefined },
    ]);
  });
});

describe("historyText", () => {
  it("summarises structured parts so the model remembers what it showed", () => {
    const text = historyText({
      id: "m",
      bookId: "b",
      role: "assistant",
      channel: "chat",
      content: "Here you go.",
      createdAt: 0,
      parts: [
        { type: "images", query: "red panda", images: [] },
        { type: "diagram", diagram: { id: "d", title: "Calvin cycle", mermaid: "", steps: [] } },
        {
          type: "quiz",
          quiz: {
            id: "q",
            concept: "ATP",
            question: "What is ATP?",
            options: [],
            answerIndex: -1,
            answer: "",
            explanation: "",
          },
          result: { quizId: "q", correct: false, score: 0, feedback: "" },
        },
      ],
    });
    expect(text).toContain("[showed images: red panda]");
    expect(text).toContain("[showed diagram: Calvin cycle]");
    expect(text).toContain("learner was incorrect");
  });
});
