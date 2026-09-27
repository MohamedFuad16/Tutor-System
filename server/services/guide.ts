/**
 * Living study guide synthesis.
 *
 * After conversation turns (debounced), the smart model reads the compact
 * current guide plus only the messages it has not seen yet and returns atomic
 * patch operations. The server applies them with deterministic merge rules
 * (stable ids, de-duplication, caps), so the guide grows coherently instead of
 * being regenerated. Every few syncs a consolidation pass rewrites the guide
 * into a clean learning path. One sync per book at a time (KeyedDebouncer).
 *
 * Every prose field is stored without em or en dashes (plainText), and a
 * guide written in an older style (StudyGuide.style) is rewritten once by a
 * consolidation pass on its next sync.
 */
import {
  GUIDE_FORMATS,
  GUIDE_STYLE,
  normalizeKey,
  plainText,
  slugify,
  type GuideCallout,
  type GuideConcept,
  type GuideFormat,
  type GuideFormula,
  type GuideSection,
  type GuideTerm,
  type GuideWorked,
  type StudyGuide,
} from "../../shared/guide.js";
import { repairMermaid } from "../../shared/mermaid.js";
import type { ChatMessage } from "../../shared/types.js";
import { KeyedDebouncer, type EventHub } from "../lib/events.js";
import { Priority } from "../lib/limiter.js";
import { errorMessage, log } from "../lib/log.js";
import { parseJsonObject, type LlmProvider } from "../providers/llm.js";
import type { Store } from "../store/index.js";
import { guideConsolidatePrompt, guideSyncPrompt } from "./prompts.js";

const LIMITS = {
  sections: 24,
  keyPoints: 8,
  selfCheck: 4,
  callouts: 4,
  concepts: 60,
  edges: 90,
  glossary: 60,
  misconceptions: 20,
  goals: 6,
  nextSteps: 5,
  terms: 8,
  formulas: 4,
  formulaSymbols: 8,
  workedSteps: 8,
  timeline: 12,
  mistakes: 4,
  promptChars: 16_000,
};

const ICONS = new Set([
  "idea",
  "flow",
  "code",
  "math",
  "book",
  "cpu",
  "globe",
  "beaker",
  "layers",
  "chart",
  "clock",
  "puzzle",
]);

const s = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
/** Prose: trimmed, capped and written without em or en dashes. */
const p = (value: unknown, max: number, mode: "prose" | "title" = "prose") => plainText(s(value, max), mode);
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
/** Array items as records, so a stray null or string never throws. */
const records = (value: unknown) =>
  arr(value).map((item) => (item && typeof item === "object" ? item : {}) as Record<string, unknown>);
/** LaTeX as the renderer wants it: no surrounding $…$, \(…\) or \[…\]. */
const bareLatex = (value: unknown, max: number) =>
  s(value, max)
    .replace(/^\$+|\$+$/g, "")
    .replace(/^\\[([]|\\[)\]]$/g, "")
    .trim();

