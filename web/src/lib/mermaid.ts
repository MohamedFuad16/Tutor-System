/**
 * Mermaid loader and renderer. Mermaid is ~800 KB, so it loads lazily on the
 * first diagram. Renders are serialised because mermaid's config is global
 * and each surface (chat paper, dark voice stage, notebook) has its own theme.
 */
type Mermaid = typeof import("mermaid").default;
export type DiagramTheme = "light" | "dark" | "paper";

let loader: Promise<Mermaid> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

const THEMES: Record<DiagramTheme, Record<string, string>> = {
  light: {
    background: "transparent",
    primaryColor: "#fff7ef",
    primaryBorderColor: "#ffb27a",
    primaryTextColor: "#1c1917",
    secondaryColor: "#f5f3ff",
    tertiaryColor: "#f0f9ff",
    lineColor: "#a8a29e",
    textColor: "#292524",
    fontFamily: "Geist Sans, ui-sans-serif, system-ui",
    fontSize: "14px",
  },
  dark: {
    background: "transparent",
    primaryColor: "#17171b",
    primaryBorderColor: "#ff8a3d",
    primaryTextColor: "#f4f4f1",
    secondaryColor: "#1e1b2e",
    tertiaryColor: "#0f1d2e",
    lineColor: "#6b6b74",
    textColor: "#e7e7e4",
    fontFamily: "Geist Sans, ui-sans-serif, system-ui",
    fontSize: "15px",
  },
  paper: {
    background: "transparent",
    primaryColor: "#fffaf1",
    primaryBorderColor: "#c9a77c",
    primaryTextColor: "#1f1b16",
    secondaryColor: "#f1ebdf",
    tertiaryColor: "#f6f0e4",
    lineColor: "#9c8f7b",
    textColor: "#2b251d",
    fontFamily: "Lora, Georgia, serif",
    fontSize: "14px",
  },
};

function load() {
  loader ??= import("mermaid").then((module) => module.default);
  return loader;
}

/** Light cleanup of common LLM Mermaid mistakes before parsing. */
export function tidyMermaid(source: string) {
  return (
    source
      .replace(/^```(?:mermaid)?\s*/i, "")
      .replace(/```\s*$/, "")
      .replace(/\r\n?/g, "\n")
      // Smart quotes and arrows confuse the parser.
      .replace(/[“”]/g, '"')
      .replace(/→/g, "-->")
      .trim()
  );
}

export async function renderMermaid(source: string, theme: DiagramTheme): Promise<{ svg: string } | { error: string }> {
  const job = queue.then(async () => {
    const mermaid = await load();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: THEMES[theme],
      flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 46, htmlLabels: true },
      sequence: { mirrorActors: false },
    });
    const code = tidyMermaid(source);
    try {
      await mermaid.parse(code);
    } catch (error) {
      return { error: error instanceof Error ? error.message.split("\n")[0] : "Invalid diagram" };
    }
    try {
      const { svg } = await mermaid.render(`tutor-mermaid-${++counter}`, code);
      return { svg };
    } catch (error) {
      return { error: error instanceof Error ? error.message.split("\n")[0] : "Could not draw diagram" };
    } finally {
      // Mermaid leaves temp nodes behind on failure.
      document.querySelectorAll(`[id^="dtutor-mermaid-"]`).forEach((node) => node.remove());
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/** Finds the rendered group for a Mermaid node id across diagram types. */
export function findNode(svg: SVGSVGElement, nodeId: string): SVGGElement | null {
  if (!nodeId) return null;
  const id = CSS.escape(nodeId);
  return (
    svg.querySelector<SVGGElement>(`g.node[data-id="${id}"]`) ??
    svg.querySelector<SVGGElement>(`g[id="${id}"]`) ??
    // Mermaid ids look like "<renderId>-flowchart-A-3" or "state-A-1".
    [...svg.querySelectorAll<SVGGElement>("g.node")].find((node) =>
      new RegExp(`(?:^|-)(?:flowchart|state|classId)-${escapeRegex(nodeId)}-\\d+$`).test(node.id),
    ) ??
    null
  );
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Adds staggered draw-in timing to edges and nodes. */
export function prepareDrawIn(svg: SVGSVGElement) {
  const edges = [...svg.querySelectorAll<SVGPathElement>("path.flowchart-link, .edgePath path, path.transition")];
  const nodes = [...svg.querySelectorAll<SVGGElement>("g.node, g.edgeLabel")];
  nodes.forEach((node, index) => node.style.setProperty("--delay", `${Math.min(index * 0.09, 1.4)}s`));
  edges.forEach((edge, index) => {
    let length = 400;
    try {
      length = Math.ceil(edge.getTotalLength());
    } catch {
      // jsdom / hidden element
    }
    edge.style.setProperty("--len", String(length));
    edge.style.setProperty("--delay", `${Math.min(0.15 + index * 0.09, 1.6)}s`);
  });
  svg.classList.add("draw-in");
}
