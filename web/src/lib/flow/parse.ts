/**
 * Parser for the Mermaid flowchart subset the tutor writes ("flowchart TD",
 * nodes with shapes and labels, labelled edges, chains, "&" fan-out and
 * subgraphs). It feeds Tutor's own flowchart renderer (./layout.ts,
 * components/flow/FlowChart.tsx).
 *
 * Anything it doesn't understand makes it return null, and the diagram falls
 * back to Mermaid, so an unusual construct never breaks a diagram.
 */
import { tidyMermaid } from "@/lib/mermaid";

export type FlowDirection = "TB" | "BT" | "LR" | "RL";
export type NodeShape =
  | "box"
  | "round"
  | "stadium"
  | "subroutine"
  | "database"
  | "circle"
  | "decision"
  | "hexagon"
  | "io"
  | "flag";
export type EdgeStroke = "solid" | "dotted" | "thick" | "invisible";
export type EdgeHead = "arrow" | "none" | "circle" | "cross";

export type FlowNode = { id: string; label: string; shape: NodeShape; group?: string };
export type FlowEdge = { from: string; to: string; label?: string; stroke: EdgeStroke; head: EdgeHead; tail: EdgeHead };
export type FlowGroup = { id: string; title: string; parent?: string };
export type Flowchart = { direction: FlowDirection; nodes: FlowNode[]; edges: FlowEdge[]; groups: FlowGroup[] };

/** Node ids. A hyphen is allowed ("step-one") unless it starts an arrow ("A-->B", "A-.->B"). */
const ID = String.raw`[A-Za-z0-9_](?:\w|-(?![-.>=]))*`;

/** Node shape openers, longest first so "((" wins over "(". */
const SHAPES: Array<{ open: string; close: string; shape: NodeShape }> = [
  { open: "(((", close: ")))", shape: "circle" },
  { open: "([", close: "])", shape: "stadium" },
  { open: "[[", close: "]]", shape: "subroutine" },
  { open: "[(", close: ")]", shape: "database" },
  { open: "((", close: "))", shape: "circle" },
  { open: "{{", close: "}}", shape: "hexagon" },
  { open: "[/", close: "/]", shape: "io" },
  { open: "[\\", close: "\\]", shape: "io" },
  { open: "[/", close: "\\]", shape: "io" },
  { open: "[\\", close: "/]", shape: "io" },
  { open: "[", close: "]", shape: "box" },
  { open: "(", close: ")", shape: "round" },
  { open: "{", close: "}", shape: "decision" },
  { open: ">", close: "]", shape: "flag" },
];

/** Edge operators: optional inline label ("-- yes -->", "-. maybe .->", "== go ==>"). */
const LINK = new RegExp(
  String.raw`^\s*(?:` +
    [
      String.raw`(?<l1>[<ox]?)(?<b1>--|==)\s+(?<t1>(?:(?!-->|==>|---|===).)+?)\s+(?<a1>-{2,}[>ox]|={2,}[>ox]|-{3,}|={3,})`,
      String.raw`(?<l2>[<ox]?)-\.\s+(?<t2>.+?)\s+\.-+(?<a2>[>ox]?)`,
      String.raw`(?<l3>[<ox]?)(?<a3>-{2,}[>ox]|={2,}[>ox]|-{3,}|={3,}|-\.+-[>ox]?|~{3,})`,
    ].join("|") +
    String.raw`)(?:\|(?<pipe>[^|]*)\|)?\s*`,
);

