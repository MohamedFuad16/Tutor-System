/**
 * Visual study guide: the living notebook each book keeps. The server
 * synthesises it from the conversation in the background and the Revision
 * view renders it. Stable ids let incremental updates merge coherently.
 *
 * Sections are written like a teacher's revision notes, in a format that
 * suits the subject (a worked example for maths, a timeline for history, …).
 * Every subject field is optional, so older guides stay valid.
 */

export type GuideConceptKind = "core" | "supporting" | "example";

export type GuideConcept = {
  id: string;
  label: string;
  kind: GuideConceptKind;
  /** One-line definition shown on hover / in the glossary. */
  blurb: string;
};

export type GuideEdge = {
  from: string;
  to: string;
  label?: string;
};

export type GuideCallout = {
  kind: "tip" | "warning" | "remember";
  text: string;
};

/** How a section is written, picked from its subject. */
export type GuideFormat = "concept" | "math" | "science" | "process" | "history" | "language" | "code";

export const GUIDE_FORMATS: readonly GuideFormat[] = [
  "concept",
  "math",
  "science",
  "process",
  "history",
  "language",
  "code",
];

/** Writing-style version. Bump it when the style changes: older guides are rewritten once. */
export const GUIDE_STYLE = 2;

export type GuideTerm = { term: string; definition: string };

export type GuideFormula = {
  name?: string;
  /** LaTeX without the surrounding $ signs. */
  latex: string;
  symbols: Array<{ symbol: string; meaning: string }>;
};

export type GuideWorked = {
  problem: string;
  /** Each label says the goal of the step; `work` shows how (markdown, math allowed). */
  steps: Array<{ label: string; work: string }>;
  answer: string;
};

export type GuideSection = {
  id: string;
  title: string;
  /** Emoji-free icon keyword the UI maps to an icon (e.g. "cpu", "flow"). */
  icon: string;
  format?: GuideFormat;
  /** What the learner can do after this section ("Calculate speed from distance and time"). */
  objective?: string;
  /** One sentence: the idea in plain words. */
  tldr: string;
  keyPoints: string[];
  /** Short markdown explanation (a paragraph or two). */
  explanation: string;
  terms?: GuideTerm[];
  formulas?: GuideFormula[];
  worked?: GuideWorked;
  timeline?: Array<{ when: string; what: string }>;
  diagram?: { mermaid: string; caption: string };
  example?: { title: string; body: string };
  callouts: GuideCallout[];
  mistakes?: Array<{ wrong: string; right: string }>;
  selfCheck: Array<{ q: string; a: string }>;
  conceptIds: string[];
  sourcePages: Array<{ documentId: string; page: number }>;
  updatedAt: number;
};

export type StudyGuide = {
  bookId: string;
  version: number;
  updatedAt: number;
  title: string;
  /** The big picture in 2-3 sentences. */
  summary: string;
  goals: string[];
  concepts: GuideConcept[];
  edges: GuideEdge[];
  sections: GuideSection[];
  glossary: Array<{ term: string; definition: string }>;
  misconceptions: Array<{ wrong: string; right: string }>;
  nextSteps: string[];
  /** How many conversation messages have been folded in. */
  messagesCovered: number;
  /** Writing-style version (see GUIDE_STYLE). Missing means the first style. */
  style?: number;
};

export const emptyGuide = (bookId: string, title = "Study guide"): StudyGuide => ({
  bookId,
  version: 0,
  updatedAt: 0,
  title,
  summary: "",
  goals: [],
  concepts: [],
  edges: [],
  sections: [],
  glossary: [],
  misconceptions: [],
  nextSteps: [],
  messagesCovered: 0,
  style: GUIDE_STYLE,
});

/** Lowercase, accent-free, punctuation-free key for de-duplication. */
export function normalizeKey(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function slugify(text: string, fallback = "item") {
  const slug = normalizeKey(text).replace(/\s+/g, "-").slice(0, 60);
  return slug || fallback;
}

/** Code and math spans, which plainText leaves exactly as written. */
const PROTECTED = /```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/g;
/** Private-use placeholders: a protected span, and a dash that becomes a comma. */
const HOLD = "";
const PAUSE = "";

/**
 * Plain-language dash cleaner for study-guide text: no em or en dashes.
 * Ranges become "3 to 5", "**Term** — …" becomes "**Term**: …" and other
 * dashes become commas (in "title" mode the first spaced dash becomes a
 * colon). Hyphens, arrows and anything inside code or math are untouched.
 */
export function plainText(text: string, mode: "prose" | "title" = "prose"): string {
  if (!text || !/[–—]/.test(text)) return text;
  const held: string[] = [];
  let out = text.replace(PROTECTED, (span) => {
    held.push(span);
    return `${HOLD}${held.length - 1}${HOLD}`;
  });
  out = out
    // Ranges: "3–5" reads as "3 to 5". A spaced dash between numbers is a minus sign.
    .replace(/(\d)[–—](?=\d)/g, "$1 to ")
    .replace(/(\d)[ \t]+[–—][ \t]+(?=\d)/g, "$1 - ")
    // "**Term** — meaning" is a definition.
    .replace(/(\*\*[^*\n]+\*\*)[ \t]*[–—][ \t]*/g, "$1: ")
    // A dash that starts or ends a line carries no meaning.
    .replace(/^([ \t]*)[–—]+[ \t]*/gm, "$1")
    .replace(/[ \t]*[–—]+[ \t]*$/gm, "");
  if (mode === "title") out = out.replace(/[ \t]+[–—][ \t]+/, ": ");
  out = out
    // Compound names ("Michaelis–Menten") keep a plain hyphen.
    .replace(/(\p{L})–(?=\p{L})/gu, "$1-")
    // Every other dash is a pause, and a comma reads the same.
    .replace(/[ \t]*[–—]+[ \t]*/g, PAUSE)
    .replace(new RegExp(`${PAUSE}+`, "g"), PAUSE)
    .replace(new RegExp(`\\(${PAUSE}`, "g"), "(")
    .replace(new RegExp(`([.,:;!?])${PAUSE}`, "g"), "$1 ")
    .replace(new RegExp(`${PAUSE}(?=[.,:;!?)]|$)`, "gm"), "")
    .replace(new RegExp(PAUSE, "g"), ", ");
  return out.replace(new RegExp(`${HOLD}(\\d+)${HOLD}`, "g"), (_m, index: string) => held[Number(index)]);
}
