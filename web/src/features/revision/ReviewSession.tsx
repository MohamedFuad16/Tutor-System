/**
 * Spaced-repetition review: flip a card, grade yourself, and the scheduler
 * (SM-2) plus the learner model (BKT mastery) update on the server.
 */
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper, RotateCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Flashcard, ReviewGrade } from "@shared/types";
import { Button, IconButton, Spinner, softSpring } from "@/components/ui";
import { useCards, useReviewCard } from "@/lib/queries";

const GRADES: Array<{ grade: ReviewGrade; label: string; hint: string; className: string }> = [
  { grade: "again", label: "Again", hint: "10 min", className: "bg-[#f3d7c8] text-[#6b2a0e] hover:bg-[#eecab7]" },
  { grade: "hard", label: "Hard", hint: "soon", className: "bg-[#f1e4c5] text-[#5c4410] hover:bg-[#eadbb4]" },
  { grade: "good", label: "Good", hint: "days", className: "bg-[#d9ead6] text-[#1f4a2a] hover:bg-[#cce3c8]" },
  { grade: "easy", label: "Easy", hint: "later", className: "bg-[#d6e2f1] text-[#1d3553] hover:bg-[#c7d8ec]" },
];

export function ReviewSession({ bookId, onClose }: { bookId?: string; onClose: () => void }) {
  const cards = useCards(bookId, true);
  const allCards = useCards(bookId, false);
  const review = useReviewCard();
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  // Freeze the queue at session start; fall back to "practice anyway" when nothing is due.
  useEffect(() => {
    if (queue !== null || !cards.data || !allCards.data) return;
    setQueue(cards.data.length ? cards.data : allCards.data.slice(0, 20));
  }, [cards.data, allCards.data, queue]);

  const current = queue?.[0];
  const total = useMemo(() => (queue ? queue.length + done : 0), [queue, done]);

  const grade = async (value: ReviewGrade) => {
    if (!current) return;
    setFlipped(false);
    await review.mutateAsync({ cardId: current.id, grade: value });
    setDone((count) => count + 1);
    // Lapsed cards come back at the end of this session.
    setQueue((list) => {
      const rest = (list ?? []).slice(1);
      return value === "again" ? [...rest, current] : rest;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === " " && current) {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (flipped && ["1", "2", "3", "4"].includes(event.key)) void grade(GRADES[Number(event.key) - 1].grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Portal: page transitions transform the view container, which would trap a fixed overlay under the nav.
  return createPortal(
    <motion.div
      className="paper fixed inset-0 z-[95] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="font-serif text-lg">Review</div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e4dccd]">
          <motion.div
            className="h-full rounded-full bg-signal"
            animate={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
        <span className="font-mono text-xs text-paper-muted">
          {done}/{total}
        </span>
        <IconButton label="Close review" tone="light" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        {!queue ? (
          <Spinner className="size-6 text-paper-muted" />
        ) : !current ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <PartyPopper className="mx-auto mb-4 size-10 text-signal" />
            <h2 className="font-serif text-3xl">{done ? "Session complete" : "Nothing to review yet"}</h2>
            <p className="mt-2 text-paper-muted">
              {done
                ? `You reviewed ${done} card${done === 1 ? "" : "s"}. Your mastery has been updated.`
                : "Flashcards appear as your study guide grows. Keep learning in Study."}
            </p>
            <Button variant="light" className="mt-6" onClick={onClose}>
              Back to library
            </Button>
          </motion.div>
        ) : (
          <div className="w-full max-w-xl">
            <button
              onClick={() => setFlipped((value) => !value)}
              className="block w-full [perspective:1200px]"
              aria-label={flipped ? "Show question" : "Reveal answer"}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={softSpring}
                >
                  <motion.div
                    className="relative h-72 w-full [transform-style:preserve-3d] sm:h-80"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={softSpring}
                  >
                    <div className="paper-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
                      {current.conceptName && (
                        <span className="mb-4 rounded-full bg-[#efe7d8] px-3 py-1 text-[0.7rem] tracking-widest text-paper-muted uppercase">
                          {current.conceptName}
                        </span>
                      )}
                      <p className="font-serif text-2xl leading-snug">{current.front}</p>
                      <span className="mt-6 flex items-center gap-1.5 text-xs text-paper-muted">
                        <RotateCw className="size-3.5" /> Tap or press space to flip
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center rounded-[1.25rem] bg-[#2b251d] p-8 text-center text-[#f7f3ec] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <p className="font-serif text-xl leading-relaxed">{current.back}</p>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </button>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {GRADES.map((item, index) => (
                <motion.button
                  key={item.grade}
                  whileTap={{ scale: 0.95 }}
                  disabled={!flipped || review.isPending}
                  onClick={() => grade(item.grade)}
                  className={`rounded-2xl px-2 py-3 text-sm font-medium transition-opacity disabled:opacity-35 ${item.className}`}
                >
                  {item.label}
                  <span className="block text-[0.7rem] font-normal opacity-70">
                    {index + 1} · {item.hint}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
