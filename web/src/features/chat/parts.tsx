/**
 * Renderers for structured message parts: page sources, web sources, image
 * galleries, diagrams, interactive quiz cards and background task chips.
 */
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, Globe, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { ChatMessage, MessagePart, QuizItem, QuizResult, SourceRef, WebImage, WebSource } from "@shared/types";
import { Diagram } from "@/components/Diagram";
import { ThinkingOrb } from "thinking-orbs";
import { ImageReveal } from "@/components/fx/ImageReveal";
import { Button, cx, spring, Spinner } from "@/components/ui";
import { keys, queryClient, useAnswerQuiz } from "@/lib/queries";
import { useApp } from "@/store/app";

export function SourceChips({
  sources,
  docs,
  tone = "light",
}: {
  sources: SourceRef[];
  docs: Array<{ id: string; title: string }>;
  tone?: "light" | "dark";
}) {
  const jump = useApp((state) => state.jump);
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => {
        const title = source.documentTitle ?? docs.find((doc) => doc.id === source.documentId)?.title ?? "Document";
        return (
          <motion.button
            key={`${source.documentId}:${source.page}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => jump(source.documentId, source.page)}
            title={source.snippet}
            className={cx(
              "flex max-w-[16rem] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
              tone === "dark"
                ? "bg-white/8 text-fog-200 hover:bg-white/14"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200",
            )}
          >
            <BookOpen className="size-3 shrink-0 text-signal" />
            <span className="truncate">{title}</span>
            <span className="shrink-0 font-mono opacity-70">p.{source.page}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function WebSources({ sources }: { sources: WebSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {sources.slice(0, 6).map((source, index) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-black/5 transition-colors hover:bg-white"
        >
          <span className="mt-0.5 font-mono text-[0.65rem] text-sky-700">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-stone-800">{source.title}</span>
            <span className="flex items-center gap-1 text-[0.7rem] text-stone-500">
              <Globe className="size-3" /> {source.domain}
            </span>
          </span>
          <ExternalLink className="size-3 shrink-0 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}

export function ImageGallery({
  images,
  query,
  tone = "light",
  effect = true,
}: {
  images: WebImage[];
  query: string;
  tone?: "light" | "dark";
  /** The WebGL mosaic reveal; off where the GPU is already busy (the voice stage runs the orb). */
  effect?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const visible = images.filter((image) => !failed.has(image.imageUrl)).slice(0, 6);
  if (!visible.length) return null;
  return (
    <div>
      <div
        className={cx(
          "mb-1.5 text-[0.7rem] tracking-wide uppercase",
          tone === "dark" ? "text-fog-400" : "text-stone-500",
        )}
      >
        Images · {query}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {visible.map((image, index) => (
          <motion.button
            key={image.imageUrl}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: index * 0.05 }}
            onClick={() => setOpen(index)}
            aria-label={`Open image: ${image.title}`}
            className={cx(
              "group relative aspect-[4/3] overflow-hidden rounded-xl",
              tone === "dark" ? "bg-white/5" : "bg-stone-100",
              index === 0 && visible.length >= 3 && "col-span-2 row-span-2 aspect-auto",
            )}
          >
            <div className="absolute inset-0">
              <ImageReveal
                src={image.thumbnailUrl}
                alt={image.title}
                tone={tone}
                delay={index * 140}
                effect={effect}
                onError={() => setFailed((set) => new Set(set).add(image.imageUrl))}
              />
            </div>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open !== null && visible[open] && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.figure
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={spring}
              className="relative max-h-full max-w-4xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={visible[open].imageUrl}
                alt={visible[open].title}
                referrerPolicy="no-referrer"
                className="max-h-[78vh] rounded-2xl object-contain"
              />
              <figcaption className="mt-3 flex items-center justify-between gap-3 text-sm text-fog-200">
                <span className="truncate">{visible[open].title}</span>
                <a
                  href={visible[open].sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex shrink-0 items-center gap-1 text-fog-400 hover:text-white"
                >
                  {visible[open].domain} <ExternalLink className="size-3.5" />
                </a>
              </figcaption>
              <div className="absolute inset-y-0 -left-2 flex items-center sm:-left-14">
                <button
                  aria-label="Previous image"
                  className="glass rounded-full p-2"
                  onClick={() => setOpen((open - 1 + visible.length) % visible.length)}
                >
                  <ChevronLeft className="size-5" />
                </button>
              </div>
              <div className="absolute inset-y-0 -right-2 flex items-center sm:-right-14">
                <button
                  aria-label="Next image"
                  className="glass rounded-full p-2"
                  onClick={() => setOpen((open + 1) % visible.length)}
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function updateQuizInCache(bookId: string, quizId: string, quiz: QuizItem, result: QuizResult) {
  queryClient.setQueryData<ChatMessage[]>(keys.messages(bookId), (messages) =>
    messages?.map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        part.type === "quiz" && part.quiz.id === quizId ? { ...part, quiz, result } : part,
      ),
    })),
  );
}

export function QuizCard({
  quiz,
  result,
  bookId,
  tone = "light",
}: {
  quiz: QuizItem;
  result?: QuizResult;
  bookId: string;
  tone?: "light" | "dark";
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [local, setLocal] = useState<{ quiz: QuizItem; result: QuizResult } | null>(null);
  const language = useApp((state) => state.language);
  const answer = useAnswerQuiz();
  const graded = local ?? (result ? { quiz, result } : null);
  const isChoice = quiz.options.length > 0;

  const submit = async () => {
    const response = await answer.mutateAsync({
      quizId: quiz.id,
      choice: choice ?? undefined,
      text: isChoice ? undefined : text,
      language,
    });
    setLocal(response);
    updateQuizInCache(bookId, quiz.id, response.quiz, response.result);
  };

  const dark = tone === "dark";
  return (
    <div
      className={cx(
        "overflow-hidden rounded-2xl ring-1",
        dark ? "bg-white/5 ring-white/10" : "bg-gradient-to-br from-violet-50 to-sky-50 ring-violet-200/60",
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 px-4 pt-3 text-[0.7rem] font-medium tracking-wide uppercase",
          dark ? "text-violet-300" : "text-violet-700",
        )}
      >
        <Sparkles className="size-3.5" /> Quick check · {quiz.concept}
      </div>
      <p
        className={cx(
          "px-4 pt-2 pb-3 text-[0.95rem] leading-relaxed font-medium",
          dark ? "text-white" : "text-stone-900",
        )}
      >
        {quiz.question}
      </p>
      <div className="space-y-1.5 px-4 pb-4">
        {isChoice ? (
          quiz.options.map((option, index) => {
            const correctIndex = graded?.quiz.answerIndex ?? -1;
            const picked = choice === index;
            const state = graded
              ? index === correctIndex
                ? "correct"
                : picked
                  ? "wrong"
                  : "idle"
              : picked
                ? "picked"
                : "idle";
            return (
              <motion.button
                key={index}
                disabled={Boolean(graded) || answer.isPending}
                whileTap={{ scale: 0.98 }}
                onClick={() => setChoice(index)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition-colors",
                  state === "idle" &&
                    (dark ? "bg-white/4 ring-white/10 hover:bg-white/8" : "bg-white/80 ring-black/8 hover:bg-white"),
                  state === "picked" && "bg-violet-600 text-white ring-violet-600",
                  state === "correct" && "bg-emerald-500/15 text-emerald-800 ring-emerald-500/60",
                  state === "wrong" && "bg-red-500/10 text-red-800 ring-red-400/60",
                  dark && state === "correct" && "text-emerald-200",
                  dark && state === "wrong" && "text-red-200",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black/5 font-mono text-xs">
                  {state === "correct" ? (
                    <Check className="size-3.5" />
                  ) : state === "wrong" ? (
                    <X className="size-3.5" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                {option}
              </motion.button>
            );
          })
        ) : (
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={Boolean(graded)}
            placeholder="Type your answer in your own words…"
            rows={3}
            className={cx(
              "w-full resize-none rounded-xl px-3 py-2 text-sm ring-1 outline-none focus:ring-violet-500",
              dark ? "bg-white/5 text-white ring-white/10" : "bg-white ring-black/10",
            )}
          />
        )}
        {!graded && (
          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              size="sm"
              disabled={answer.isPending || (isChoice ? choice === null : !text.trim())}
              onClick={submit}
            >
              {answer.isPending ? <Spinner className="size-3.5" /> : null} Check answer
            </Button>
          </div>
        )}
        <AnimatePresence>
          {graded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className={cx(
                "mt-2 rounded-xl px-3 py-2.5 text-sm leading-relaxed",
                graded.result.correct ? "bg-emerald-500/12" : "bg-amber-500/12",
                dark ? "text-fog-50" : "text-stone-800",
              )}
            >
              <div className="mb-1 font-medium">
                {graded.result.correct ? "Nailed it." : graded.result.score > 0 ? "Partly right." : "Not quite."}
              </div>
              {!isChoice && graded.quiz.answer && <div className="mb-1 opacity-80">Answer: {graded.quiz.answer}</div>}
              <div className="opacity-90">{graded.result.feedback}</div>
              {typeof graded.result.mastery === "number" && (
                <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                    <motion.div
                      className="h-full rounded-full bg-signal"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(graded.result.mastery * 100)}%` }}
                    />
                  </div>
                  Mastery {Math.round(graded.result.mastery * 100)}%
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {answer.isError && <p className="text-xs text-red-600">Couldn't check that answer. Try again.</p>}
      </div>
    </div>
  );
}

const taskOrb = (title: string) =>
  /search|web|image|photo|look/i.test(title)
    ? "searching"
    : /diagram|draw|sketch/i.test(title)
      ? "shaping"
      : /quiz|card|check/i.test(title)
        ? "solving"
        : /guide|note|organi/i.test(title)
          ? "weaving"
          : "working";

export function TaskChip({
  title,
  status,
  summary,
  tone = "light",
}: {
  title: string;
  status: "running" | "done" | "failed";
  summary?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs",
        tone === "dark" ? "bg-white/8 text-fog-200" : "bg-stone-100 text-stone-600",
      )}
    >
      {status === "running" ? (
        <ThinkingOrb state={taskOrb(title)} size={20} theme={tone === "dark" ? "dark" : "light"} aria-hidden />
      ) : status === "done" ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <X className="size-3.5 text-red-500" />
      )}
      {title}
      {summary && <span className="opacity-60">· {summary}</span>}
    </div>
  );
}

