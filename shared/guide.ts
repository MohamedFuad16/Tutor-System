/**
 * Visual study guide: the living notebook each book keeps. The server
 * synthesises it from the conversation in the background and the Revision
 * view renders it. Stable ids let incremental updates merge coherently.
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

export type GuideSection = {
  id: string;
  title: string;
  /** Emoji-free icon keyword the UI maps to an icon (e.g. "cpu", "flow"). */
  icon: string;
  /** One sentence: the idea in plain words. */
  tldr: string;
  keyPoints: string[];
  /** Short markdown explanation (a paragraph or two). */
  explanation: string;
  diagram?: { mermaid: string; caption: string };
  example?: { title: string; body: string };
  callouts: GuideCallout[];
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
