import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Brain,
  Search,
  BookOpen,
  Layers,
  Zap,
  Clock,
  AlertTriangle,
  Code,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  db,
  PersistentConcept,
  Flashcard,
  LearningBook,
} from "../memory/longterm.memory";
import { PatternCard, themes } from "../components/PatternCard";
import { SvgBeige } from "../components/PatternSVGs";
import tutorBook from "../lib/tutorBook.json";

const createTutorBookConcept = (): PersistentConcept => ({
  id: "tutor-book",
  name: "Tutor System Architecture",
  mastery: 0,
  confidence: 0,
  description:
    "Complete guide to the underlying pedagogical models and technical architecture of the AI Tutor.",
  p_learn: 0.2,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: [],
  relatedConcepts: [],
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: Date.now(),
  firstLearnedAt: Date.now(),
  linkedAnnotations: [],
});

const LongPressWrapper = ({
  onLongPress,
  onClick,
  children,
}: {
  onLongPress: () => void;
  onClick: () => void;
  children: (pressing: boolean) => React.ReactNode;
}) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const [pressing, setPressing] = useState(false);

  const clearPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  return (
    <div
      onPointerDown={() => {
        isLongPress.current = false;
        setPressing(true);
        timer.current = setTimeout(() => {
          isLongPress.current = true;
          setPressing(false);
          onLongPress();
        }, 800);
      }}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onClick={() => {
        if (!isLongPress.current) {
          onClick();
        }
      }}
      className="relative cursor-pointer select-none"
    >
      {children(pressing)}
    </div>
  );
};

const FlashcardUI = React.memo(
  ({
    card,
    onReview,
  }: {
    card: Flashcard;
    onReview: (quality: number) => void;
  }) => {
    const [flipped, setFlipped] = useState(false);

    return (
      <div className="w-full max-w-sm mx-auto mb-8 h-[240px] relative perspective-[1000px]">
        <motion.div
          className="w-full h-full relative cursor-pointer"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <motion.div
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-xl"
            animate={{ opacity: flipped ? 0 : 1 }}
            transition={{ duration: 0.1, delay: flipped ? 0 : 0.1 }}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: flipped ? "none" : "auto",
            }}
          >
            <div className="text-center overflow-y-auto">
              <span className="text-xs font-mono text-zinc-500 mb-4 block">
                QUESTION
              </span>
              <p className="text-lg font-serif text-white">{card.front}</p>
            </div>
          </motion.div>

          {/* Back */}
          <motion.div
            className="absolute inset-0 w-full h-full flex flex-col p-6 bg-white/5 border border-white/10 rounded-2xl shadow-xl bg-gradient-to-br from-[#1A1A1E] to-[#0A0A0B]"
            animate={{ opacity: flipped ? 1 : 0 }}
            transition={{ duration: 0.1, delay: flipped ? 0.1 : 0 }}
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: flipped ? "auto" : "none",
            }}
          >
            <div className="flex-1 flex items-center justify-center text-center mb-4 overflow-y-auto w-full">
              <div className="w-full">
                <span className="text-xs font-mono text-zinc-500 mb-2 block">
                  ANSWER
                </span>
                <p className="text-[15px] font-serif text-white leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-3 mt-auto shrink-0 relative z-10 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(0);
                }}
                className="text-[10px] font-mono py-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                AGAIN
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(2);
                }}
                className="text-[10px] font-mono py-2 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
              >
                HARD
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(4);
                }}
                className="text-[10px] font-mono py-2 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              >
                GOOD
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(5);
                }}
                className="text-[10px] font-mono py-2 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                EASY
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  },
);

