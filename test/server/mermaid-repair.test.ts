import { describe, expect, it } from "vitest";
import { repairMermaid } from "../../shared/mermaid";

describe("repairMermaid", () => {
  it("adds the missing header and turns an escaped newline inside a label into a line break", () => {
    // Exactly what a model wrote into a study guide: no header, and a literal backslash-n in a label.
    const source = String.raw`A[Input data] --> B[Forward pass\nprediction]`;
    expect(repairMermaid(source)).toBe("flowchart TD\nA[Input data] --> B[Forward pass<br/>prediction]");
  });

  it("splits a source that was escaped twice as a whole into real lines", () => {
    const source = String.raw`flowchart LR\nA[Light reactions] --> B[Calvin cycle]\nB --> C[Sugar]`;
    expect(repairMermaid(source)).toBe("flowchart LR\nA[Light reactions] --> B[Calvin cycle]\nB --> C[Sugar]");
  });

  it("repairs escaped newlines in quoted labels and edge labels", () => {
    const source = String.raw`flowchart TD
A["Raw\ninput"] -->|first\nstep| B(Clean\ndata)`;
    expect(repairMermaid(source)).toBe('flowchart TD\nA["Raw<br/>input"] -->|first<br/>step| B(Clean<br/>data)');
  });

  it("strips code fences and normalises line endings", () => {
    expect(repairMermaid("```mermaid\r\nflowchart TD\r\n  A --> B\r\n```")).toBe("flowchart TD\n  A --> B");
  });

  it("leaves valid sources alone", () => {
    const flow = "flowchart LR\n  A[Question] --> B[Answer]";
    expect(repairMermaid(flow)).toBe(flow);
    const sequence = "sequenceDiagram\n  participant A as Browser\n  A->>B: Upload";
    expect(repairMermaid(sequence)).toBe(sequence);
    const commented = "%% a note\ngraph TD\n  A --> B";
    expect(repairMermaid(commented)).toBe(commented);
    const pie = 'pie title Pets\n  "Dogs" : 386';
    expect(repairMermaid(pie)).toBe(pie);
  });

  it("keeps escaped newlines in sequence messages on their line", () => {
    const source = "sequenceDiagram\n  A->>B: first line\\nsecond line\n  B-->>A: ok";
    expect(repairMermaid(source)).toBe("sequenceDiagram\n  A->>B: first line<br/>second line\n  B-->>A: ok");
  });

  it("does not invent a header for text that is not a diagram", () => {
    expect(repairMermaid("just some words")).toBe("just some words");
    expect(repairMermaid("")).toBe("");
  });

  it("puts the header after front matter", () => {
    expect(repairMermaid("---\ntitle: Flow\n---\nA --> B")).toBe("---\ntitle: Flow\n---\nflowchart TD\nA --> B");
  });
});