/** Token-set similarity used to match near-duplicate titles and points. */
export function similarity(a: string, b: string) {
  const ta = new Set(
    normalizeKey(a)
      .split(" ")
      .filter((t) => t.length > 2),
  );
  const tb = new Set(
    normalizeKey(b)
      .split(" ")
      .filter((t) => t.length > 2),
  );
  if (!ta.size || !tb.size) return normalizeKey(a) === normalizeKey(b) ? 1 : 0;
  let shared = 0;
  for (const token of ta) if (tb.has(token)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

function mergeStrings(existing: string[], incoming: unknown, max: number, maxLen = 240) {
  const out = [...existing];
  for (const raw of arr(incoming)) {
    const value = p(raw, maxLen);
    if (!value) continue;
    if (out.some((item) => normalizeKey(item) === normalizeKey(value) || similarity(item, value) > 0.85)) continue;
    out.push(value);
  }
  return out.slice(-max);
}

/** Terms and glossary entries: keyed by the term, a repeated term updates its definition. */
function mergeTerms(existing: GuideTerm[], incoming: unknown, max: number, termMax: number, definitionMax: number) {
  const out = existing.map((entry) => ({ ...entry }));
  for (const item of records(incoming)) {
    const term = p(item.term, termMax);
    const definition = p(item.definition, definitionMax);
    if (!term || !definition) continue;
    const found = out.find((entry) => normalizeKey(entry.term) === normalizeKey(term));
    if (found) found.definition = definition;
    else out.push({ term, definition });
  }
  return out.slice(-max);
}

/** Mistakes and misconceptions: a near-duplicate wrong belief is skipped. */
function mergeMistakes(
  existing: Array<{ wrong: string; right: string }>,
  incoming: unknown,
  max: number,
  wrongMax: number,
  rightMax: number,
) {
  const out = [...existing];
  for (const item of records(incoming)) {
    const wrong = p(item.wrong, wrongMax);
    const right = p(item.right, rightMax);
    if (!wrong || !right || out.some((entry) => similarity(entry.wrong, wrong) > 0.8)) continue;
    out.push({ wrong, right });
  }
  return out.slice(-max);
}

/** Formulas are keyed by their LaTeX (ignoring spaces); a repeat refreshes its name and symbols. */
function mergeFormulas(existing: GuideFormula[], incoming: unknown) {
  const out = existing.map((formula) => ({ ...formula }));
  const key = (latex: string) => latex.replace(/\s+/g, "");
  for (const item of records(incoming)) {
    const latex = bareLatex(item.latex, 400);
    if (!latex) continue;
    const name = p(item.name, 80);
    const symbols = records(item.symbols)
      .map((symbol) => ({ symbol: bareLatex(symbol.symbol, 40), meaning: p(symbol.meaning, 160) }))
      .filter((symbol) => symbol.symbol && symbol.meaning)
      .slice(0, LIMITS.formulaSymbols);
    const found = out.find((formula) => key(formula.latex) === key(latex));
    if (found) {
      if (name) found.name = name;
      if (symbols.length) found.symbols = symbols;
    } else {
      out.push(name ? { name, latex, symbols } : { latex, symbols });
    }
  }
  return out.slice(-LIMITS.formulas);
}

/** A worked example is replaced as a whole, and only by one with a problem and at least one step. */
function readWorked(value: unknown): GuideWorked | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const problem = p(item.problem, 600);
  const steps = records(item.steps)
    .map((step) => ({ label: p(step.label, 90), work: p(step.work, 600) }))
    .filter((step) => step.label || step.work)
    .slice(0, LIMITS.workedSteps);
  if (!problem || !steps.length) return null;
  return { problem, steps, answer: p(item.answer, 300) };
}

const YEAR = /\b(\d{3,4})\b/;
const BEFORE_COMMON_ERA = /\bB\.?\s?C\.?(?:E\.?)?(?=[\s,.;)]|$)/i;

/** Timeline events are added (skipping repeats), then kept in year order when every event has one. */
function mergeTimeline(existing: Array<{ when: string; what: string }>, incoming: unknown) {
  const out = [...existing];
  for (const item of records(incoming)) {
    const when = p(item.when, 40);
    const what = p(item.what, 240);
    if (!when || !what) continue;
    if (out.some((entry) => normalizeKey(entry.when) === normalizeKey(when) && similarity(entry.what, what) > 0.8)) {
      continue;
    }
    out.push({ when, what });
  }
  const capped = out.slice(-LIMITS.timeline);
  const sortable = capped.every((entry) => YEAR.test(entry.when) && !BEFORE_COMMON_ERA.test(entry.when));
  const year = (when: string) => Number(YEAR.exec(when)?.[1] ?? 0);
  return sortable ? [...capped].sort((a, b) => year(a.when) - year(b.when)) : capped;
}

type DocLabelMap = Map<string, string>;

export type GuideOp = Record<string, unknown> & { op?: string };