export function Parts({
  parts,
  bookId,
  docs,
  tone = "light",
}: {
  parts: MessagePart[];
  bookId: string;
  docs: Array<{ id: string; title: string }>;
  tone?: "light" | "dark";
}) {
  const sources = parts
    .filter((part): part is Extract<MessagePart, { type: "sources" }> => part.type === "sources")
    .flatMap((part) => part.sources);
  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        switch (part.type) {
          case "images":
            return <ImageGallery key={index} images={part.images} query={part.query} tone={tone} />;
          case "diagram":
            return (
              <Diagram
                key={index}
                source={part.diagram.mermaid}
                steps={part.diagram.steps}
                title={part.diagram.title}
                theme={tone === "dark" ? "dark" : "light"}
              />
            );
          case "quiz":
            return <QuizCard key={index} quiz={part.quiz} result={part.result} bookId={bookId} tone={tone} />;
          case "web":
            return <WebSources key={index} sources={part.sources} />;
          case "task":
            return <TaskChip key={index} title={part.title} status={part.status} summary={part.summary} tone={tone} />;
          default:
            return null;
        }
      })}
      {sources.length > 0 && <SourceChips sources={dedupeSources(sources)} docs={docs} tone={tone} />}
    </div>
  );
}

function dedupeSources(sources: SourceRef[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.documentId}:${source.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
