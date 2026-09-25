/**
 * Revision: the library of study guides (one per notebook, written in the
 * background from your conversations), the spaced-repetition queue, and the
 * built-in books that explain Tutor itself.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Brain, MessagesSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Book } from "@shared/types";
import { PatternCard } from "@/components/PatternCard";
import { Button, Spinner, cx, softSpring, toast } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, queryClient, useBooks, useCards, useGuide } from "@/lib/queries";
import { useApp } from "@/store/app";
import { BUILTIN_BOOKS } from "./builtinBooks";
import { GuideView } from "./GuideView";
import { ReviewSession } from "./ReviewSession";

function NotebookGuide({ book, onBack }: { book: Book; onBack: () => void }) {
  const guide = useGuide(book.id);
  const due = useCards(book.id, true);
  const language = useApp((state) => state.language);
  const set = useApp((state) => state.set);
  const openBook = useApp((state) => state.openBook);
  const [reviewing, setReviewing] = useState(false);

  const sync = async () => {
    await api(`/books/${book.id}/guide/sync`, { method: "POST", json: { language } });
    queryClient.invalidateQueries({ queryKey: keys.guide(book.id) });
    toast("Updating your study guide…");
  };

  if (!guide.data) {
    return (
      <div className="paper flex h-full items-center justify-center">
        <Spinner className="size-6 text-paper-muted" />
      </div>
    );
  }

  return (
    <>
      <GuideView
        guide={guide.data.guide}
        mastery={guide.data.mastery}
        syncing={guide.data.syncing}
        onBack={onBack}
        onSync={book.messageCount ? sync : undefined}
        onReview={() => setReviewing(true)}
        dueCount={due.data?.length}
        empty={
          <div className="paper-card mb-10 flex flex-col items-start gap-4 p-8">
            <Sparkles className="size-7 text-signal" />
            <h2 className="font-serif text-2xl">This guide writes itself as you learn.</h2>
            <p className="max-w-xl text-paper-muted">
              Every conversation in this notebook — typed or spoken — is distilled here into a visual guide: a concept
              map, key points, diagrams, worked examples and questions to check yourself.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  openBook(book.id);
                  set({ view: "study" });
                }}
              >
                <MessagesSquare className="size-4" /> Start learning
              </Button>
              {book.messageCount > 0 && (
                <Button variant="light" onClick={sync}>
                  Build it now
                </Button>
              )}
            </div>
          </div>
        }
      />
      <AnimatePresence>
        {reviewing && <ReviewSession bookId={book.id} onClose={() => setReviewing(false)} />}
      </AnimatePresence>
    </>
  );
}

export function RevisionView() {
  const books = useBooks();
  const due = useCards(undefined, true);
  const openGuide = useApp((state) => state.openGuide);
  const set = useApp((state) => state.set);
  const [reviewAll, setReviewAll] = useState(false);

  const builtin = BUILTIN_BOOKS.find((book) => book.id === openGuide);
  const book = books.data?.find((item) => item.id === openGuide);
  const close = () => set({ openGuide: null });

  if (builtin) return <GuideView guide={builtin.guide} mastery={{}} onBack={close} readOnly />;
  if (book) return <NotebookGuide book={book} onBack={close} />;

  const dueCount = due.data?.length ?? 0;
  return (
    <div className="scroll-quiet h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          className="mb-10"
        >
          <h1 className="text-[clamp(2rem,4vw,3rem)] tracking-tight">Revision</h1>
          <p className="mt-2 max-w-2xl text-fog-400">
            Your notebooks turn into living study guides as you learn. Review what's due, revisit the concept maps, and
            check yourself.
          </p>
        </motion.header>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: 0.05 }}
          whileHover={{ y: -2 }}
          onClick={() => setReviewAll(true)}
          className="liquid-glass group mb-12 flex w-full items-center gap-5 rounded-[1.75rem] p-6 text-left"
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-signal/15 text-signal">
            <Brain className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg">
              {dueCount ? `${dueCount} card${dueCount === 1 ? "" : "s"} due for review` : "You're all caught up"}
            </div>
            <div className="text-sm text-fog-400">
              {dueCount
                ? "A few minutes of spaced review keeps it all in long-term memory."
                : "Practise anyway, or keep learning to grow your deck."}
            </div>
          </div>
          <ArrowRight className="size-5 text-fog-400 transition-transform group-hover:translate-x-1" />
        </motion.button>

        <section className="mb-14">
          <h2 className="mb-5 text-lg text-fog-200">Your study guides</h2>
          {books.isLoading ? (
            <Spinner className="size-5 text-fog-500" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {books.data?.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...softSpring, delay: 0.04 * index }}
                >
                  <PatternCard
                    theme={item.theme}
                    pattern={index}
                    title={item.title}
                    subtitle={
                      item.guideVersion
                        ? `${item.conceptCount} concepts · updated ${item.guideVersion}×`
                        : item.messageCount
                          ? "Guide will appear after your next exchange"
                          : "No conversations yet"
                    }
                    onClick={() => set({ openGuide: item.id })}
                    className="h-64 w-full"
                    compact
                    footer={
                      <div
                        className={cx(
                          "flex items-center gap-3 text-xs",
                          item.theme === "paper" ? "text-black/55" : "text-white/70",
                        )}
                      >
                        <span>{item.documentCount} docs</span>
                        <span>{item.messageCount} messages</span>
                      </div>
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-5 text-lg text-fog-200">Inside Tutor</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {BUILTIN_BOOKS.map((item) => (
              <PatternCard
                key={item.id}
                theme={item.theme}
                pattern={item.pattern}
                title={item.title}
                subtitle={item.subtitle}
                onClick={() => set({ openGuide: item.id })}
                className="h-72 w-full"
              />
            ))}
          </div>
        </section>
      </div>
      <AnimatePresence>{reviewAll && <ReviewSession onClose={() => setReviewAll(false)} />}</AnimatePresence>
    </div>
  );
}
