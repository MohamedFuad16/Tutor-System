/**
 * Living study guide synthesis.
 *
 * After conversation turns (debounced), the smart model reads the compact
 * current guide plus only the messages it has not seen yet and returns atomic
 * patch operations. The server applies them with deterministic merge rules
 * (stable ids, de-duplication, caps), so the guide grows coherently instead of
 * being regenerated. Every few syncs a consolidation pass rewrites the guide
 * into a clean learning path. One sync per book at a time (KeyedDebouncer).
 */
import {
  normalizeKey,
  slugify,
  type GuideCallout,
  type GuideConcept,
  type GuideSection,
  type StudyGuide,
} from "../../shared/guide.js";
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
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

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
    const value = s(raw, maxLen);
    if (!value) continue;
    if (out.some((item) => normalizeKey(item) === normalizeKey(value) || similarity(item, value) > 0.85)) continue;
    out.push(value);
  }
  return out.slice(-max);
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
      if (!existing.blurb && blurb) existing.blurb = s(blurb, 200);
      if (kind === "core" && existing.kind !== "core") existing.kind = "core";
      return existing;
    }
    if (next.concepts.length >= LIMITS.concepts) return null;
    let id = slugify(label, "concept");
    while (next.concepts.some((concept) => concept.id === id)) id = `${id}-2`;
    const concept: GuideConcept = { id, label, kind, blurb: s(blurb, 200) };
    next.concepts.push(concept);
    return concept;
  };

  for (const op of ops) {
    switch (op.op) {
      case "set_overview": {
        if (s(op.title, 80)) next.title = s(op.title, 80);
        if (s(op.summary, 800)) next.summary = s(op.summary, 800);
        if (arr(op.goals).length) next.goals = mergeStrings([], op.goals, LIMITS.goals, 160);
        break;
      }
      case "upsert_section": {
        const title = s(op.title, 90);
        const id = s(op.id, 80);
        let section =
          (id && next.sections.find((candidate) => candidate.id === id)) ||
          (title && next.sections.find((candidate) => similarity(candidate.title, title) >= 0.75)) ||
          null;
        if (!section) {
          if (!title || next.sections.length >= LIMITS.sections) break;
          let newId = slugify(title, "section");
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
        if (s(op.tldr, 300)) section.tldr = s(op.tldr, 300);
        if (s(op.explanation, 1600)) section.explanation = s(op.explanation, 1600);
        section.keyPoints = mergeStrings(section.keyPoints, op.keyPoints, LIMITS.keyPoints);
        const diagram = op.diagram as { mermaid?: unknown; caption?: unknown } | null | undefined;
        if (diagram && s(diagram.mermaid, 4000)) {
          section.diagram = { mermaid: s(diagram.mermaid, 4000), caption: s(diagram.caption, 200) };
        }
        const example = op.example as { title?: unknown; body?: unknown } | null | undefined;
        if (example && s(example.body, 2000)) {
          section.example = { title: s(example.title, 120) || "Example", body: s(example.body, 2000) };
        }
        for (const raw of arr(op.callouts)) {
          const callout = raw as { kind?: unknown; text?: unknown };
          const text = s(callout.text, 300);
          const kind = (
            ["tip", "warning", "remember"].includes(String(callout.kind)) ? callout.kind : "tip"
          ) as GuideCallout["kind"];
          if (!text || section.callouts.some((existing) => similarity(existing.text, text) > 0.8)) continue;
          section.callouts.push({ kind, text });
        }
        section.callouts = section.callouts.slice(-LIMITS.callouts);
        for (const raw of arr(op.selfCheck)) {
          const item = raw as { q?: unknown; a?: unknown };
          const q = s(item.q, 300);
          const a = s(item.a, 600);
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
        for (const raw of arr(op.items)) {
          const item = raw as { term?: unknown; definition?: unknown };
          const term = s(item.term, 80);
          const definition = s(item.definition, 400);
          if (!term || !definition) continue;
          const existing = next.glossary.find((entry) => normalizeKey(entry.term) === normalizeKey(term));
          if (existing) existing.definition = definition;
          else next.glossary.push({ term, definition });
        }
        next.glossary = next.glossary.slice(-LIMITS.glossary);
        break;
      }
      case "add_misconceptions": {
        for (const raw of arr(op.items)) {
          const item = raw as { wrong?: unknown; right?: unknown };
          const wrong = s(item.wrong, 300);
          const right = s(item.right, 400);
          if (!wrong || !right || next.misconceptions.some((entry) => similarity(entry.wrong, wrong) > 0.8)) continue;
          next.misconceptions.push({ wrong, right });
        }
        next.misconceptions = next.misconceptions.slice(-LIMITS.misconceptions);
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
        title: section?.title,
        icon: section?.icon,
        tldr: section?.tldr,
        keyPoints: section?.keyPoints,
        explanation: section?.explanation,
        diagram: section?.diagram,
        example: section?.example,
        callouts: section?.callouts,
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
  // Keep source pages from the original sections that survived by title.
  for (const section of rebuilt.sections) {
    const before = original.sections.find((old) => similarity(old.title, section.title) >= 0.75);
    if (before) {
      section.sourcePages = before.sourcePages;
      if (!section.diagram && before.diagram) section.diagram = before.diagram;
    }
  }
  // A consolidation that loses most of the content is rejected.
  if (rebuilt.sections.length < Math.ceil(original.sections.length * 0.4)) return original;
  return rebuilt;
}

function compactGuide(guide: StudyGuide) {
  return {
    title: guide.title,
    summary: guide.summary,
    sections: guide.sections.map((section) => ({
      id: section.id,
      title: section.title,
      tldr: section.tldr,
      keyPoints: section.keyPoints,
      explanation: section.explanation.slice(0, 300),
      hasDiagram: Boolean(section.diagram),
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

  async function sync(bookId: string) {
    const owner = owners.get(bookId);
    if (!owner) return;
    const book = store.library.getBook(owner.userId, bookId);
    if (!book) return;
    const { guide, coveredSeq, syncs } = store.guides.get(bookId, book.title);
    const fresh = store.messages.since(bookId, coveredSeq, 80);
    if (!fresh.length) return;
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

      // Periodic consolidation keeps the guide tidy as it grows.
      if ((syncs + 1) % 6 === 0 && next.sections.length >= 5) next = await consolidate(owner, next);

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
        maxTokens: 12000,
        json: true,
        messages: [
          { role: "system", content: guideConsolidatePrompt(owner.language) },
          { role: "user", content: JSON.stringify({ ...guide, bookId: undefined, version: undefined }) },
        ],
      });
      const candidate = parseJsonObject(completion.text);
      const result = sanitizeConsolidated(guide, candidate);
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