const FlashcardDeck = ({
  cards,
  totalCount,
  dueCount,
  onReview,
}: {
  cards: Flashcard[];
  totalCount: number;
  dueCount: number;
  onReview: (card: Flashcard, quality: number) => void;
}) => {
  if (cards.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-zinc-900/10 bg-white/55 p-5 shadow-[0_24px_70px_rgba(46,36,22,0.14)] backdrop-blur-sm md:p-7">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-700">
            <Zap size={16} />
            Active Recall
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Flashcards
          </h2>
        </div>
        <div className="rounded-full border border-zinc-900/10 bg-[#faf9f6] px-3 py-1.5 text-xs font-medium text-zinc-600">
          {dueCount > 0 ? `${dueCount} due now` : `Next review queued`} ·{" "}
          {totalCount} total
        </div>
      </div>

      <AnimatePresence mode="wait">
        {cards.slice(0, 1).map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
          >
            <FlashcardUI
              card={card}
              onReview={(quality) => onReview(card, quality)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export function RevisionView() {
  const setActiveView = useStore((state) => state.setActiveView);

  const concepts =
    useLiveQuery(async () => {
      const tutorBookHidden = localStorage.getItem("tutor_book_hidden") === "1";
      try {
        const all = (await db.concepts.toArray()).filter(
          (c) => c.id === "tutor-book",
        );
        if (
          !tutorBookHidden &&
          (all.length === 0 || !all.find((c) => c.id === "tutor-book"))
        ) {
          const defaultConcept = createTutorBookConcept();
          await db.concepts.put(defaultConcept);
          all.push(defaultConcept);
        }
        return all;
      } catch (error) {
        console.warn(
          "[RevisionView] Concept library unavailable, using local fallback:",
          error,
        );
        return tutorBookHidden ? [] : [createTutorBookConcept()];
      }
    }, []) || [];

  const learningBooks =
    useLiveQuery(
      () => db.learningBooks.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const learningBookConcepts =
    useLiveQuery(
      () => db.learningBookConcepts.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const learningEntries =
    useLiveQuery(
      () =>
        db.learningEntries.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];

  const flashcards =
    useLiveQuery(async () => {
      try {
        return await db.flashcards.toArray();
      } catch (error) {
        console.warn("[RevisionView] Flashcards unavailable:", error);
        return [];
      }
    }, []) || [];

  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<PersistentConcept | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanupBooks = async () => {
      try {
        const all = await db.concepts.toArray();
        for (const concept of all) {
          if (
            ["AI Tutor Book", "ChatGPT", "Scientific Writing"].includes(
              concept.name,
            )
          ) {
            await db.concepts.delete(concept.id);
          }
        }
      } catch (error) {
        console.warn("[RevisionView] Book cleanup skipped:", error);
      }
    };
    cleanupBooks();
  }, []);

  const handleReview = async (card: Flashcard, quality: number) => {
    const nextDays = quality >= 4 ? 3 * (quality - 2) : 1;
    await db.flashcards.update(card.id, {
      nextReviewAt: Date.now() + nextDays * 24 * 60 * 60 * 1000,
    });
  };

  const sampleNotes: Record<string, string> = {
    "tutor-book": tutorBook
      .map((chapter) => chapter.content)
      .join("\n\n---\n\n"),
  };

  const activeConcept = concepts.find((c) => c.id === activeConceptId);
  const activeLearningBook = learningBooks.find(
    (book) => book.id === activeConceptId,
  );
  const flashcardsForBook = (book: LearningBook) =>
    flashcards.filter(
      (card) =>
        card.bookId === book.id ||
        (!card.bookId && book.title.toLowerCase() === "general study"),
    );
  const activeBookFlashcards = activeLearningBook
    ? flashcardsForBook(activeLearningBook)
    : [];
  const activeDueFlashcards = activeBookFlashcards
    .filter((card) => card.nextReviewAt <= Date.now())
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  const activeReviewQueue =
    activeDueFlashcards.length > 0
      ? activeDueFlashcards
      : [...activeBookFlashcards].sort(
          (a, b) => a.nextReviewAt - b.nextReviewAt,
        );

  useEffect(() => {
    const pendingBookId = localStorage.getItem("revision_open_book_id");
    if (!pendingBookId) return;
    if (!learningBooks.some((book) => book.id === pendingBookId)) return;
    setActiveConceptId(pendingBookId);
    localStorage.removeItem("revision_open_book_id");
  }, [learningBooks]);

  const learningBookMarkdown = (book: LearningBook) => {
    const conceptsForBook = learningBookConcepts.filter(
      (concept) => concept.bookId === book.id,
    );
    const entriesForBook = learningEntries.filter(
      (entry) => entry.bookId === book.id,
    );
    const chapterText = (book.chapters || []).length
      ? book.chapters
          .map((chapter, index) => {
            const chapterConcepts = conceptsForBook
              .filter((concept) => chapter.conceptIds.includes(concept.id))
              .map((concept) => concept.name);
            return `### Chapter ${index + 1}: ${chapter.title}\n${chapter.summary || "Chapter summary pending."}${chapterConcepts.length ? `\n\nConcepts: ${chapterConcepts.join(", ")}` : ""}`;
          })
          .join("\n\n")
      : "No chapters mapped yet.";
    const conceptText = conceptsForBook.length
      ? conceptsForBook
          .map((concept) => {
            const branches = concept.childConcepts.length
              ? `\n  - Branches: ${concept.childConcepts.join(", ")}`
              : "";
            const parents = concept.parentConcepts.length
              ? `\n  - Parent concepts: ${concept.parentConcepts.join(", ")}`
              : "";
            return `### ${concept.name}\n${concept.summary || "Summary pending."}${parents}${branches}`;
          })
          .join("\n\n")
      : "No concepts mapped yet.";
    const entryText = entriesForBook
      .slice(0, 5)
      .map(
        (entry) => `- ${entry.conversationSummary || entry.assistantSummary}`,
      )
      .join("\n");
    return `## Overview\n${book.overview || "Overview pending."}\n\n## Knowledge Summary\n${book.knowledgeSummary || book.summary || "Summary pending."}\n\n## Chapters\n${chapterText}\n\n## Mapped Concepts\n${conceptText}\n\n## Recent Learning Notes\n${entryText || "No learning notes recorded yet."}`;
  };
  const isTutorBook = activeConcept?.id === "tutor-book";
  const activeTitle = activeLearningBook?.title || activeConcept?.name || "";

  const deleteConcept = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === "tutor-book") {
      localStorage.setItem("tutor_book_hidden", "1");
    }
    try {
      await db.concepts.delete(deleteTarget.id);
    } catch (error) {
      console.warn(
        "[RevisionView] Book delete could not update IndexedDB:",
        error,
      );
    }
    if (activeConceptId === deleteTarget.id) {
      setActiveConceptId(null);
    }
    setDeleteTarget(null);
  };

  return (
    <div
      ref={scrollRef}
      className="w-full h-full bg-[#faf9f6] text-zinc-900 flex flex-col overflow-y-auto custom-scroll pt-20 md:pt-0 relative"
    >
      {/* Subtle Paper Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
        }}
      />
      {activeConcept || activeLearningBook ? (
        <div className="min-h-full flex w-full relative z-10 pt-16 md:pt-20">
          {/* Sidebar Navigation */}
          {(isTutorBook || activeLearningBook) && (
            <div className="w-64 border-r border-zinc-200/50 bg-[#faf9f6] hidden lg:block px-4 py-6 flex-shrink-0 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto custom-scroll">
              <div className="sticky top-0 z-20 -mt-2 mb-4 border-b border-zinc-200/70 bg-[#faf9f6] pb-4 pt-2 shadow-[0_14px_28px_rgba(250,249,246,0.96)]">
                <button
                  onClick={() => {
                    setActiveConceptId(null);
                    setCurrentChapterIndex(0);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-2"
                >
                  <Menu size={16} /> Back to Library
                </button>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-6 px-3">
                  Contents
                </div>
              </div>
              <nav className="flex flex-col gap-1">
                {(isTutorBook
                  ? tutorBook
                  : activeLearningBook?.chapters || []
                ).map((ch: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentChapterIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ${idx === currentChapterIndex ? "bg-zinc-900 text-white font-medium shadow-sm border border-zinc-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
                  >
                    <span className="line-clamp-2 leading-snug">
                      {ch.title}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className="flex-1 flex flex-col w-full relative">
            {/* Header for mobile or non-book views */}
            <div className="sticky left-0 right-0 top-16 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 bg-[#faf9f6] px-4 py-3 shadow-[0_14px_28px_rgba(250,249,246,0.98)] md:top-20 md:px-6 md:py-4 lg:hidden">
              <button
                onClick={() => {
                  setActiveConceptId(null);
                  setCurrentChapterIndex(0);
                }}
                className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Menu size={16} /> Back
              </button>
              <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-wide text-zinc-800 md:max-w-md">
                {activeTitle}
              </div>
              <div className="w-16"></div>
            </div>
            {(isTutorBook || activeLearningBook) && (
              <div className="sticky top-[121px] z-40 border-b border-zinc-200/70 bg-[#faf9f6] px-4 py-3 shadow-[0_14px_28px_rgba(250,249,246,0.96)] md:top-[141px] lg:hidden">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Contents
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                  {(isTutorBook
                    ? tutorBook
                    : activeLearningBook?.chapters || []
                  ).map((ch: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentChapterIndex(idx)}
                      className={`max-w-[min(220px,70vw)] shrink-0 rounded-full border px-3 py-2 text-left text-xs transition-colors ${idx === currentChapterIndex ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"}`}
                    >
                      <span className="line-clamp-1">{ch.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative isolate mx-auto w-full max-w-4xl flex-1 p-5 sm:p-6 md:p-10 lg:p-16 xl:p-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentChapterIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10 font-serif pb-12"
                >
                  <div className="mb-10 border-b border-zinc-200 pb-8 pt-4 font-sans cursor-default">
                    <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400 mb-6 block font-medium">
                      <span className="text-zinc-500 mr-2">#</span>
                      {isTutorBook
                        ? "Documentation"
                        : activeLearningBook
                          ? "Learning Book"
                          : "Concept Overview"}
                    </span>
                    <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-6 font-serif leading-[1.15]">
                      {isTutorBook
                        ? tutorBook[currentChapterIndex].title
                        : activeLearningBook
                          ? activeLearningBook.chapters?.[currentChapterIndex]
                              ?.title || activeTitle
                          : activeTitle}
                    </h1>
                  </div>

                  <div className="prose prose-zinc w-full max-w-none prose-sm md:prose-base font-serif prose-p:leading-[1.8] prose-p:text-zinc-800 prose-p:font-light prose-p:my-5 prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-zinc-900 prose-li:leading-[1.8] prose-li:text-zinc-800 prose-li:font-light prose-ul:my-5 prose-pre:bg-zinc-100 prose-pre:text-zinc-800 prose-pre:border prose-pre:border-zinc-200 prose-pre:shadow-inner prose-pre:my-8 prose-code:before:content-none prose-code:after:content-none prose-code:bg-transparent prose-code:px-0 prose-code:py-0 prose-code:font-mono prose-code:text-[0.88em] prose-code:font-normal prose-code:text-zinc-700 prose-strong:text-zinc-900 prose-strong:font-medium selection:bg-zinc-200 selection:text-zinc-950">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {isTutorBook
                        ? tutorBook[currentChapterIndex].content
                        : activeLearningBook
                          ? activeLearningBook.chapters &&
                            activeLearningBook.chapters.length > 0
                            ? activeLearningBook.chapters[currentChapterIndex]
                                ?.summary ||
                              learningBookMarkdown(activeLearningBook)
                            : learningBookMarkdown(activeLearningBook)
                          : sampleNotes[
                              activeConcept!.id as keyof typeof sampleNotes
                            ] ||
                            activeConcept!.description ||
                            "Notes unavailable."}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              </AnimatePresence>

              {isTutorBook && (
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-zinc-200/50 font-sans">
                  <button
                    disabled={currentChapterIndex === 0}
                    onClick={() => {
                      setCurrentChapterIndex((c) => Math.max(0, c - 1));
                      scrollRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="px-5 py-2.5 rounded-full border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-[color,background-color,border-color,box-shadow,transform,opacity] flex items-center gap-2"
                  >
                    &larr; Previous
                  </button>
                  <button
                    disabled={currentChapterIndex === tutorBook.length - 1}
                    onClick={() => {
                      setCurrentChapterIndex((c) =>
                        Math.min(tutorBook.length - 1, c + 1),
                      );
                      scrollRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-[color,background-color,border-color,box-shadow,transform,opacity] flex items-center gap-2 shadow-sm"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}

              {activeLearningBook && activeBookFlashcards.length > 0 && (
                <div className="mt-20 border-t border-zinc-200 pt-16 font-sans">
                  <FlashcardDeck
                    cards={activeReviewQueue}
                    totalCount={activeBookFlashcards.length}
                    dueCount={activeDueFlashcards.length}
                    onReview={handleReview}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-12 lg:p-16">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-3 md:mb-16">
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 mb-2">
              Library
            </h1>
            <div className="text-sm font-mono text-zinc-500">
              {learningBooks.length + concepts.length + 1} Books
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {learningBooks.length === 0 && concepts.length === 0 && (
              <div className="col-span-full h-64 flex items-center justify-center text-zinc-500 border border-white/10 border-dashed rounded-3xl">
                No books discovered yet. Start chatting to learn new concepts.
              </div>
            )}
            {learningBooks.map((book, index) => {
              const theme = themes[index % themes.length];
              const conceptCount = learningBookConcepts.filter(
                (concept) => concept.bookId === book.id,
              ).length;
              const cardCount = flashcardsForBook(book).length;
              return (
                <PatternCard
                  key={book.id}
                  layoutId={`card-${book.id}`}
                  onClick={() => setActiveConceptId(book.id)}
                  bgClass={theme.bg}
                  SvgComponent={theme.SvgComponent}
                  bloomColor={theme.bloom}
                  bloomOpacity={theme.bloomOpacity}
                  pressDotColor={
                    theme.text.includes("1f1f1f") ? "#ff6e00" : "#fefefe"
                  }
                  pressRingColor={
                    theme.text.includes("1f1f1f")
                      ? "rgba(255,110,0,0.58)"
                      : "rgba(254,254,254,0.58)"
                  }
                >
                  <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                    <div
                      className={`text-[11px] font-mono font-bold uppercase tracking-[0.16em] opacity-65 ${theme.text}`}
                    >
                      Learning Book · {conceptCount} concepts
                      {cardCount > 0 ? ` · ${cardCount} cards` : ""}
                    </div>
                    <div
                      className={`text-[25px] font-medium tracking-tight leading-[1.05] ${theme.text}`}
                    >
                      {book.title}
                    </div>
                    <div
                      className={`text-[16px] font-light tracking-tight leading-[1.25] opacity-70 ${theme.text}`}
                    >
                      {book.overview ||
                        book.knowledgeSummary ||
                        book.summary ||
                        "DeepSeek trace is building this map."}
                    </div>
                  </div>
                </PatternCard>
              );
            })}
            {concepts.map((concept, index) => {
              const theme =
                themes[(index + learningBooks.length) % themes.length];
              return (
                <LongPressWrapper
                  key={concept.id}
                  onLongPress={() => setDeleteTarget(concept)}
                  onClick={() => setActiveConceptId(concept.id)}
                >
                  {(pressing) => (
                    <PatternCard
                      layoutId={`card-${concept.id}`}
                      bgClass={theme.bg}
                      SvgComponent={theme.SvgComponent}
                      bloomColor={theme.bloom}
                      bloomOpacity={theme.bloomOpacity}
                      isPressing={pressing}
                      pressDotColor={
                        theme.text.includes("1f1f1f") ? "#ff6e00" : "#fefefe"
                      }
                      pressRingColor={
                        theme.text.includes("1f1f1f")
                          ? "rgba(255,110,0,0.58)"
                          : "rgba(254,254,254,0.58)"
                      }
                    >
                      <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                        <div
                          className={`text-[25px] font-medium tracking-tight leading-[1.05] ${theme.text}`}
                        >
                          {concept.name}
                        </div>
                        <div
                          className={`text-[16px] font-light tracking-tight leading-[1.25] opacity-70 ${theme.text}`}
                        >
                          {concept.description}
                        </div>
                      </div>
                    </PatternCard>
                  )}
                </LongPressWrapper>
              );
            })}

            {/* Admin Book */}
            <PatternCard
              layoutId="card-admin-dashboard"
              onClick={() => setActiveView("admin")}
              bgClass="bg-[#ecebe9]"
              SvgComponent={SvgBeige}
              bloomColor="rgb(255, 110, 0)"
              bloomOpacity={0.18}
            >
              <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-[#ff6e00]/10 text-[#ff6e00]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-[#1f1f1f]">
                  Admin
                  <br />
                  Dashboard
                </div>
                <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-[#1f1f1f]">
                  View live DeepSeek LLM traces and server console logs.
                </div>
              </div>
            </PatternCard>
          </div>
        </div>
      )}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/35 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-900/10 bg-[#faf9f6] p-6 shadow-[0_30px_90px_rgba(46,36,22,0.28)]"
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.12]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 10%, rgba(255,110,0,0.28), transparent 34%), radial-gradient(circle at 85% 100%, rgba(17,24,39,0.12), transparent 30%)",
                }}
              />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[#faf9f6] shadow-[0_16px_34px_rgba(24,24,27,0.22)]">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Delete book
                  </div>
                  <h2 className="mt-2 text-2xl font-serif font-medium leading-tight text-zinc-950">
                    Remove "{deleteTarget.name}"?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    This removes the book from your revision library on this
                    device. The action keeps the rest of your notes and chat
                    history untouched.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 flex justify-end gap-3 border-t border-zinc-900/10 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-full border border-zinc-900/10 bg-white/60 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950"
                >
                  Keep book
                </button>
                <button
                  type="button"
                  onClick={deleteConcept}
                  className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-[#faf9f6] shadow-[0_14px_34px_rgba(24,24,27,0.22)] transition-colors hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