/** Pure merge step: applies model-proposed operations to a guide. Exported for tests. */
export function applyGuideOps(guide: StudyGuide, ops: GuideOp[], docLabels: DocLabelMap = new Map()): StudyGuide {
  const next: StudyGuide = structuredClone(guide);
  const now = Date.now();

  const ensureConcept = (name: string, kind: GuideConcept["kind"] = "supporting", blurb = ""): GuideConcept | null => {
    const label = s(name, 60);
    if (!label) return null;
    const existing = next.concepts.find((concept) => normalizeKey(concept.label) === normalizeKey(label));
    if (existing) {
      if (!existing.blurb && blurb) existing.blurb = p(blurb, 200);
      if (kind === "core" && existing.kind !== "core") existing.kind = "core";
      return existing;
    }
    if (next.concepts.length >= LIMITS.concepts) return null;
    let id = slugify(label, "concept");
    while (next.concepts.some((concept) => concept.id === id)) id = `${id}-2`;
    const concept: GuideConcept = { id, label, kind, blurb: p(blurb, 200) };
    next.concepts.push(concept);
    return concept;
  };

  for (const op of ops) {
    switch (op.op) {
      case "set_overview": {
        const title = p(op.title, 80, "title");
        const summary = p(op.summary, 800);
        if (title) next.title = title;
        if (summary) next.summary = summary;
        if (arr(op.goals).length) next.goals = mergeStrings([], op.goals, LIMITS.goals, 160);
        break;
      }
      case "upsert_section": {
        const title = p(op.title, 90, "title");
        const id = s(op.id, 80);
        let section =
          (id && next.sections.find((candidate) => candidate.id === id)) ||
          (title && next.sections.find((candidate) => similarity(candidate.title, title) >= 0.75)) ||
          null;
        if (!section) {
          if (!title || next.sections.length >= LIMITS.sections) break;
          // A given id is kept (consolidation preserves ids, so saved self-check ratings survive).
          let newId = slugify(id || title, "section");
          while (next.sections.some((candidate) => candidate.id === newId)) newId = `${newId}-2`;
          section = {
            id: newId,
            title,
            icon: "idea",
            tldr: "",
            keyPoints: [],
            explanation: "",
            callouts: [],
            selfCheck: [],
            conceptIds: [],
            sourcePages: [],
            updatedAt: now,
          } satisfies GuideSection;
          next.sections.push(section);
        }
        const icon = s(op.icon, 20);
        if (ICONS.has(icon)) section.icon = icon;
        const format = s(op.format, 20) as GuideFormat;
        if (GUIDE_FORMATS.includes(format)) section.format = format;
        const objective = p(op.objective, 200);
        if (objective) section.objective = objective;
        const tldr = p(op.tldr, 300);
        if (tldr) section.tldr = tldr;
        const explanation = p(op.explanation, 1600);
        if (explanation) section.explanation = explanation;
        section.keyPoints = mergeStrings(section.keyPoints, op.keyPoints, LIMITS.keyPoints);
        const terms = mergeTerms(section.terms ?? [], op.terms, LIMITS.terms, 80, 300);
        if (terms.length) section.terms = terms;
        const formulas = mergeFormulas(section.formulas ?? [], op.formulas);
        if (formulas.length) section.formulas = formulas;
        const worked = readWorked(op.worked);
        if (worked) section.worked = worked;
        const timeline = mergeTimeline(section.timeline ?? [], op.timeline);
        if (timeline.length) section.timeline = timeline;
        const mistakes = mergeMistakes(section.mistakes ?? [], op.mistakes, LIMITS.mistakes, 240, 300);
        if (mistakes.length) section.mistakes = mistakes;
        const diagram = op.diagram as { mermaid?: unknown; caption?: unknown } | null | undefined;
        const mermaid = diagram ? repairMermaid(s(diagram.mermaid, 4000)) : "";
        if (diagram && mermaid) section.diagram = { mermaid, caption: p(diagram.caption, 200) };
        const example = op.example as { title?: unknown; body?: unknown } | null | undefined;
        if (example && s(example.body, 2000)) {
          section.example = { title: p(example.title, 120) || "Example", body: p(example.body, 2000) };
        }
        for (const callout of records(op.callouts)) {
          const text = p(callout.text, 300);
          const kind = (
            ["tip", "warning", "remember"].includes(String(callout.kind)) ? callout.kind : "tip"
          ) as GuideCallout["kind"];
          if (!text || section.callouts.some((existing) => similarity(existing.text, text) > 0.8)) continue;
          section.callouts.push({ kind, text });
        }
        section.callouts = section.callouts.slice(-LIMITS.callouts);
        for (const item of records(op.selfCheck)) {
          const q = p(item.q, 300);
          const a = p(item.a, 600);
          if (!q || !a || section.selfCheck.some((existing) => similarity(existing.q, q) > 0.8)) continue;
          section.selfCheck.push({ q, a });
        }
        section.selfCheck = section.selfCheck.slice(-LIMITS.selfCheck);
        for (const name of arr(op.concepts)) {
          const concept = ensureConcept(String(name), "core");
          if (concept && !section.conceptIds.includes(concept.id)) section.conceptIds.push(concept.id);
        }
        for (const raw of arr(op.pages)) {
          const ref = raw as { doc?: unknown; page?: unknown };
          const documentId = docLabels.get(String(ref.doc ?? "").toUpperCase());
          const page = Math.floor(Number(ref.page));
          if (!documentId || !(page > 0)) continue;
          if (!section.sourcePages.some((existing) => existing.documentId === documentId && existing.page === page)) {
            section.sourcePages.push({ documentId, page });
          }
        }
        section.sourcePages = section.sourcePages.slice(-8);
        section.updatedAt = now;
        break;
      }
      case "add_concepts": {
        for (const raw of arr(op.concepts)) {
          const item = raw as { name?: unknown; kind?: unknown; blurb?: unknown };
          const kind = (
            ["core", "supporting", "example"].includes(String(item.kind)) ? item.kind : "supporting"
          ) as GuideConcept["kind"];
          ensureConcept(String(item.name ?? ""), kind, s(item.blurb, 200));
        }
        for (const raw of arr(op.links)) {
          const link = raw as { from?: unknown; to?: unknown; label?: unknown };
          const from = ensureConcept(String(link.from ?? ""));
          const to = ensureConcept(String(link.to ?? ""));
          if (!from || !to || from.id === to.id) continue;
          if (next.edges.some((edge) => edge.from === from.id && edge.to === to.id)) continue;
          if (next.edges.length >= LIMITS.edges) break;
          next.edges.push({ from: from.id, to: to.id, label: s(link.label, 40) || undefined });
        }
        break;
      }
      case "add_glossary": {
        next.glossary = mergeTerms(next.glossary, op.items, LIMITS.glossary, 80, 400);
        break;
      }
      case "add_misconceptions": {
        next.misconceptions = mergeMistakes(next.misconceptions, op.items, LIMITS.misconceptions, 300, 400);
        break;
      }
      case "set_next_steps": {
        const steps = mergeStrings([], op.items, LIMITS.nextSteps, 200);
        if (steps.length) next.nextSteps = steps;
        break;
      }
      default:
        break;
    }
  }
  // Drop edges whose endpoints disappeared.
  const ids = new Set(next.concepts.map((concept) => concept.id));
  next.edges = next.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  return next;
}

