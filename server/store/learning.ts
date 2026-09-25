/**
 * Learner model: concepts with Bayesian Knowledge Tracing mastery, graded
 * attempts, quizzes, and spaced-repetition flashcards.
 *
 * Mastery only moves on graded evidence (quiz answers, flashcard reviews),
 * never because a model said the learner "understands" something.
 */
import { normalizeKey, slugify } from "../../shared/guide.js";
import type { ConceptState, Flashcard, QuizItem, QuizResult, ReviewGrade } from "../../shared/types.js";
import { newId, now, type Db } from "./db.js";

const DAY = 86_400_000;

/** Standard BKT parameters; guess depends on the question format. */
const BKT = { slip: 0.1, transit: 0.12 };

export function bktUpdate(prior: number, score: number, guess: number): number {
  const p = Math.min(0.99, Math.max(0.01, prior));
  const postCorrect = (p * (1 - BKT.slip)) / (p * (1 - BKT.slip) + (1 - p) * guess);
  const postWrong = (p * BKT.slip) / (p * BKT.slip + (1 - p) * (1 - guess));
  // Partial credit interpolates between the two posteriors.
  const posterior = postWrong + (postCorrect - postWrong) * Math.min(1, Math.max(0, score));
  return Math.min(0.99, posterior + (1 - posterior) * BKT.transit * score);
}

/** SM-2 style scheduling with a short relearning step for lapses. */
export function scheduleCard(card: Pick<Flashcard, "intervalDays" | "ease" | "reps" | "lapses">, grade: ReviewGrade) {
  let { intervalDays, ease, reps, lapses } = card;
  if (grade === "again") {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 0;
    return { intervalDays, ease, reps, lapses, dueAt: now() + 10 * 60_000 };
  }
  if (grade === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    intervalDays = reps === 0 ? 0.5 : Math.max(1, intervalDays * 1.2);
  } else if (grade === "good") {
    intervalDays = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, intervalDays * ease);
  } else {
    ease = Math.min(3, ease + 0.15);
    intervalDays = reps === 0 ? 3 : Math.max(2, intervalDays * ease * 1.3);
  }
  reps += 1;
  intervalDays = Math.min(365, intervalDays);
  return { intervalDays, ease, reps, lapses, dueAt: now() + intervalDays * DAY };
}

type ConceptRow = {
  id: string;
  book_id: string;
  name: string;
  summary: string;
  mastery: number;
  attempts: number;
  correct: number;
  last_seen_at: number;
  due_at: number | null;
};

const toConcept = (row: ConceptRow): ConceptState => ({
  id: row.id,
  bookId: row.book_id,
  name: row.name,
  summary: row.summary,
  mastery: row.mastery,
  attempts: row.attempts,
  correct: row.correct,
  lastSeenAt: row.last_seen_at,
  dueAt: row.due_at,
});

type CardRow = {
  id: string;
  book_id: string;
  concept_id: string | null;
  concept_name: string | null;
  front: string;
  back: string;
  due_at: number;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
};

const toCard = (row: CardRow): Flashcard => ({
  id: row.id,
  bookId: row.book_id,
  conceptId: row.concept_id ?? undefined,
  conceptName: row.concept_name ?? undefined,
  front: row.front,
  back: row.back,
  dueAt: row.due_at,
  intervalDays: row.interval_days,
  ease: row.ease,
  reps: row.reps,
  lapses: row.lapses,
});

