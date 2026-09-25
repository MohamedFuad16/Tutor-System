/**
 * Adaptive-learning actions: grading quiz answers, reviewing flashcards,
 * and narrating diagrams (guided "tour" steps synced to speech).
 */
import { createHash } from "node:crypto";
import type { DiagramStep, QuizResult, ReviewGrade } from "../../shared/types.js";
import { Priority } from "../lib/limiter.js";
import { parseJsonObject, type LlmProvider } from "../providers/llm.js";
import type { Store } from "../store/index.js";
import { similarity } from "./guide.js";
import { DIAGRAM_TOUR_PROMPT, GRADE_PROMPT, languageName } from "./prompts.js";

/** Node ids and labels declared in a Mermaid flowchart-like source, in order. */
export function mermaidNodes(source: string): Array<{ id: string; label: string }> {
  const nodes: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();
  const reserved = new Set([
    "graph",
    "flowchart",
    "subgraph",
    "end",
    "classDef",
    "class",
    "style",
    "linkStyle",
    "click",
    "direction",
    "TD",
    "TB",
    "LR",
    "RL",
    "BT",
  ]);
  const pattern =
    /(?:^|[\s;>|&-])([A-Za-z_][\w-]*)\s*(\(\[|\[\[|\[\(|\(\(|\[\/|\[\\|\[|\(|\{\{|\{|>)\s*"?([^\]\)\}"]*)"?/g;
  for (const line of source.split("\n")) {
    if (/^\s*%%/.test(line)) continue;
    for (const match of line.matchAll(pattern)) {
      const id = match[1];
      if (reserved.has(id) || seen.has(id)) continue;
      seen.add(id);
      nodes.push({ id, label: match[3].trim() || id });
    }
  }
  // Participants / states without shape syntax (sequence and state diagrams).
  for (const match of source.matchAll(/^\s*(?:participant|actor|state)\s+"?([^"\n]+?)"?(?:\s+as\s+(\w+))?\s*$/gm)) {
    const id = (match[2] || match[1]).trim();
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({ id, label: match[1].trim() });
    }
  }
  return nodes;
}

const tourCache = new Map<string, DiagramStep[]>();

export function createLearningService(deps: { store: Store; llm: LlmProvider }) {
  const { store, llm } = deps;

  async function gradeQuiz(
    userId: string,
    quizId: string,
    answer: { choice?: number; text?: string },
    language = "en",
  ) {
    const record = store.learning.getQuiz(userId, quizId);
    if (!record) return null;
    if (record.result) return { result: record.result, quiz: record.quiz };
    const { quiz } = record;
    let score = 0;
    let feedback = quiz.explanation;
    let learnerAnswer = "";
    if (quiz.options.length && quiz.answerIndex >= 0) {
      const choice = Number(answer.choice);
      learnerAnswer = quiz.options[choice] ?? "";
      score = choice === quiz.answerIndex ? 1 : 0;
    } else {
      learnerAnswer = (answer.text ?? "").trim().slice(0, 2000);
      if (!learnerAnswer) score = 0;
      else {
        try {
          const completion = await llm.complete({
            role: "fast",
            purpose: "quiz.grade",
            userId,
            priority: Priority.interactive,
            reasoning: "off",
            temperature: 0,
            maxTokens: 400,
            json: true,
            messages: [
              { role: "system", content: `${GRADE_PROMPT}\nWrite the feedback in ${languageName(language)}.` },
              {
                role: "user",
                content: JSON.stringify({ question: quiz.question, reference: quiz.answer, learner: learnerAnswer }),
              },
            ],
          });
          const parsed = parseJsonObject<{ score?: number; feedback?: string }>(completion.text);
          score = Math.min(1, Math.max(0, Number(parsed?.score) || 0));
          if (parsed?.feedback) feedback = `${parsed.feedback} ${quiz.explanation}`.trim();
        } catch {
          // Offline fallback: lexical overlap with the reference answer.
          score =
            similarity(learnerAnswer, quiz.answer) >= 0.6 ? 1 : similarity(learnerAnswer, quiz.answer) >= 0.3 ? 0.5 : 0;
        }
      }
    }
    const attempt = store.learning.recordAttempt({
      userId,
      bookId: record.bookId,
      conceptName: quiz.concept,
      kind: "quiz",
      prompt: quiz.question,
      answer: learnerAnswer,
      score,
      guess: quiz.options.length ? 1 / Math.max(2, quiz.options.length) : 0.05,
    });
    const result: QuizResult = { quizId, correct: attempt.correct, score, feedback, mastery: attempt.mastery };
    store.learning.saveQuizResult(quizId, result);
    store.activity.record(userId, "quiz", 1, record.bookId);

    // Persist the outcome on the chat message so the thread (and the guide) see it.
    if (record.messageId) {
      const message = store.messages.get(userId, record.messageId);
      if (message) {
        message.parts = message.parts.map((part) =>
          part.type === "quiz" && part.quiz.id === quizId ? { ...part, quiz, result } : part,
        );
        store.messages.update(message);
      }
    }
    return { result, quiz };
  }

  function reviewCard(userId: string, cardId: string, grade: ReviewGrade) {
    const reviewed = store.learning.reviewCard(userId, cardId, grade);
    if (reviewed) store.activity.record(userId, "review", 1, reviewed.card.bookId);
    return reviewed;
  }

  async function diagramTour(userId: string, mermaid: string, context = "", language = "en"): Promise<DiagramStep[]> {
    const key = createHash("sha1").update(`${language}\n${mermaid}`).digest("hex");
    const cached = tourCache.get(key);
    if (cached) return cached;
    const nodes = mermaidNodes(mermaid);
    const valid = new Set(nodes.map((node) => node.id));
    let steps: DiagramStep[] = [];
    try {
      const completion = await llm.complete({
        role: "fast",
        purpose: "diagram.tour",
        userId,
        priority: Priority.interactive,
        reasoning: "off",
        temperature: 0.4,
        maxTokens: 1500,
        json: true,
        messages: [
          { role: "system", content: `${DIAGRAM_TOUR_PROMPT}\nSpeak in ${languageName(language)}.` },
          { role: "user", content: `Diagram:\n${mermaid.slice(0, 4000)}\n\nContext:\n${context.slice(0, 1500)}` },
        ],
      });
      const parsed = parseJsonObject<{ steps?: Array<{ node?: string; say?: string }> }>(completion.text);
      steps = (parsed?.steps ?? [])
        .map((step) => ({
          node: String(step.node ?? "").trim(),
          say: String(step.say ?? "")
            .trim()
            .slice(0, 400),
        }))
        .filter((step) => step.say && (!valid.size || valid.has(step.node)))
        .slice(0, 12);
    } catch {
      steps = [];
    }
    if (!steps.length) steps = nodes.slice(0, 10).map((node) => ({ node: node.id, say: node.label }));
    if (tourCache.size > 300) tourCache.delete(tourCache.keys().next().value!);
    tourCache.set(key, steps);
    return steps;
  }

  return { gradeQuiz, reviewCard, diagramTour };
}

export type LearningService = ReturnType<typeof createLearningService>;