/** Validates a fully rewritten guide from the consolidation pass; falls back to the original on any doubt. */
export function sanitizeConsolidated(original: StudyGuide, candidate: unknown): StudyGuide {
  const raw = candidate as Partial<StudyGuide> | null;
  if (!raw || !Array.isArray(raw.sections) || raw.sections.length === 0) return original;
  const rebuilt = applyGuideOps(
    { ...original, sections: [], concepts: [], edges: [], glossary: [], misconceptions: [] },
    [
      { op: "set_overview", title: raw.title, summary: raw.summary, goals: raw.goals },
      {
        op: "add_concepts",
        concepts: arr(raw.concepts).map((c: any) => ({ name: c?.label, kind: c?.kind, blurb: c?.blurb })),
        links: arr(raw.edges).map((e: any) => {
          const label = (id: unknown) => arr(raw.concepts).find((c: any) => c?.id === id) as any;
          return { from: label(e?.from)?.label, to: label(e?.to)?.label, label: e?.label };
        }),
      },
      ...arr(raw.sections).map((section: any) => ({
        op: "upsert_section",
        id: section?.id,
        title: section?.title,
        icon: section?.icon,
        format: section?.format,
        objective: section?.objective,
        tldr: section?.tldr,
        keyPoints: section?.keyPoints,
        explanation: section?.explanation,
        terms: section?.terms,
        formulas: section?.formulas,
        worked: section?.worked,
        timeline: section?.timeline,
        diagram: section?.diagram,
        example: section?.example,
        callouts: section?.callouts,
        mistakes: section?.mistakes,
        selfCheck: section?.selfCheck,
        concepts: arr(section?.conceptIds).map(
          (id) => (arr(raw.concepts).find((c: any) => c?.id === id) as any)?.label ?? id,
        ),
      })),
      { op: "add_glossary", items: raw.glossary },
      { op: "add_misconceptions", items: raw.misconceptions },
      { op: "set_next_steps", items: raw.nextSteps },
    ],
  );
  // Keep source pages from the original sections that survived (same id, or a similar title).
  for (const section of rebuilt.sections) {
    const before =
      original.sections.find((old) => old.id === section.id) ??
      original.sections.find((old) => similarity(old.title, section.title) >= 0.75);
    if (before) {
      section.sourcePages = before.sourcePages;
      if (!section.diagram && before.diagram) section.diagram = before.diagram;
    }
  }
  // A consolidation that loses most of the content is rejected.
  if (rebuilt.sections.length < Math.ceil(original.sections.length * 0.4)) return original;
  return rebuilt;
}

