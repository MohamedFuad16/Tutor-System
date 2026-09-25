/**
 * Tools the tutor models can call. Each tool validates its own arguments,
 * does the work, and returns (a) text for the model and (b) optional UI parts
 * that ride along with the assistant message.
 */
import type { MessagePart, QuizItem } from "../../shared/types.js";
import { newId } from "../store/db.js";
import type { Store } from "../store/index.js";
import type { Search } from "../providers/search.js";
import type { ToolDefinition } from "../providers/llm.js";

export type ToolContext = {
  userId: string;
  bookId: string;
  language: string;
  store: Store;
  search: Search;
};

export type ToolResult = { content: string; parts?: MessagePart[] };

type Tool = {
  definition: ToolDefinition;
  status: (args: Record<string, unknown>) => string;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

/** Quiz copy that is safe to send before grading: no answer, no explanation. */
export function publicQuiz(quiz: QuizItem): QuizItem {
  return { ...quiz, answer: "", explanation: "", answerIndex: -1 };
}

const str = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export const TOOLS: Record<string, Tool> = {
  search_document: {
    definition: {
      name: "search_document",
      description:
        "Search the learner's uploaded documents for passages about a topic. Use when the provided passages do not cover the question.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Keywords or a short question." } },
        required: ["query"],
      },
    },
    status: (args) => `Searching your documents for "${str(args.query, 60)}"`,
    async run(args, ctx) {
      const hits = ctx.store.retrieval.search(ctx.userId, ctx.bookId, str(args.query, 300), 5);
      if (!hits.length) return { content: "No matching passages in the documents." };
      const docs = ctx.store.library.listDocuments(ctx.userId, ctx.bookId);
      const label = (id: string) => `D${docs.findIndex((doc) => doc.id === id) + 1}`;
      return {
        content: hits
          .map(
            (hit) => `<passage ref="${label(hit.documentId)} p.${hit.page}">\n${hit.text.slice(0, 1000)}\n</passage>`,
          )
          .join("\n"),
        parts: [
          {
            type: "sources",
            sources: hits.map((hit) => ({
              documentId: hit.documentId,
              documentTitle: hit.documentTitle,
              page: hit.page,
              snippet: hit.text.slice(0, 160),
            })),
          },
        ],
      };
    },
  },

  show_images: {
    definition: {
      name: "show_images",
      description:
        "Find and show real pictures to the learner (e.g. anatomy, organisms, places, artworks, devices, historical photos, physical phenomena). Only when seeing it genuinely helps.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Concrete image search query, e.g. 'mitochondria electron micrograph'.",
          },
        },
        required: ["query"],
      },
    },
    status: (args) => `Finding images of ${str(args.query, 60)}`,
    async run(args, ctx) {
      const query = str(args.query, 200);
      const images = await ctx.search.images(query, 6);
      if (!images.length) return { content: `No images found for "${query}".` };
      return {
        content: `Showing ${images.length} images to the learner: ${images.map((image) => image.title).join("; ")}. Refer to them naturally; do not list URLs.`,
        parts: [{ type: "images", query, images }],
      };
    },
  },

  web_search: {
    definition: {
      name: "web_search",
      description:
        "Search the web for facts that are not in the documents: recent events, statistics, definitions from outside the material, or when the learner asks to look something up.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    status: (args) => `Searching the web for "${str(args.query, 60)}"`,
    async run(args, ctx) {
      const results = await ctx.search.web(str(args.query, 240), 5, ctx.language);
      if (!results.length) return { content: "The web search returned no results." };
      return {
        content:
          results
            .map((result, index) => `[W${index + 1}] ${result.title} (${result.domain})\n${result.snippet ?? ""}`)
            .join("\n\n") + "\n\nCite web facts as [W1], [W2] ...",
        parts: [{ type: "web", sources: results }],
      };
    },
  },

  create_quiz: {
    definition: {
      name: "create_quiz",
      description:
        "Pose one check-your-understanding question as an interactive card. Use after explaining a key idea, when the learner seems ready. Prefer 3-4 plausible multiple-choice options; omit options for a short free-text answer.",
      parameters: {
        type: "object",
        properties: {
          concept: { type: "string", description: "The concept being checked, 1-4 words." },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" }, description: "3-4 options, or empty for free text." },
          answer_index: { type: "integer", description: "Index of the correct option; -1 for free text." },
          answer: { type: "string", description: "The correct answer in words." },
          explanation: { type: "string", description: "Why it is correct, 1-2 sentences." },
        },
        required: ["concept", "question", "answer", "explanation"],
      },
    },
    status: () => "Preparing a quick check",
    async run(args, ctx) {
      const options = Array.isArray(args.options)
        ? args.options
            .map((option) => str(option, 200))
            .filter(Boolean)
            .slice(0, 5)
        : [];
      let answerIndex = Number.isInteger(args.answer_index) ? Number(args.answer_index) : -1;
      if (options.length < 2) answerIndex = -1;
      if (answerIndex >= options.length) answerIndex = -1;
      if (options.length >= 2 && answerIndex < 0) {
        const answer = str(args.answer, 300).toLowerCase();
        answerIndex = options.findIndex((option) => option.toLowerCase() === answer);
      }
      const quiz: QuizItem = {
        id: newId("quiz"),
        concept: str(args.concept, 80) || "Key idea",
        question: str(args.question, 600),
        options: answerIndex >= 0 ? options : [],
        answerIndex: answerIndex >= 0 ? answerIndex : -1,
        answer: str(args.answer, 600),
        explanation: str(args.explanation, 800),
      };
      if (!quiz.question || !quiz.answer) return { content: "Quiz rejected: question and answer are required." };
      ctx.store.learning.ensureConcept(ctx.userId, ctx.bookId, quiz.concept);
      ctx.store.learning.saveQuiz(ctx.userId, ctx.bookId, quiz);
      // The client never receives the answer until the learner submits.
      return {
        content: "The quiz card is now shown to the learner. Do not reveal the answer; invite them to try it.",
        parts: [{ type: "quiz", quiz: publicQuiz(quiz) }],
      };
    },
  },

  make_flashcards: {
    definition: {
      name: "make_flashcards",
      description:
        "Save flashcards for spaced review when the learner asks for flashcards or wants to memorise something.",
      parameters: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: { front: { type: "string" }, back: { type: "string" }, concept: { type: "string" } },
              required: ["front", "back"],
            },
          },
        },
        required: ["cards"],
      },
    },
    status: () => "Saving flashcards",
    async run(args, ctx) {
      const cards = Array.isArray(args.cards)
        ? args.cards
            .slice(0, 20)
            .map((card: any) => ({
              front: str(card?.front, 500),
              back: str(card?.back, 1200),
              concept: str(card?.concept, 80) || undefined,
            }))
        : [];
      const added = ctx.store.learning.addCards(ctx.userId, ctx.bookId, cards);
      return {
        content: `Saved ${added} new flashcards (duplicates skipped). Tell the learner they are in Revision.`,
        parts: [
          {
            type: "task",
            taskId: newId("task"),
            title: `Saved ${added} flashcard${added === 1 ? "" : "s"} to Revision`,
            status: "done",
          },
        ],
      };
    },
  },
};

export const CHAT_TOOL_NAMES = [
  "search_document",
  "show_images",
  "web_search",
  "create_quiz",
  "make_flashcards",
] as const;

export function toolDefinitions(names: readonly string[]): ToolDefinition[] {
  return names.map((name) => TOOLS[name].definition);
}

export function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
