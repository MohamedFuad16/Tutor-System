import { describe, expect, it } from "vitest";
import { parseFlowchart } from "@/lib/flow/parse";

const edgesOf = (source: string) =>
  parseFlowchart(source)!.edges.map((edge) => `${edge.from}>${edge.to}${edge.label ? `:${edge.label}` : ""}`);

describe("parseFlowchart", () => {
  it("reads direction, node shapes and labels", () => {
    const chart = parseFlowchart(`flowchart LR
      A([Start]) --> B[Collect data]
      B --> C{Enough samples?}
      C -->|Yes| D[(Store results)]
      C -->|No| E[/Ask for more/]
      D --> F((Done))
      E --> G[["Retry (x3)"]]
      G --> H{{Hex}} --> I>Flag] --> J(Rounded)
    `)!;
    expect(chart.direction).toBe("LR");
    expect(Object.fromEntries(chart.nodes.map((node) => [node.id, [node.shape, node.label]]))).toEqual({
      A: ["stadium", "Start"],
      B: ["box", "Collect data"],
      C: ["decision", "Enough samples?"],
      D: ["database", "Store results"],
      E: ["io", "Ask for more"],
      F: ["circle", "Done"],
      G: ["subroutine", "Retry (x3)"],
      H: ["hexagon", "Hex"],
      I: ["flag", "Flag"],
      J: ["round", "Rounded"],
    });
    expect(edgesOf(`flowchart TD\nC{Q} -->|Yes| D\nC -->|No| E`)).toEqual(["C>D:Yes", "C>E:No"]);
  });

  it("handles every edge syntax the tutor writes", () => {
    const chart = parseFlowchart(`graph TD
      A-->B
      B -- inline label --> C
      C -. maybe .-> D
      D ==> E
      E --- F
      F -.-> G
      G == go ==> H
      H <--> I
      I --o J
      J --x K
      K ~~~ L
    `)!;
    expect(chart.direction).toBe("TB");
    const by = (from: string) => chart.edges.find((edge) => edge.from === from)!;
    expect(by("A")).toMatchObject({ to: "B", stroke: "solid", head: "arrow" });
    expect(by("B")).toMatchObject({ to: "C", label: "inline label" });
    expect(by("C")).toMatchObject({ to: "D", label: "maybe", stroke: "dotted", head: "arrow" });
    expect(by("D")).toMatchObject({ stroke: "thick", head: "arrow" });
    expect(by("E")).toMatchObject({ stroke: "solid", head: "none" });
    expect(by("F")).toMatchObject({ stroke: "dotted", head: "arrow" });
    expect(by("G")).toMatchObject({ label: "go", stroke: "thick" });
    expect(by("H")).toMatchObject({ head: "arrow", tail: "arrow" });
    expect(by("I")).toMatchObject({ head: "circle" });
    expect(by("J")).toMatchObject({ head: "cross" });
    // Invisible links only shape the layout in Mermaid; we drop them.
    expect(chart.edges.some((edge) => edge.from === "K")).toBe(false);
    expect(chart.nodes.map((node) => node.id)).toContain("L");
  });

  it("expands chains and & fan-out/fan-in", () => {
    expect(edgesOf("flowchart TD\nA --> B --> C")).toEqual(["A>B", "B>C"]);
    expect(edgesOf("flowchart TD\nA & B --> C & D")).toEqual(["A>C", "A>D", "B>C", "B>D"]);
    expect(edgesOf("graph LR; A-->B; B-->C;")).toEqual(["A>B", "B>C"]);
  });

  it("keeps hyphenated ids apart from arrows", () => {
    expect(edgesOf("flowchart TD\nstep-one --> step-two\nA-.->B")).toEqual(["step-one>step-two", "A>B"]);
  });

  it("cleans labels: quotes, <br>, markdown emphasis, entities", () => {
    const chart = parseFlowchart(`flowchart TD
      A["Light <br/> energy"] --> B["**ATP** &amp; NADPH"]
      B --> C["Say #quot;hi#quot;"]
    `)!;
    expect(chart.nodes.map((node) => node.label)).toEqual(["Light\nenergy", "ATP & NADPH", 'Say "hi"']);
  });

  it("reads subgraphs, styling lines and later label definitions", () => {
    const chart = parseFlowchart(`%%{init: {"theme": "dark"}}%%
      flowchart TB
      subgraph light [Light reactions]
        A[Water split] --> B[ATP made]
      end
      subgraph "Calvin cycle"
        C[CO2 fixed] --> D[Sugar built]
      end
      B --> C
      A:::hot
      classDef hot fill:#f96
      style D stroke:#333
      click D callback
      linkStyle 0 stroke:red
    `)!;
    expect(chart.groups).toEqual([
      { id: "light", title: "Light reactions", parent: undefined },
      { id: "group2", title: "Calvin cycle", parent: undefined },
    ]);
    expect(chart.nodes.find((node) => node.id === "C")?.group).toBe("group2");
    expect(edgesOf(`flowchart TD\nA --> B\nB[Named later]`)).toEqual(["A>B"]);
    expect(parseFlowchart(`flowchart TD\nA --> B\nB[Named later]`)!.nodes[1].label).toBe("Named later");
  });

  it("returns null for other diagram types and syntax it cannot draw", () => {
    expect(parseFlowchart("sequenceDiagram\nA->>B: hi")).toBeNull();
    expect(parseFlowchart("mindmap\n root")).toBeNull();
    expect(parseFlowchart("flowchart TD\nA --> B\nend")).toBeNull();
    expect(parseFlowchart("flowchart TD\nsubgraph S\nA --> B")).toBeNull();
    expect(parseFlowchart("flowchart TD\nA -->")).toBeNull();
    expect(parseFlowchart("flowchart TD\n")).toBeNull();
  });

  it("accepts fenced and front-mattered sources", () => {
    expect(edgesOf("```mermaid\nflowchart LR\nA --> B\n```")).toEqual(["A>B"]);
    expect(edgesOf("---\ntitle: Demo\n---\nflowchart LR\nA --> B")).toEqual(["A>B"]);
  });
});