/** What the sync model sees of the current guide: enough to update it, not the full text. Empty fields are left out. */
function compactGuide(guide: StudyGuide) {
  const some = <T>(items: T[] | undefined) => (items?.length ? items : undefined);
  return {
    title: guide.title,
    summary: guide.summary,
    sections: guide.sections.map((section) => ({
      id: section.id,
      title: section.title,
      format: section.format,
      objective: section.objective,
      tldr: section.tldr,
      keyPoints: section.keyPoints,
      explanation: section.explanation.slice(0, 300),
      terms: some(section.terms?.map((entry) => entry.term)),
      formulas: some(section.formulas?.map((formula) => formula.name || formula.latex)),
      hasWorked: section.worked ? true : undefined,
      timelineEvents: section.timeline?.length || undefined,
      hasDiagram: Boolean(section.diagram),
      mistakes: some(section.mistakes?.map((entry) => entry.wrong)),
      selfCheck: section.selfCheck.map((item) => item.q),
    })),
    concepts: guide.concepts.map((concept) => concept.label),
    glossary: guide.glossary.map((entry) => entry.term),
    misconceptions: guide.misconceptions.map((entry) => entry.wrong),
  };
}

function transcript(messages: ChatMessage[], budget: number) {
  const lines: string[] = [];
  let used = 0;
  let lastIncluded = -1;
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const who = message.role === "user" ? "Learner" : "Tutor";
    const body = message.content.length > 2200 ? `${message.content.slice(0, 2200)}…` : message.content;
    const quiz = message.parts.find((part) => part.type === "quiz");
    const extra =
      quiz && quiz.type === "quiz" && quiz.result
        ? `\n[Quiz on ${quiz.quiz.concept}: learner ${quiz.result.correct ? "answered correctly" : "struggled"}]`
        : "";
    const line = `${who}${message.channel === "voice" ? " (voice)" : ""}: ${body}${extra}`;
    if (used + line.length > budget && lines.length) break;
    lines.push(line);
    used += line.length;
    lastIncluded = i;
  }
  return { text: lines.join("\n\n"), lastIncluded };
}

