/**
 * Rehype plugin for streaming answers: wraps each word of prose in
 * <span class="sw">, so a word fades in when it first appears. React keys
 * for these spans are positional, so words already on screen keep their DOM
 * nodes and only newly arrived words animate. Code, math and diagrams are
 * left untouched.
 */
type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const SKIP = new Set(["pre", "code", "svg", "math", "script", "style", "annotation"]);

const skips = (node: Node) => {
  if (node.tagName && SKIP.has(node.tagName)) return true;
  const className = node.properties?.className;
  return Array.isArray(className) && className.some((name) => String(name).startsWith("katex"));
};

function wrap(node: Node) {
  if (!node.children) return;
  const next: Node[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) {
      for (const part of child.value.split(/(\s+)/)) {
        if (!part) continue;
        next.push(
          /^\s+$/.test(part)
            ? { type: "text", value: part }
            : { type: "element", tagName: "span", properties: { className: ["sw"] }, children: [{ type: "text", value: part }] },
        );
      }
      continue;
    }
    if (child.type === "element" && !skips(child)) wrap(child);
    next.push(child);
  }
  node.children = next;
}

export function rehypeStreamWords() {
  return (tree: Node) => wrap(tree);
}
