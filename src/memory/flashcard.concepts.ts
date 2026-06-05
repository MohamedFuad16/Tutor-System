import {
  db,
  type Flashcard,
  type LearningBookConcept,
  type PersistentConcept,
} from "./longterm.memory";
import { clamp01 } from "./evidence.mastery";

type GeneratedFlashcardInput = {
  front?: unknown;
  back?: unknown;
  conceptId?: unknown;
};

type FlashcardStorageContext = {
  id: string;
  bookId?: string | null;
  bookTitle?: string;
  nextReviewAt?: number;
  learningBookConcepts?: LearningBookConcept[];
};

type FlashcardConceptResolution = {
  conceptId: string;
  linkedConcept?: LearningBookConcept;
  reason:
    | "explicit"
    | "explicit_learning_book"
    | "matched_learning_book"
    | "unresolved";
};

const PLACEHOLDER_CONCEPT_IDS = new Set(["general", "none", "unknown"]);

const compact = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForMatch = (value: unknown) =>
  compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsConceptPhrase = (haystack: string, phrase: string) => {
  const normalizedPhrase = normalizeForMatch(phrase);
  if (normalizedPhrase.length < 4) return false;
  return ` ${haystack} `.includes(` ${normalizedPhrase} `);
};

export const normalizeGeneratedConceptId = (value: unknown) => {
  const conceptId = compact(value);
  if (!conceptId) return null;
  if (PLACEHOLDER_CONCEPT_IDS.has(conceptId.toLowerCase())) return null;
  return conceptId;
};

export const chooseFlashcardConcept = (
  card: GeneratedFlashcardInput,
  concepts: LearningBookConcept[] = [],
): FlashcardConceptResolution => {
  const explicitConceptId = normalizeGeneratedConceptId(card.conceptId);
  if (explicitConceptId) {
    const linkedConcept = concepts.find(
      (concept) => concept.id === explicitConceptId,
    );
    return {
      conceptId: explicitConceptId,
      linkedConcept,
      reason: linkedConcept ? "explicit_learning_book" : "explicit",
    };
  }

  const cardText = normalizeForMatch(
    `${compact(card.front)} ${compact(card.back)}`,
  );
  const matchedConcept = concepts
    .filter((concept) => containsConceptPhrase(cardText, concept.name))
    .sort(
      (a, b) =>
        normalizeForMatch(b.name).length - normalizeForMatch(a.name).length,
    )[0];

  if (matchedConcept) {
    return {
      conceptId: matchedConcept.id,
      linkedConcept: matchedConcept,
      reason: "matched_learning_book",
    };
  }

  return { conceptId: "general", reason: "unresolved" };
};

export const persistentConceptFromLearningBookConcept = (
  concept: LearningBookConcept,
  timestamp = Date.now(),
): PersistentConcept => ({
  id: concept.id,
  name: concept.name,
  description: concept.summary,
  mastery: 0,
  confidence: clamp01(concept.confidence, 0),
  p_learn: 0.2,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: concept.parentConcepts,
  relatedConcepts: concept.childConcepts,
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: timestamp,
  firstLearnedAt: concept.firstSeenAt || timestamp,
  linkedAnnotations: [],
});

export const ensurePersistentConceptForLearningBookConcept = async (
  concept?: LearningBookConcept,
) => {
  if (!concept) return null;
  const existing = await db.concepts.get(concept.id);
  if (existing) return existing;

  const persistentConcept = persistentConceptFromLearningBookConcept(concept);
  await db.concepts.put(persistentConcept);
  return persistentConcept;
};

export const ensurePersistentConceptForLearningBookConceptId = async (
  conceptId?: string,
) => {
  const normalizedConceptId = normalizeGeneratedConceptId(conceptId);
  if (!normalizedConceptId) return null;

  const existing = await db.concepts.get(normalizedConceptId);
  if (existing) return existing;

  const learningBookConcept = await db.learningBookConcepts
    .get(normalizedConceptId)
    .catch((): null => null);
  return ensurePersistentConceptForLearningBookConcept(
    learningBookConcept || undefined,
  );
};

export const createFlashcardForStorage = async (
  card: GeneratedFlashcardInput,
  context: FlashcardStorageContext,
) => {
  const learningBookConcepts =
    context.learningBookConcepts ||
    (context.bookId
      ? await db.learningBookConcepts
          .where("bookId")
          .equals(context.bookId)
          .toArray()
          .catch((): LearningBookConcept[] => [])
      : []);
  const resolution = chooseFlashcardConcept(card, learningBookConcepts);
  await ensurePersistentConceptForLearningBookConcept(resolution.linkedConcept);

  const flashcard: Flashcard = {
    id: context.id,
    conceptId: resolution.conceptId,
    bookId: context.bookId || undefined,
    bookTitle: context.bookTitle || undefined,
    front: compact(card.front),
    back: compact(card.back),
    nextReviewAt: context.nextReviewAt || Date.now(),
  };

  return { flashcard, resolution };
};