export function createGuideService(deps: {
  store: Store;
  llm: LlmProvider;
  events: EventHub;
  debounceMs: number;
  maxPendingMessages: number;
}) {
  const { store, llm, events } = deps;
  const owners = new Map<string, { userId: string; language: string }>();
  /** Books whose one-time rewrite into the current style failed: not retried until restart. */
  const restyleTried = new Set<string>();

  async function sync(bookId: string) {
    const owner = owners.get(bookId);
    if (!owner) return;
    const book = store.library.getBook(owner.userId, bookId);
    if (!book) return;
    const { guide, coveredSeq, syncs } = store.guides.get(bookId, book.title);
    const fresh = store.messages.since(bookId, coveredSeq, 80);
    // A guide written in an older style is rewritten once in the current one.
    const restyle = (guide.style ?? 1) < GUIDE_STYLE && guide.sections.length > 0 && !restyleTried.has(bookId);
    if (!fresh.length) {
      if (restyle) await restyleOnly(owner, bookId, guide, coveredSeq, syncs);
      return;
    }
    events.publish(owner.userId, { type: "guide.syncing", bookId });

    const { text, lastIncluded } = transcript(fresh, LIMITS.promptChars);
    const docs = store.library.listDocuments(owner.userId, bookId);
    const docLabels: DocLabelMap = new Map(docs.map((doc, index) => [`D${index + 1}`, doc.id]));
    const docList = docs.map((doc, index) => `D${index + 1}: ${doc.title}`).join("\n") || "(no documents)";
    const started = Date.now();
    try {
      const request = {
        role: "smart" as const,
        purpose: "guide.sync",
        userId: owner.userId,
        priority: Priority.batch,
        reasoning: "low" as const,
        temperature: 0.3,
        maxTokens: 6000,
        json: true,
        messages: [
          { role: "system" as const, content: guideSyncPrompt(owner.language) },
          {
            role: "user" as const,
            content: `Documents:\n${docList}\n\nCurrent guide:\n${JSON.stringify(compactGuide(guide))}\n\nNew messages:\n${text}`,
          },
        ],
      };
      const completion = await llm.complete(request);
      let parsed = parseJsonObject<{ ops?: GuideOp[] }>(completion.text);
      if (!parsed) {
        // Usually a stray unescaped quote (e.g. inside Mermaid labels): ask once for a clean reply.
        log.warn("guide.sync_bad_json", {
          bookId,
          chars: completion.text.length,
          head: completion.text.slice(0, 160),
          tail: completion.text.slice(-160),
        });
        const retry = await llm.complete({
          ...request,
          messages: [
            ...request.messages,
            { role: "assistant", content: completion.text.slice(0, 12_000) },
            {
              role: "user",
              content:
                "That was not valid JSON. Reply again with ONLY the JSON object, escaping every double quote inside strings (use single quotes in Mermaid labels).",
            },
          ],
        });
        parsed = parseJsonObject<{ ops?: GuideOp[] }>(retry.text);
      }
      if (!parsed) throw new Error("Guide sync returned no JSON");
      let next = applyGuideOps(guide, arr(parsed.ops) as GuideOp[], docLabels);
      next.bookId = bookId;
      next.version = guide.version + 1;
      next.updatedAt = Date.now();
      next.messagesCovered = guide.messagesCovered + lastIncluded + 1;
      if (!next.title || next.title === "Study guide") next.title = book.title;

      // Periodic consolidation keeps the guide tidy as it grows (and rewrites an old style).
      if (restyle || ((syncs + 1) % 6 === 0 && next.sections.length >= 5)) {
        const consolidated = await consolidate(owner, next);
        if (consolidated !== next) next = { ...consolidated, style: GUIDE_STYLE };
        else if (restyle) restyleTried.add(bookId);
      }

      const newSeq = (fresh[lastIncluded] as ChatMessage & { seq: number }).seq;
      store.guides.save(owner.userId, next, newSeq, syncs + 1);
      mirrorToLearnerModel(owner.userId, bookId, next);
      if (next.title && next.title !== guide.title) store.library.suggestBookTitle(owner.userId, bookId, next.title);
      events.publish(owner.userId, { type: "guide.updated", bookId, version: next.version });
      log.info("guide.synced", {
        bookId,
        version: next.version,
        ops: arr(parsed.ops).length,
        ms: Date.now() - started,
      });

      // More messages than fit in one prompt: continue right away.
      if (lastIncluded < fresh.length - 1) debouncer.trigger(bookId, 0, true);
    } catch (error) {
      log.warn("guide.sync_failed", { bookId, error: errorMessage(error) });
      events.publish(owner.userId, { type: "guide.updated", bookId, version: guide.version });
    }
  }

  async function consolidate(owner: { userId: string; language: string }, guide: StudyGuide): Promise<StudyGuide> {
    try {
      const completion = await llm.complete({
        role: "smart",
        purpose: "guide.consolidate",
        userId: owner.userId,
        priority: Priority.batch,
        reasoning: "low",
        temperature: 0.2,
        maxTokens: 16000,
        json: true,
        messages: [
          { role: "system", content: guideConsolidatePrompt(owner.language) },
          {
            role: "user",
            content: JSON.stringify({ ...guide, bookId: undefined, version: undefined, style: undefined }),
          },
        ],
      });
      const candidate = parseJsonObject(completion.text);
      const result = sanitizeConsolidated(guide, candidate);
      // Rejected rewrite: hand back the very same object so callers can tell.
      if (result === guide) return guide;
      return {
        ...result,
        bookId: guide.bookId,
        version: guide.version,
        updatedAt: guide.updatedAt,
        messagesCovered: guide.messagesCovered,
      };
    } catch (error) {
      log.warn("guide.consolidate_failed", { error: errorMessage(error) });
      return guide;
    }
  }

  /** No new messages, but the guide is in an older style: rewrite it once, keeping what it covers. */
  async function restyleOnly(
    owner: { userId: string; language: string },
    bookId: string,
    guide: StudyGuide,
    coveredSeq: number,
    syncs: number,
  ) {
    events.publish(owner.userId, { type: "guide.syncing", bookId });
    const started = Date.now();
    const rewritten = await consolidate(owner, guide);
    if (rewritten === guide) {
      restyleTried.add(bookId);
      log.warn("guide.restyle_failed", { bookId });
      events.publish(owner.userId, { type: "guide.updated", bookId, version: guide.version });
      return;
    }
    const next: StudyGuide = { ...rewritten, style: GUIDE_STYLE, version: guide.version + 1, updatedAt: Date.now() };
    store.guides.save(owner.userId, next, coveredSeq, syncs);
    mirrorToLearnerModel(owner.userId, bookId, next);
    events.publish(owner.userId, { type: "guide.updated", bookId, version: next.version });
    log.info("guide.restyled", { bookId, version: next.version, ms: Date.now() - started });
  }

  /** Concepts and self-check questions become learner-model rows and flashcards. */
  function mirrorToLearnerModel(userId: string, bookId: string, guide: StudyGuide) {
    for (const concept of guide.concepts) store.learning.ensureConcept(userId, bookId, concept.label, concept.blurb);
    const cards = guide.sections.flatMap((section) =>
      section.selfCheck.map((item) => ({
        front: item.q,
        back: item.a,
        concept: guide.concepts.find((concept) => concept.id === section.conceptIds[0])?.label,
      })),
    );
    store.learning.addCards(userId, bookId, cards);
  }

  const debouncer = new KeyedDebouncer(sync);

  return {
    /** Called after every conversation turn. */
    noteActivity(userId: string, bookId: string, language = "en") {
      owners.set(bookId, { userId, language });
      const { coveredSeq } = store.guides.get(bookId);
      const pending = store.messages.countSince(bookId, coveredSeq).n;
      debouncer.trigger(bookId, deps.debounceMs, pending >= deps.maxPendingMessages);
    },
    /** Explicit "update now" from the Revision view. */
    syncNow(userId: string, bookId: string, language = "en") {
      owners.set(bookId, { userId, language });
      debouncer.trigger(bookId, 0, true);
    },
    isSyncing: (bookId: string) => debouncer.isBusy(bookId),
    stop: () => debouncer.cancelAll(),
    /** Test hook. */
    sync,
  };
}

export type GuideService = ReturnType<typeof createGuideService>;
