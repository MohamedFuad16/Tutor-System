import type { Flashcard, PersistentConcept } from "./longterm.memory";
import { bktEngine } from "./bkt.engine";
import type { BrainRuntimeSettings } from "../lib/brainRuntimeSettings";

type RevisionEvidenceEngine = {
  updateConceptAttempt: (
    conceptId: string,
    isCorrect: boolean,
    type: "generation",
    options: {
      attemptId: string;
      evidenceContract: "flashcard_review_v1";
      userId?: string;
      source?: string;
      summary?: string;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<PersistentConcept | null>;
};

type RevisionEvidenceOptions = {
  engine?: RevisionEvidenceEngine;
  userId?: string;
  runtimeSettings?: Partial<BrainRuntimeSettings> | null;
};

export type FlashcardReviewEvidenceResult = {
  status: "recorded" | "skipped_no_concept" | "missing_concept";
  conceptId?: string;
  correct: boolean;
  evidenceType: "generation";
};

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

export const flashcardEvidenceConceptId = (
  card: Pick<Flashcard, "conceptId">,
) => {
  const conceptId = compact(card.conceptId || "");
  if (!conceptId || conceptId === "general") return null;
  return conceptId;
};

export const flashcardReviewOutcome = (quality: number) => ({
  correct: quality >= 4,
  evidenceType: "generation" as const,
});

export const flashcardReviewSummary = (
  card: Pick<Flashcard, "front">,
  quality: number,
) => {
  const prompt = compact(card.front || "Untitled flashcard").slice(0, 160);
  return `Flashcard review scored ${quality}/5 for "${prompt}"`;
};

export const recordFlashcardReviewEvidence = async (
  card: Flashcard,
  quality: number,
  engineOrOptions: RevisionEvidenceEngine | RevisionEvidenceOptions = {},
): Promise<FlashcardReviewEvidenceResult> => {
  const options =
    "updateConceptAttempt" in engineOrOptions
      ? { engine: engineOrOptions }
      : engineOrOptions;
  const engine = options.engine || bktEngine;
  const conceptId = flashcardEvidenceConceptId(card);
  const outcome = flashcardReviewOutcome(quality);

  if (!conceptId) {
    return {
      status: "skipped_no_concept",
      correct: outcome.correct,
      evidenceType: outcome.evidenceType,
    };
  }

  const updatedConcept = await engine.updateConceptAttempt(
    conceptId,
    outcome.correct,
    outcome.evidenceType,
    {
      attemptId: `flashcard-review:${card.id}:${Date.now()}`,
      evidenceContract: "flashcard_review_v1",
      userId: options.userId,
      source: "revision_flashcard",
      summary: flashcardReviewSummary(card, quality),
      metadata: {
        flashcardId: card.id,
        bookId: card.bookId,
        bookTitle: card.bookTitle,
        userId: options.userId,
        quality,
        runtimeSettings: options.runtimeSettings || undefined,
      },
    },
  );

  return {
    status: updatedConcept ? "recorded" : "missing_concept",
    conceptId,
    correct: outcome.correct,
    evidenceType: outcome.evidenceType,
  };
};
