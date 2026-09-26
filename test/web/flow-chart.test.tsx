import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiagramView } from "@/components/Diagram";
import { FlowChartView } from "@/components/flow/FlowChart";
import { basisPath, flowMetrics, layoutFlowchart, wrapText } from "@/lib/flow/layout";
import { parseFlowchart } from "@/lib/flow/parse";

const SOURCE = `flowchart TD
  A([Sunlight hits leaf]) --> B[Chlorophyll absorbs light energy]
  B --> C{Enough water?}
  C -->|Yes| D[Water split, oxygen released]
  C -->|No| E[Stomata close]
  D --> F[(ATP and NADPH)]
  F --> G([Calvin cycle builds sugar])
`;

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("flowchart layout", () => {
  const chart = parseFlowchart(SOURCE)!;
  const laid = layoutFlowchart(chart, flowMetrics("regular"));

  it("places every step inside the drawing without overlaps", () => {
    expect(laid.nodes).toHaveLength(7);
    for (const node of laid.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(laid.width + 0.5);
      expect(node.y + node.height).toBeLessThanOrEqual(laid.height + 0.5);
    }
    for (const [index, a] of laid.nodes.entries())
      for (const b of laid.nodes.slice(index + 1)) expect(overlaps(a, b), `${a.id} vs ${b.id}`).toBe(false);
  });

  it("numbers steps in reading order and classifies shapes", () => {
    const step = Object.fromEntries(laid.nodes.map((node) => [node.id, node.step]));
    expect(step.A).toBe(1);
    expect(step.B).toBe(2);
    expect(step.C).toBe(3);
    expect(step.G).toBe(7);
    expect(Object.fromEntries(laid.nodes.map((node) => [node.id, node.kind]))).toMatchObject({
      A: "terminal",
      B: "step",
      C: "decision",
      F: "data",
      G: "terminal",
    });
  });

  it("routes smooth edges and places label chips", () => {
    for (const edge of laid.edges) expect(edge.path).toMatch(/^M[\d.]+,[\d.]+/);
    const yes = laid.edges.find((edge) => edge.label === "Yes")!;
    expect(yes.labelBox?.lines).toEqual(["Yes"]);
  });

  it("flows sideways when asked, and wraps long labels", () => {
    const sideways = layoutFlowchart(chart, flowMetrics("regular"), "LR");
    const a = sideways.nodes.find((node) => node.id === "A")!;
    const g = sideways.nodes.find((node) => node.id === "G")!;
    expect(g.x).toBeGreaterThan(a.x);
    const wrapped = wrapText(
      "A very long label that must wrap onto several short lines",
      90,
      flowMetrics("regular"),
      3,
    );
    expect(wrapped.lines.length).toBe(3);
    expect(wrapped.lines[2].endsWith("…")).toBe(true);
  });

  it("encloses subgraph members in their group", () => {
    const grouped = parseFlowchart(`flowchart LR
      subgraph light [Light reactions]
        A[Split water] --> B[Make ATP]
      end
      B --> C[Calvin cycle]`)!;
    const out = layoutFlowchart(grouped, flowMetrics("compact"));
    const group = out.groups[0];
    for (const id of ["A", "B"]) {
      const node = out.nodes.find((candidate) => candidate.id === id)!;
      expect(node.x).toBeGreaterThanOrEqual(group.x);
      expect(node.x + node.width).toBeLessThanOrEqual(group.x + group.width);
    }
  });

  it("draws straight lines for two points and B-splines for more", () => {
    expect(
      basisPath([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ]),
    ).toBe("M0,0L10,20");
    expect(
      basisPath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ]),
    ).toMatch(/^M0,0L[\d.]+,[\d.]+C/);
  });
});

describe("FlowChartView", () => {
  const chart = parseFlowchart(SOURCE)!;
  const fit = { maxHeight: 400, maxScale: 1 };

  it("renders an accessible, numbered flowchart with branded parts", () => {
    const { container } = render(<FlowChartView chart={chart} fit={fit} title="Photosynthesis" />);
    const figure = screen.getByRole("img", { name: /^Photosynthesis: 1\. Sunlight hits leaf, 2\. Chlorophyll/ });
    expect(figure).toBeInTheDocument();
    expect(container.querySelectorAll(".flow-node")).toHaveLength(7);
    // Terminals have no number badge; the decision's badge is a "?".
    expect(container.querySelector('[data-node="A"] .flow-badge')).toBeNull();
    expect(container.querySelector('[data-node="C"] .flow-badge')?.textContent).toBe("?");
    expect(container.querySelector('[data-node="B"] .flow-badge')?.textContent).toBe("2");
    expect(container.querySelector('.flow-edge-label[data-tone="yes"]')?.textContent).toBe("Yes");
    expect(container.querySelector('.flow-edge-label[data-tone="no"]')?.textContent).toBe("No");
  });

  it("spotlights the active step and lights its connections", () => {
    const { container, rerender } = render(<FlowChartView chart={chart} fit={fit} activeNode={null} />);
    rerender(<FlowChartView chart={chart} fit={fit} activeNode="C" />);
    expect(container.querySelector('[data-node="C"]')?.getAttribute("data-active")).toBe("true");
    expect(container.querySelector(".flow")?.getAttribute("data-touring")).toBe("true");
    const lit = [...container.querySelectorAll(".flow-edge[data-lit]")];
    expect(lit).toHaveLength(3); // B→C, C→D, C→E
    expect(container.querySelector('.flow-slot[data-dim] [data-node="G"]')).not.toBeNull();
  });

  it("lights a step's edges on hover", () => {
    const { container } = render(<FlowChartView chart={chart} fit={fit} />);
    act(() => {
      fireEvent.mouseEnter(container.querySelector('[data-node="F"]')!);
    });
    expect(container.querySelectorAll(".flow-edge[data-lit]")).toHaveLength(2);
    act(() => {
      fireEvent.mouseLeave(container.querySelector('[data-node="F"]')!);
    });
    expect(container.querySelectorAll(".flow-edge[data-lit]")).toHaveLength(0);
  });
});

describe("DiagramView", () => {
  it("uses the branded renderer for flowcharts and Mermaid for other types", () => {
    const fit = { maxHeight: 300, maxScale: 1 };
    const { container, rerender } = render(<DiagramView source={SOURCE} fit={fit} />);
    expect(container.querySelector(".flow svg")).not.toBeNull();
    expect(container.querySelector(".mermaid-host")).toBeNull();
    rerender(<DiagramView source={"sequenceDiagram\nA->>B: hi"} fit={fit} />);
    expect(container.querySelector(".mermaid-host")).not.toBeNull();
    expect(container.querySelector(".flow")).toBeNull();
  });
});
