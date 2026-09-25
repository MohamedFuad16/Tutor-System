/**
 * Activity ledger and analytics aggregation.
 */
import type { AnalyticsSummary } from "../../shared/types.js";
import type { LlmCallRecord } from "../lib/metrics.js";
import { now, type Db } from "./db.js";

export type ActivityKind = "chat" | "voice_seconds" | "review" | "upload" | "study_seconds" | "quiz";

const DAY = 86_400_000;

const dayKey = (timestamp: number, offsetMinutes: number) =>
  new Date(timestamp - offsetMinutes * 60_000).toISOString().slice(0, 10);

export function createActivityRepo(db: Db) {
  const stmts = {
    insert: db.prepare(`INSERT INTO activity (user_id, book_id, kind, amount, created_at) VALUES (?, ?, ?, ?, ?)`),
    since: db.prepare(`SELECT kind, amount, created_at FROM activity WHERE user_id = ? AND created_at >= ?`),
    allDays: db.prepare(
      `SELECT DISTINCT created_at FROM activity WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC`,
    ),
    usage: db.prepare(
      `INSERT INTO llm_usage (user_id, day, model, purpose, calls, input_tokens, output_tokens, total_ms)
       VALUES (@userId, @day, @model, @purpose, 1, @input, @output, @ms)
       ON CONFLICT(user_id, day, model, purpose) DO UPDATE SET calls = calls + 1,
         input_tokens = input_tokens + @input, output_tokens = output_tokens + @output, total_ms = total_ms + @ms`,
    ),
    usageForUser: db.prepare(
      `SELECT model, purpose, SUM(calls) AS calls, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens,
         SUM(total_ms) AS totalMs FROM llm_usage WHERE user_id = ? AND day >= ? GROUP BY model, purpose ORDER BY calls DESC`,
    ),
    documentCount: db.prepare(`SELECT COUNT(*) AS n FROM documents WHERE user_id = ?`),
    cardsDue: db.prepare(`SELECT COUNT(*) AS n FROM cards WHERE user_id = ? AND due_at <= ?`),
    concepts: db.prepare(
      `SELECT id, book_id AS bookId, name, summary, mastery, attempts, correct, last_seen_at AS lastSeenAt, due_at AS dueAt
       FROM concepts WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 400`,
    ),
    books: db.prepare(
      `SELECT b.id, b.title,
         (SELECT COUNT(*) FROM concepts c WHERE c.book_id = b.id) AS concepts,
         COALESCE((SELECT AVG(mastery) FROM concepts c WHERE c.book_id = b.id), 0) AS mastery,
         (SELECT COUNT(*) FROM messages m WHERE m.book_id = b.id) AS messages
       FROM books b WHERE b.user_id = ? ORDER BY b.updated_at DESC`,
    ),
    attemptsSince: db.prepare(`SELECT correct, created_at FROM attempts WHERE user_id = ? AND created_at >= ?`),
  };

  return {
    record(userId: string, kind: ActivityKind, amount = 1, bookId?: string) {
      stmts.insert.run(userId, bookId ?? null, kind, amount, now());
    },

    recordLlmUsage(record: LlmCallRecord) {
      if (!record.userId) return;
      stmts.usage.run({
        userId: record.userId,
        day: new Date().toISOString().slice(0, 10),
        model: record.model,
        purpose: record.purpose,
        input: record.inputTokens,
        output: record.outputTokens,
        ms: record.ms,
      });
    },

    usage(userId: string, days = 30) {
      const from = new Date(now() - days * DAY).toISOString().slice(0, 10);
      return stmts.usageForUser.all(userId, from);
    },

    summary(userId: string, options: { days?: number; tzOffsetMinutes?: number } = {}): AnalyticsSummary {
      const days = options.days ?? 14;
      const offset = options.tzOffsetMinutes ?? 0;
      const start = now() - days * DAY;
      const rows = stmts.since.all(userId, now() - 400 * DAY) as Array<{
        kind: string;
        amount: number;
        created_at: number;
      }>;

      const daily = new Map<string, { chat: number; voice: number; reviews: number; minutes: number }>();
      for (let i = days - 1; i >= 0; i -= 1) {
        daily.set(dayKey(now() - i * DAY, offset), { chat: 0, voice: 0, reviews: 0, minutes: 0 });
      }
      let questions = 0;
      let voiceSeconds = 0;
      let studySeconds = 0;
      let reviews = 0;
      const activeDays = new Set<string>();
      for (const row of rows) {
        const key = dayKey(row.created_at, offset);
        activeDays.add(key);
        const bucket = row.created_at >= start ? daily.get(key) : undefined;
        if (row.kind === "chat") {
          questions += 1;
          if (bucket) bucket.chat += 1;
        } else if (row.kind === "voice_seconds") {
          voiceSeconds += row.amount;
          if (bucket) {
            bucket.voice += row.amount / 60;
            bucket.minutes += row.amount / 60;
          }
        } else if (row.kind === "study_seconds") {
          studySeconds += row.amount;
          if (bucket) bucket.minutes += row.amount / 60;
        } else if (row.kind === "review" || row.kind === "quiz") {
          reviews += 1;
          if (bucket) bucket.reviews += 1;
        }
      }

      // Streak: consecutive active days ending today (or yesterday).
      let streakDays = 0;
      for (let i = 0; i < 400; i += 1) {
        const key = dayKey(now() - i * DAY, offset);
        if (activeDays.has(key)) streakDays += 1;
        else if (i > 0) break;
      }

      const concepts = stmts.concepts.all(userId) as AnalyticsSummary["concepts"];
      const mastered = concepts.filter((concept) => concept.mastery >= 0.8).length;
      const averageMastery = concepts.length
        ? concepts.reduce((sum, concept) => sum + concept.mastery, 0) / concepts.length
        : 0;

      const accuracy = new Map<string, { correct: number; total: number }>();
      for (const attempt of stmts.attemptsSince.all(userId, start) as Array<{ correct: number; created_at: number }>) {
        const key = dayKey(attempt.created_at, offset);
        const entry = accuracy.get(key) ?? { correct: 0, total: 0 };
        entry.total += 1;
        entry.correct += attempt.correct;
        accuracy.set(key, entry);
      }

      return {
        generatedAt: now(),
        totals: {
          studyMinutes: Math.round((studySeconds + voiceSeconds) / 60),
          questions,
          voiceMinutes: Math.round(voiceSeconds / 60),
          documents: (stmts.documentCount.get(userId) as { n: number }).n,
          concepts: concepts.length,
          masteredConcepts: mastered,
          cardsDue: (stmts.cardsDue.get(userId, now()) as { n: number }).n,
          reviews,
          streakDays,
          averageMastery,
        },
        daily: [...daily.entries()].map(([day, value]) => ({
          day,
          chat: value.chat,
          voice: Math.round(value.voice * 10) / 10,
          reviews: value.reviews,
          minutes: Math.round(value.minutes),
        })),
        masteryBuckets: [
          { label: "New", count: concepts.filter((c) => c.mastery < 0.4).length },
          { label: "Learning", count: concepts.filter((c) => c.mastery >= 0.4 && c.mastery < 0.8).length },
          { label: "Mastered", count: mastered },
        ],
        concepts,
        books: stmts.books.all(userId) as AnalyticsSummary["books"],
        accuracyTrend: [...accuracy.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, value]) => ({ day, attempts: value.total, accuracy: value.correct / value.total })),
      };
    },
  };
}

export type ActivityRepo = ReturnType<typeof createActivityRepo>;
