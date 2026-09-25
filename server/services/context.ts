/**
 * Builds the grounding packet for a tutor turn. Chat and voice share this, so
 * both see the same book, page, passages and learner state.
 *
 * Budgeting matters: the voice foreground needs a small packet for low
 * time-to-first-token, typed chat can afford more.
 */
import type { SourceRef, StudyDocument } from "../../shared/types.js";
import type { Store } from "../store/index.js";

export type ContextFocus = { documentId?: string; page?: number; selection?: string };

export type ContextPacket = {
  /** Text block appended to the system prompt. */
  text: string;
  /** Passages offered to the model, for citation chips in the UI. */
  sources: SourceRef[];
  /** Document index labels used in citations, e.g. D1 → id. */
  documentLabels: Array<{ label: string; id: string; title: string }>;
  learnerLevel: "new" | "developing" | "confident";
};

export type ContextBudget = { pageChars: number; passageChars: number; passages: number };

export const CHAT_BUDGET: ContextBudget = { pageChars: 4000, passageChars: 4500, passages: 6 };
export const VOICE_BUDGET: ContextBudget = { pageChars: 1800, passageChars: 1800, passages: 3 };

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

export function buildContext(
  store: Store,
  input: { userId: string; bookId: string; query: string; focus?: ContextFocus; budget?: ContextBudget },
): ContextPacket {
  const budget = input.budget ?? CHAT_BUDGET;
  const book = store.library.getBook(input.userId, input.bookId);
  const documents = store.library.listDocuments(input.userId, input.bookId).filter((doc) => doc.status === "ready");
  const labels = documents.map((doc, index) => ({ label: `D${index + 1}`, id: doc.id, title: doc.title }));
  const labelFor = (documentId: string) => labels.find((entry) => entry.id === documentId)?.label ?? "D?";
  const sections: string[] = [];
  const sources: SourceRef[] = [];

  sections.push(`# Notebook: ${book?.title ?? "Study notebook"}`);
  if (documents.length) {
    sections.push(
      `## Documents\n${documents
        .map((doc: StudyDocument) => `- ${labelFor(doc.id)}: "${doc.title}" (${doc.pageCount} pages)`)
        .join("\n")}`,
    );
  } else {
    sections.push(
      "## Documents\nNo documents uploaded yet. Answer from general knowledge and suggest uploading material.",
    );
  }

  // What the learner is looking at right now.
  const focusDoc = input.focus?.documentId ? documents.find((doc) => doc.id === input.focus!.documentId) : undefined;
  let focusPage: number | undefined;
  if (focusDoc && input.focus?.page) {
    focusPage = Math.min(Math.max(1, Math.floor(input.focus.page)), Math.max(1, focusDoc.pageCount));
    const pageText = store.library.getPageText(focusDoc.id, focusPage);
    const label = labelFor(focusDoc.id);
    sections.push(
      `## Currently open: ${label} "${focusDoc.title}", page ${focusPage} of ${focusDoc.pageCount}\n` +
        (pageText
          ? `<page ref="${label} p.${focusPage}">\n${clip(pageText, budget.pageChars)}\n</page>`
          : "(This page has no readable text.)"),
    );
    if (pageText)
      sources.push({
        documentId: focusDoc.id,
        documentTitle: focusDoc.title,
        page: focusPage,
        snippet: clip(pageText, 160),
      });
  }

  if (input.focus?.selection?.trim()) {
    sections.push(
      `## The learner highlighted this passage\n> ${clip(input.focus.selection.trim(), 1500).replace(/\n/g, "\n> ")}`,
    );
  }

  // Retrieved passages from anywhere in the notebook.
  if (documents.length && input.query.trim()) {
    const query = [input.query, input.focus?.selection ?? ""].join(" ");
    const hits = store.retrieval
      .search(input.userId, input.bookId, query, budget.passages + 2)
      .filter((hit) => !(focusDoc && hit.documentId === focusDoc.id && hit.page === focusPage));
    let used = 0;
    const passages: string[] = [];
    for (const hit of hits) {
      if (passages.length >= budget.passages) break;
      const text = clip(hit.text, Math.min(1200, budget.passageChars - used));
      if (text.length < 80) break;
      used += text.length;
      passages.push(`<passage ref="${labelFor(hit.documentId)} p.${hit.page}">\n${text}\n</passage>`);
      sources.push({
        documentId: hit.documentId,
        documentTitle: hit.documentTitle,
        page: hit.page,
        snippet: clip(hit.text, 160),
      });
    }
    if (passages.length) sections.push(`## Relevant passages\n${passages.join("\n")}`);
  }

  // Learner model: weakest and strongest concepts steer the explanation depth.
  const concepts = store.learning.conceptsForBook(input.userId, input.bookId);
  const assessed = concepts.filter((concept) => concept.attempts > 0);
  const average = assessed.length ? assessed.reduce((sum, c) => sum + c.mastery, 0) / assessed.length : 0;
  const learnerLevel: ContextPacket["learnerLevel"] = !assessed.length
    ? "new"
    : average < 0.55
      ? "developing"
      : "confident";
  if (concepts.length) {
    const weak = concepts.filter((c) => c.attempts > 0 && c.mastery < 0.6).slice(0, 5);
    const strong = concepts.filter((c) => c.mastery >= 0.8).slice(0, 5);
    const lines = [
      `Level: ${learnerLevel}${assessed.length ? ` (average mastery ${Math.round(average * 100)}%)` : ""}`,
    ];
    if (weak.length)
      lines.push(`Shaky on: ${weak.map((c) => `${c.name} (${Math.round(c.mastery * 100)}%)`).join(", ")}`);
    if (strong.length) lines.push(`Solid on: ${strong.map((c) => c.name).join(", ")}`);
    const untested = concepts.filter((c) => c.attempts === 0).slice(0, 6);
    if (untested.length) lines.push(`Discussed but never checked: ${untested.map((c) => c.name).join(", ")}`);
    sections.push(`## Learner model\n${lines.join("\n")}`);
  }

  const { guide } = store.guides.get(input.bookId);
  if (guide.summary) sections.push(`## Study guide so far\n${clip(guide.summary, 600)}`);

  return { text: sections.join("\n\n"), sources, documentLabels: labels, learnerLevel };
}

export function adaptiveGuidance(level: ContextPacket["learnerLevel"]) {
  switch (level) {
    case "new":
      return "The learner is new to this material: build intuition first, define terms plainly, use one concrete example before any formalism.";
    case "developing":
      return "The learner is still building understanding: revisit shaky concepts briefly when relevant, use scaffolded steps, and check understanding with a quick question after key ideas.";
    default:
      return "The learner is confident: be concise, go deeper, connect ideas, and pose a harder transfer question now and then.";
  }
}
