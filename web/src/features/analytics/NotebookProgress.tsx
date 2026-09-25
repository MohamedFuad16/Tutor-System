/** "Notebooks": average concept mastery per notebook, with a collapsible list. */
import { useId, useState } from "react";
import { DotMatrix } from "@/components/PatternCard";
import { useMotion } from "@/store/app";
import { clamp01, formatCount } from "./format";
import { MasteryBar, Panel, ToggleMore } from "./primitives";
import { BOOKS_PREVIEW, type Summary } from "./tokens";

export function NotebooksPanel({ books, className }: { books: Summary["books"]; className?: string }) {
  const animated = useMotion();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? books : books.slice(0, BOOKS_PREVIEW);

  return (
    <Panel
      index={10}
      className={className}
      title="Notebooks"
      subtitle="Average concept mastery in each notebook"
      action={
        books.length > 0 ? (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-fog-400 tabular-nums">{books.length}</span>
        ) : undefined
      }
    >
      {books.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/8 px-5 py-10 text-center text-sm text-fog-400">
          Create a notebook in Study to track progress per subject.
        </p>
      ) : (
        <>
          <ul id={listId} className="space-y-2.5">
            {visible.map((book, i) => {
              const pct = Math.round(clamp01(book.mastery) * 100);
              return (
                <li key={book.id} className="rounded-2xl bg-white/[0.025] p-3.5 ring-1 ring-white/5">
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 ring-1 ring-white/6"
                    >
                      <DotMatrix pattern={i} color="#ff6e00" size={18} animate={animated} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fog-50">{book.title || "Untitled notebook"}</p>
                      <p className="mt-0.5 truncate text-xs text-fog-500">
                        {formatCount(book.concepts)} {book.concepts === 1 ? "concept" : "concepts"} ·{" "}
                        {formatCount(book.messages)} {book.messages === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-sm text-fog-200 tabular-nums">
                      {book.concepts > 0 ? `${pct}%` : "—"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <MasteryBar
                      value={book.mastery}
                      assessed={book.concepts > 0}
                      label={`${book.title} average mastery`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {books.length > BOOKS_PREVIEW && (
            <div className="mt-4 flex justify-center">
              <ToggleMore
                expanded={expanded}
                total={books.length}
                onToggle={() => setExpanded((v) => !v)}
                controls={listId}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