function unquote(label: string) {
  let text = label.trim();
  if (/^".*"$/s.test(text)) text = text.slice(1, -1);
  if (/^`.*`$/s.test(text)) text = text.slice(1, -1);
  return text
    .replace(/[ \t]*<br\s*\/?>[ \t]*/gi, "\n")
    .replace(/&quot;|#quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

type Cursor = { text: string; pos: number };

/** Reads a label up to `close`, honouring quotes; returns null if unterminated. */
function readLabel(cursor: Cursor, close: string): string | null {
  const { text } = cursor;
  let index = cursor.pos;
  let quoted = false;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') quoted = !quoted;
    else if (!quoted && text.startsWith(close, index)) {
      const label = text.slice(cursor.pos, index);
      cursor.pos = index + close.length;
      return label;
    }
    index += 1;
  }
  return null;
}

/** Reads "A", "A[label]", "A{label}", … Returns null if no node starts here. */
function readNode(cursor: Cursor): { id: string; label?: string; shape?: NodeShape } | null | "bad" {
  const match = new RegExp(`^\\s*(${ID})`).exec(cursor.text.slice(cursor.pos));
  if (!match) return null;
  const id = match[1];
  cursor.pos += match[0].length;
  const rest = cursor.text.slice(cursor.pos);
  for (const shape of SHAPES) {
    if (!rest.startsWith(shape.open)) continue;
    const save = cursor.pos;
    cursor.pos += shape.open.length;
    const label = readLabel(cursor, shape.close);
    if (label === null) {
      cursor.pos = save;
      continue;
    }
    return { id, label: unquote(label), shape: shape.shape };
  }
  // "A:::className" styling suffix: ignore the class.
  const klass = /^:::[\w-]+/.exec(cursor.text.slice(cursor.pos));
  if (klass) cursor.pos += klass[0].length;
  return { id };
}

/** "A & B" → [A, B]. */
function readNodeGroup(cursor: Cursor) {
  const nodes: Array<{ id: string; label?: string; shape?: NodeShape }> = [];
  for (;;) {
    const node = readNode(cursor);
    if (!node || node === "bad") return nodes.length ? nodes : null;
    const klass = /^:::[\w-]+/.exec(cursor.text.slice(cursor.pos));
    if (klass) cursor.pos += klass[0].length;
    nodes.push(node);
    const amp = /^\s*&\s*/.exec(cursor.text.slice(cursor.pos));
    if (!amp) return nodes;
    cursor.pos += amp[0].length;
  }
}

function edgeStyle(op: string): { stroke: EdgeStroke; head: EdgeHead } {
  const stroke: EdgeStroke = op.startsWith("~")
    ? "invisible"
    : op.includes(".")
      ? "dotted"
      : op.startsWith("=")
        ? "thick"
        : "solid";
  const last = op.at(-1);
  const head: EdgeHead = last === ">" ? "arrow" : last === "o" ? "circle" : last === "x" ? "cross" : "none";
  return { stroke, head };
}

const IGNORED = /^(?:classDef|class|style|linkStyle|click|accTitle|accDescr|direction)\b/;

/** Parses a Mermaid flowchart; null when it isn't one or uses syntax we don't draw. */
export function parseFlowchart(source: string): Flowchart | null {
  const code = tidyMermaid(source)
    .replace(/^---\n[\s\S]*?\n---\n/, "") // front matter (title/config)
    .split("\n")
    .map((line) => line.replace(/%%.*$/, "").trim())
    .filter(Boolean);
  if (!code.length) return null;
  const header = /^(?:flowchart|graph)(?:\s+(TD|TB|BT|LR|RL))?\s*;?\s*(.*)$/i.exec(code[0]);
  if (!header) return null;
  const direction = ((header[1] ?? "TD").toUpperCase().replace("TD", "TB") as FlowDirection) || "TB";

  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const groups: FlowGroup[] = [];
  const stack: string[] = [];

  const touch = (node: { id: string; label?: string; shape?: NodeShape }) => {
    const existing = nodes.get(node.id);
    if (existing) {
      if (node.label !== undefined) {
        existing.label = node.label;
        existing.shape = node.shape ?? existing.shape;
      }
      return existing;
    }
    const created: FlowNode = {
      id: node.id,
      label: node.label ?? node.id,
      shape: node.shape ?? "box",
      group: stack.at(-1),
    };
    nodes.set(node.id, created);
    return created;
  };

  const statements = [header[2], ...code.slice(1)].flatMap((line) => splitStatements(line)).filter(Boolean);
  for (const statement of statements) {
    if (IGNORED.test(statement)) continue;
    const subgraph = /^subgraph\s+(.+)$/i.exec(statement);
    if (subgraph) {
      const spec = subgraph[1].trim();
      const titled = new RegExp(`^(${ID})\\s*\\[(.+)\\]$`).exec(spec);
      const id = titled ? titled[1] : /^[\w.-]+$/.test(spec) ? spec : `group${groups.length + 1}`;
      const title = unquote(titled ? titled[2] : spec);
      groups.push({ id, title, parent: stack.at(-1) });
      stack.push(id);
      continue;
    }
    if (/^end$/i.test(statement)) {
      if (!stack.length) return null;
      stack.pop();
      continue;
    }

    const cursor: Cursor = { text: statement, pos: 0 };
    let left = readNodeGroup(cursor);
    if (!left) return null;
    left.forEach(touch);
    while (cursor.pos < statement.length) {
      const link = LINK.exec(statement.slice(cursor.pos));
      if (!link?.groups) {
        if (/^\s*$/.test(statement.slice(cursor.pos))) break;
        return null;
      }
      cursor.pos += link[0].length;
      const g = link.groups;
      const op = g.a1 ?? (g.t2 !== undefined ? `-.-${g.a2 ?? ""}` : undefined) ?? g.a3 ?? "-->";
      const tailMark = g.l1 || g.l2 || g.l3 || "";
      const label = unquote(g.pipe ?? g.t1 ?? g.t2 ?? "") || undefined;
      const right = readNodeGroup(cursor);
      if (!right) return null;
      right.forEach(touch);
      const style = edgeStyle(op);
      const tail: EdgeHead =
        tailMark === "<" ? "arrow" : tailMark === "o" ? "circle" : tailMark === "x" ? "cross" : "none";
      for (const from of left) for (const to of right) edges.push({ from: from.id, to: to.id, label, ...style, tail });
      left = right;
    }
  }
  if (stack.length || !nodes.size) return null;
  // Groups that ended up empty are dropped; nested membership points at existing groups only.
  const used = new Set([...nodes.values()].map((node) => node.group).filter(Boolean));
  for (const group of groups) if (group.parent) used.add(group.parent);
  return {
    direction,
    nodes: [...nodes.values()],
    edges: edges.filter((edge) => edge.stroke !== "invisible"),
    groups: groups.filter((group) => used.has(group.id)),
  };
}

/** Splits on ";" outside labels and quotes. */
function splitStatements(line: string) {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (!quoted && "[({".includes(char)) depth += 1;
    else if (!quoted && "])}".includes(char)) depth = Math.max(0, depth - 1);
    else if (!quoted && depth === 0 && char === ";") {
      out.push(line.slice(start, index).trim());
      start = index + 1;
    }
  }
  out.push(line.slice(start).trim());
  return out;
}
