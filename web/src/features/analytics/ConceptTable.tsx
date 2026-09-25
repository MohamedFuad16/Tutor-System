/** "Concepts": weakest-first concept list — a table on desktop, cards on mobile — with review due badges. */
import { useId, useMemo, useState } from "react";
import type { ConceptState } from "@shared/types";
import { MasteryRing } from "@/components/ui";
import { clamp01, dueStatus, formatCount, sortConcepts } from "./format";
import { MasteryBar, Panel, ToggleMore } from "./primitives";
import { CONCEPTS_PREVIEW, type Summary } from "./tokens";

function DueBadge({ dueAt, now, hideEmpty }: { dueAt: number | null; now: number; hideEmpty?: boolean }) {
  const status = dueStatus(dueAt, now);
  if (dueAt == null && hideEmpty) return null;
  if (status.due) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-signal/12 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-signal-soft ring-1 ring-signal/25">
        <span aria-hidden className="size-1.5 rounded-full bg-signal" />
        {status.text}
      </span>
    );
  }
  return <span className="text-xs whitespace-nowrap text-fog-400 tabular-nums">{status.text}</span>;
}

export function ConceptsPanel({
  concepts,
  books,
  now,
}: {
  concepts: ConceptState[];
  books: Summary["books"];
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const sorted = useMemo(() => sortConcepts(concepts), [concepts]);
  const bookTitles = useMemo(() => new Map(books.map((book) => [book.id, book.title])), [books]);
  const visible = expanded ? sorted : sorted.slice(0, CONCEPTS_PREVIEW);
  const dueCount = concepts.filter((concept) => concept.dueAt != null && concept.dueAt <= now).length;

  return (
    <Panel
      index={11}
      title="Concepts"
      subtitle="Weakest first — the best places to spend your next session"
      action={
        concepts.length > 0 ? (
          <div className="flex items-center gap-2 text-xs">
            {dueCount > 0 && (
              <span className="rounded-full bg-signal/10 px-2.5 py-1 text-signal-soft ring-1 ring-signal/20 tabular-nums">
                {formatCount(dueCount)} due
              </span>
            )}
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-fog-400 tabular-nums">
              {formatCount(concepts.length)} tracked
            </span>
          </div>
        ) : undefined
      }
    >
      {concepts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/8 px-5 py-10 text-center text-sm text-fog-400">
          Concepts appear as you study — ask questions and your tutor maps what you’re learning.
        </p>
      ) : (
        <div id={listId}>
          {/* Desktop: table */}
          <table className="hidden w-full table-fixed text-sm md:table">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-fog-500 uppercase">
                <th scope="col" className="w-[36%] pb-3 font-medium">
                  Concept
                </th>
                <th scope="col" className="w-[20%] pb-3 pl-4 font-medium">
                  Notebook
                </th>
                <th scope="col" className="w-[22%] pb-3 pl-4 font-medium">
                  Mastery
                </th>
                <th scope="col" className="w-[10%] pb-3 pl-4 text-right font-medium">
                  Correct
                </th>
                <th scope="col" className="w-[12%] pb-3 pl-4 text-right font-medium">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 border-t border-white/5">
              {visible.map((concept) => {
                const assessed = concept.attempts > 0;
                return (
                  <tr key={concept.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <MasteryRing
                          value={assessed ? concept.mastery : -1}
                          size={28}
                          className="shrink-0 text-fog-400"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fog-50" title={concept.name}>
                            {concept.name}
                          </p>
                          {concept.summary && (
                            <p className="truncate text-xs text-fog-500" title={concept.summary}>
                              {concept.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pl-4">
                      <p className="truncate text-fog-400" title={bookTitles.get(concept.bookId)}>
                        {bookTitles.get(concept.bookId) ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <MasteryBar value={concept.mastery} assessed={assessed} label={`${concept.name} mastery`} />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs text-fog-200 tabular-nums">
                          {assessed ? `${Math.round(clamp01(concept.mastery) * 100)}%` : "New"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right text-xs text-fog-200 tabular-nums">
                      {assessed ? (
                        <>
                          {concept.correct}
                          <span className="text-fog-500">/{concept.attempts}</span>
                        </>
                      ) : (
                        <span className="text-fog-500">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <DueBadge dueAt={concept.dueAt} now={now} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile: cards */}
          <ul className="space-y-2.5 md:hidden">
            {visible.map((concept) => {
              const assessed = concept.attempts > 0;
              return (
                <li key={concept.id} className="rounded-2xl bg-white/[0.025] p-4 ring-1 ring-white/5">
                  <div className="flex items-start gap-3">
                    <MasteryRing
                      value={assessed ? concept.mastery : -1}
                      size={32}
                      className="mt-0.5 shrink-0 text-fog-400"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-snug font-medium break-words text-fog-50">
                        {concept.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-fog-500">{bookTitles.get(concept.bookId) ?? "—"}</p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs text-fog-200 tabular-nums">
                      {assessed ? `${Math.round(clamp01(concept.mastery) * 100)}%` : "New"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <MasteryBar value={concept.mastery} assessed={assessed} label={`${concept.name} mastery`} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-fog-500 tabular-nums">
                      {assessed ? `${concept.correct}/${concept.attempts} correct` : "Not assessed yet"}
                    </span>
                    <DueBadge dueAt={concept.dueAt} now={now} hideEmpty />
                  </div>
                </li>
              );
            })}
          </ul>

          {sorted.length > CONCEPTS_PREVIEW && (
            <div className="mt-4 flex justify-center">
              <ToggleMore
                expanded={expanded}
                total={sorted.length}
                onToggle={() => setExpanded((v) => !v)}
                controls={listId}
              />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
