/**
 * Repairs the Mermaid mistakes language models make most often, before the
 * source is stored (server) or drawn (web):
 *  - a ```mermaid fence around the source,
 *  - a literal two-character "\n" (a JSON escape that was escaped twice):
 *    inside a node label it becomes a line break (<br/>), outside it becomes
 *    a real newline,
 *  - a missing diagram header ("flowchart TD") on a body that is clearly a
 *    flowchart.
 * Pure and dependency free, so both sides share it.
 */

/** First words Mermaid accepts as a diagram type. */
const DIAGRAM_HEADER = new RegExp(
  "^(?:" +
    [
      "flowchart",
      "graph",
      "sequenceDiagram",
      "classDiagram(?:-v2)?",
      "stateDiagram(?:-v2)?",
      "erDiagram",
      "journey",
      "gantt",
      "pie",
      "mindmap",
      "timeline",
      "quadrantChart",
      "gitGraph",
      "xychart-beta",
      "sankey-beta",
      "block-beta",
      "requirementDiagram",
      "C4Context",
      "C4Container",
      "C4Component",
      "C4Dynamic",
      "C4Deployment",
      "architecture-beta",
      "packet-beta",
      "kanban",
      "radar-beta",
      "treemap-beta",
      "zenuml",
    ].join("|") +
    ")(?![\\w-])",
  "i",
);

/** An edge (-->, ---, ==>, -.->) or a node with a label (A[, B(, C{). */
const LOOKS_LIKE_FLOWCHART = /-->|---|==>|-\.->|-\.-|(?:^|\s|;)[A-Za-z0-9_]+\s*[[({]/m;

/** Splits off YAML front matter ("---\ntitle: x\n---") so the header check sees the body. */
function splitFrontMatter(source: string) {
  const match = /^---\n[\s\S]*?\n---(?:\n|$)/.exec(source);
  return match ? { front: match[0], body: source.slice(match[0].length) } : { front: "", body: source };
}

/** The first line that is not blank or a %% comment. */
function firstMeaningfulLine(source: string) {
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line && !line.startsWith("%%")) return line;
  }
  return "";
}

/**
 * Turns literal "\n" pairs into <br/> inside labels ([..], (..), {..}, "..",
 * |..|) and into real newlines elsewhere. In sequence and state diagrams the
 * text after ":" is a message label too, but only when the source already has
 * real line breaks (a source that is entirely on one line was escaped twice
 * as a whole, so every "\n" outside brackets is a statement break).
 */
function unescapeNewlines(source: string, colonLabels: boolean) {
  let out = "";
  let depth = 0;
  let quoted = false;
  let piped = false;
  let afterColon = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === "\\" && source[i + 1] === "n") {
      const inLabel = depth > 0 || quoted || piped || afterColon;
      if (inLabel) out += "<br/>";
      else out += "\n";
      i += 1;
      continue;
    }
    if (char === "\n") {
      depth = 0;
      quoted = false;
      piped = false;
      afterColon = false;
    } else if (char === '"') quoted = !quoted;
    else if (!quoted) {
      if ("[({".includes(char)) depth += 1;
      else if ("])}".includes(char)) depth = Math.max(0, depth - 1);
      else if (char === "|" && depth === 0) piped = !piped;
      else if (char === ":" && depth === 0 && colonLabels) afterColon = true;
    }
    out += char;
  }
  return out;
}

export function repairMermaid(source: string): string {
  let text = String(source ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/^```[ \t]*(?:mermaid)?[ \t]*\n?/i, "")
    .replace(/\n?[ \t]*```\s*$/, "")
    .trim();
  if (!text) return text;

  if (text.includes("\\n")) {
    const head = firstMeaningfulLine(splitFrontMatter(text).body).split("\\n")[0];
    const colonLabels = text.includes("\n") && DIAGRAM_HEADER.test(head) && !/^(?:flowchart|graph)\b/i.test(head);
    text = unescapeNewlines(text, colonLabels);
  }

  const { front, body } = splitFrontMatter(text);
  if (!DIAGRAM_HEADER.test(firstMeaningfulLine(body)) && LOOKS_LIKE_FLOWCHART.test(body)) {
    text = `${front}flowchart TD\n${body.replace(/^\n+/, "")}`;
  }
  return text;
}