export function createLearningRepo(db: Db) {
  const stmts = {
    upsertConcept: db.prepare(
      `INSERT INTO concepts (id, user_id, book_id, slug, name, summary, last_seen_at, created_at)
       VALUES (@id, @userId, @bookId, @slug, @name, @summary, @now, @now)
       ON CONFLICT(book_id, slug) DO UPDATE SET
         name = excluded.name,
         summary = CASE WHEN length(excluded.summary) > 0 THEN excluded.summary ELSE concepts.summary END,
         last_seen_at = excluded.last_seen_at`,
    ),
    conceptBySlug: db.prepare(`SELECT * FROM concepts WHERE book_id = ? AND slug = ?`),
    conceptById: db.prepare(`SELECT * FROM concepts WHERE id = ? AND user_id = ?`),
    conceptsForBook: db.prepare(`SELECT * FROM concepts WHERE book_id = ? AND user_id = ? ORDER BY mastery ASC, name`),
    conceptsForUser: db.prepare(`SELECT * FROM concepts WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT ?`),
    setMastery: db.prepare(
      `UPDATE concepts SET mastery = @mastery, attempts = attempts + 1, correct = correct + @correct,
         last_seen_at = @now, due_at = @dueAt WHERE id = @id`,
    ),
    insertAttempt: db.prepare(
      `INSERT INTO attempts (id, user_id, book_id, concept_id, kind, prompt, answer, correct, score, created_at)
       VALUES (@id, @userId, @bookId, @conceptId, @kind, @prompt, @answer, @correct, @score, @now)`,
    ),
    insertQuiz: db.prepare(
      `INSERT INTO quizzes (id, user_id, book_id, message_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ),
    getQuiz: db.prepare(`SELECT * FROM quizzes WHERE id = ? AND user_id = ?`),
    setQuizResult: db.prepare(`UPDATE quizzes SET result_json = ?, message_id = COALESCE(message_id, ?) WHERE id = ?`),
    attachQuizMessage: db.prepare(`UPDATE quizzes SET message_id = ? WHERE id = ?`),

    insertCard: db.prepare(
      `INSERT OR IGNORE INTO cards (id, user_id, book_id, concept_id, front, back, due_at, source_key, created_at)
       VALUES (@id, @userId, @bookId, @conceptId, @front, @back, @dueAt, @sourceKey, @now)`,
    ),
    cardSelect: db.prepare(
      `SELECT k.*, c.name AS concept_name FROM cards k LEFT JOIN concepts c ON c.id = k.concept_id
       WHERE k.user_id = @userId AND (@bookId IS NULL OR k.book_id = @bookId)
         AND (@dueOnly = 0 OR k.due_at <= @now)
       ORDER BY k.due_at ASC LIMIT @limit`,
    ),
    getCard: db.prepare(`SELECT k.*, NULL AS concept_name FROM cards k WHERE k.id = ? AND k.user_id = ?`),
    updateCard: db.prepare(
      `UPDATE cards SET due_at = @dueAt, interval_days = @intervalDays, ease = @ease, reps = @reps, lapses = @lapses
       WHERE id = @id`,
    ),
    minCardDue: db.prepare(`SELECT MIN(due_at) AS due FROM cards WHERE concept_id = ?`),
  };

  const repo = {
    /** Ensures a concept row exists for a (book, name) pair and returns it. */
    ensureConcept(userId: string, bookId: string, name: string, summary = ""): ConceptState {
      const slug = slugify(name, "concept");
      stmts.upsertConcept.run({
        id: newId("con"),
        userId,
        bookId,
        slug,
        name: name.trim().slice(0, 80),
        summary: summary.slice(0, 400),
        now: now(),
      });
      return toConcept(stmts.conceptBySlug.get(bookId, slug) as ConceptRow);
    },

    findConcept(bookId: string, name: string): ConceptState | null {
      const row = stmts.conceptBySlug.get(bookId, slugify(name, "concept")) as ConceptRow | undefined;
      return row ? toConcept(row) : null;
    },

    conceptsForBook(userId: string, bookId: string) {
      return (stmts.conceptsForBook.all(bookId, userId) as ConceptRow[]).map(toConcept);
    },

    conceptsForUser(userId: string, limit = 500) {
      return (stmts.conceptsForUser.all(userId, limit) as ConceptRow[]).map(toConcept);
    },

    /** Records a graded attempt and moves mastery with BKT. */
    recordAttempt(input: {
      userId: string;
      bookId: string;
      conceptName?: string;
      conceptId?: string;
      kind: "quiz" | "flashcard" | "self_check";
      prompt: string;
      answer: string;
      score: number;
      guess: number;
    }) {
      const concept = input.conceptId
        ? (stmts.conceptById.get(input.conceptId, input.userId) as ConceptRow | undefined)
        : input.conceptName
          ? (() => {
              const state = repo.ensureConcept(input.userId, input.bookId, input.conceptName!);
              return stmts.conceptById.get(state.id, input.userId) as ConceptRow;
            })()
          : undefined;
      const correct = input.score >= 0.6;
      let mastery: number | undefined;
      db.transaction(() => {
        stmts.insertAttempt.run({
          id: newId("att"),
          userId: input.userId,
          bookId: input.bookId,
          conceptId: concept?.id ?? null,
          kind: input.kind,
          prompt: input.prompt.slice(0, 1000),
          answer: input.answer.slice(0, 2000),
          correct: correct ? 1 : 0,
          score: input.score,
          now: now(),
        });
        if (concept) {
          mastery = bktUpdate(concept.mastery, input.score, input.guess);
          const cardDue = (stmts.minCardDue.get(concept.id) as { due: number | null }).due;
          // Revisit weak concepts soon, strong ones later.
          const conceptDue = now() + (mastery < 0.5 ? 1 : mastery < 0.8 ? 3 : 10) * DAY;
          stmts.setMastery.run({
            id: concept.id,
            mastery,
            correct: correct ? 1 : 0,
            now: now(),
            dueAt: cardDue ? Math.min(cardDue, conceptDue) : conceptDue,
          });
        }
      })();
      return { correct, mastery, conceptId: concept?.id };
    },

    saveQuiz(userId: string, bookId: string, quiz: QuizItem, messageId?: string) {
      stmts.insertQuiz.run(quiz.id, userId, bookId, messageId ?? null, JSON.stringify(quiz), now());
    },

    attachQuizMessage(quizId: string, messageId: string) {
      stmts.attachQuizMessage.run(messageId, quizId);
    },

    getQuiz(
      userId: string,
      quizId: string,
    ): { quiz: QuizItem; bookId: string; messageId: string | null; result: QuizResult | null } | null {
      const row = stmts.getQuiz.get(quizId, userId) as
        | { payload_json: string; book_id: string; message_id: string | null; result_json: string | null }
        | undefined;
      if (!row) return null;
      return {
        quiz: JSON.parse(row.payload_json),
        bookId: row.book_id,
        messageId: row.message_id,
        result: row.result_json ? JSON.parse(row.result_json) : null,
      };
    },

    saveQuizResult(quizId: string, result: QuizResult) {
      stmts.setQuizResult.run(JSON.stringify(result), null, quizId);
    },

    /** Adds flashcards, skipping ones whose question already exists in the book. */
    addCards(userId: string, bookId: string, cards: Array<{ front: string; back: string; concept?: string }>) {
      let added = 0;
      db.transaction(() => {
        for (const card of cards) {
          if (!card.front?.trim() || !card.back?.trim()) continue;
          const concept = card.concept ? repo.ensureConcept(userId, bookId, card.concept) : null;
          const result = stmts.insertCard.run({
            id: newId("card"),
            userId,
            bookId,
            conceptId: concept?.id ?? null,
            front: card.front.trim().slice(0, 500),
            back: card.back.trim().slice(0, 1200),
            dueAt: now(),
            sourceKey: normalizeKey(card.front).slice(0, 160),
            now: now(),
          });
          added += result.changes;
        }
      })();
      return added;
    },

    listCards(userId: string, options: { bookId?: string; dueOnly?: boolean; limit?: number } = {}) {
      return (
        stmts.cardSelect.all({
          userId,
          bookId: options.bookId ?? null,
          dueOnly: options.dueOnly ? 1 : 0,
          now: now(),
          limit: options.limit ?? 200,
        }) as CardRow[]
      ).map(toCard);
    },

    reviewCard(userId: string, cardId: string, grade: ReviewGrade) {
      const row = stmts.getCard.get(cardId, userId) as CardRow | undefined;
      if (!row) return null;
      const next = scheduleCard(toCard(row), grade);
      stmts.updateCard.run({ id: cardId, ...next });
      const score = grade === "again" ? 0 : grade === "hard" ? 0.6 : 1;
      const attempt = repo.recordAttempt({
        userId,
        bookId: row.book_id,
        conceptId: row.concept_id ?? undefined,
        kind: "flashcard",
        prompt: row.front,
        answer: grade,
        score,
        guess: 0.2,
      });
      return { card: { ...toCard(row), ...next }, mastery: attempt.mastery };
    },
  };
  return repo;
}

export type LearningRepo = ReturnType<typeof createLearningRepo>;
