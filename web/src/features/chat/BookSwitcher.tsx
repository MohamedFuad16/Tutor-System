/**
 * Notebook switcher: pick, create, rename or delete notebooks. Each notebook
 * has its own documents, conversation, study guide and learner model.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx, spring, toast } from "@/components/ui";
import { useBooks, useCreateBook, useDeleteBook, useRenameBook } from "@/lib/queries";
import { useApp } from "@/store/app";

export function BookSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const books = useBooks();
  const activeBookId = useApp((state) => state.activeBookId);
  const openBook = useApp((state) => state.openBook);
  const create = useCreateBook();
  const rename = useRenameBook();
  const remove = useDeleteBook();
  const active = books.data?.find((book) => book.id === activeBookId);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const dark = tone === "dark";
  return (
    <div ref={ref} className="relative min-w-0">
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={spring}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          "flex max-w-full items-center gap-2 rounded-full py-1.5 pr-2.5 pl-3 text-sm transition-colors",
          dark ? "bg-white/6 text-fog-50 hover:bg-white/10" : "bg-stone-100 text-stone-800 hover:bg-stone-200/80",
        )}
      >
        <Library className="size-3.5 shrink-0 text-signal" />
        <span className="truncate font-medium">{active?.title ?? "Notebook"}</span>
        <ChevronDown className={cx("size-3.5 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={spring}
            className="absolute top-full left-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/8 bg-ink-850 p-1.5 text-fog-50 shadow-[var(--shadow-float)]"
          >
            <div className="scroll-quiet max-h-72 overflow-y-auto">
              {books.data?.map((book) => (
                <div
                  key={book.id}
                  className={cx(
                    "group flex items-center gap-2 rounded-xl px-2.5 py-2",
                    book.id === activeBookId ? "bg-white/8" : "hover:bg-white/5",
                  )}
                >
                  {editing === book.id ? (
                    <form
                      className="flex-1"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (draftTitle.trim()) await rename.mutateAsync({ id: book.id, title: draftTitle.trim() });
                        setEditing(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onBlur={() => setEditing(null)}
                        className="w-full rounded-lg bg-white/8 px-2 py-1 text-sm outline-none ring-1 ring-signal/50"
                        aria-label="Notebook title"
                      />
                    </form>
                  ) : (
                    <button
                      role="option"
                      aria-selected={book.id === activeBookId}
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        openBook(book.id);
                        setOpen(false);
                      }}
                    >
                      <div className="truncate text-sm">{book.title}</div>
                      <div className="text-[0.7rem] text-fog-500">
                        {book.documentCount} doc{book.documentCount === 1 ? "" : "s"} · {book.messageCount} messages
                      </div>
                    </button>
                  )}
                  {book.id === activeBookId && editing !== book.id && <Check className="size-3.5 text-signal" />}
                  {editing !== book.id && (
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        aria-label={`Rename ${book.title}`}
                        className="rounded-lg p-1.5 text-fog-500 hover:bg-white/8 hover:text-white"
                        onClick={() => {
                          setEditing(book.id);
                          setDraftTitle(book.title);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        aria-label={`Delete ${book.title}`}
                        className="rounded-lg p-1.5 text-fog-500 hover:bg-red-500/15 hover:text-red-300"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete "${book.title}"? Its documents, conversation and study guide will be removed.`,
                            )
                          )
                            return;
                          await remove.mutateAsync(book.id);
                          if (book.id === activeBookId) openBook(null);
                          toast(`Deleted "${book.title}"`);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                const book = await create.mutateAsync(undefined);
                openBook(book.id);
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm text-signal-soft hover:bg-white/5"
            >
              <Plus className="size-4" /> New notebook
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
