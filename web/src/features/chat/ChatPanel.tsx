/**
 * The tutor rail: conversation thread for the active notebook, streaming
 * answers, and the composer. Voice mode opens from here.
 */
import { motion } from "motion/react";
import { BookOpenText, Brain, ImageIcon, ListChecks, RotateCcw, Workflow } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { StudyDocument } from "@shared/types";
import { Button, IconButton, cx, spring, toast } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, queryClient, useDocuments, useMessages } from "@/lib/queries";
import { useApp } from "@/store/app";
import { BookSwitcher } from "./BookSwitcher";
import { Composer } from "./Composer";
import { BotAvatar } from "@/components/fx/BotAvatar";
import { DraftView, MessageView } from "./Message";
import { useChat } from "./useChat";

function suggestions(docs: StudyDocument[], page: number) {
  const title = docs[0]?.title;
  if (!title) {
    return [
      { icon: Brain, text: "Explain how neural networks learn, simply" },
      { icon: Workflow, text: "Draw how photosynthesis works" },
      { icon: ImageIcon, text: "Show me pictures of a neuron" },
      { icon: ListChecks, text: "Quiz me on the water cycle" },
    ];
  }
  return [
    { icon: BookOpenText, text: `Summarise page ${page} in plain words` },
    { icon: Workflow, text: `Draw a diagram of the main process in "${title}"` },
    { icon: Brain, text: "What are the key ideas I should understand first?" },
    { icon: ListChecks, text: "Quiz me on what I've read so far" },
  ];
}

export function ChatPanel({ className }: { className?: string }) {
  const bookId = useApp((state) => state.activeBookId);
  const page = useApp((state) => state.page);
  const set = useApp((state) => state.set);
  const messages = useMessages(bookId);
  const documents = useDocuments(bookId);
  const { draft, error, send, stop, busy, clearError } = useChat(bookId);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const docs = useMemo(
    () =>
      (documents.data ?? []).filter((doc) => doc.status === "ready").map((doc) => ({ id: doc.id, title: doc.title })),
    [documents.data],
  );

  // Stick to the bottom while streaming unless the learner scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: draft ? "auto" : "smooth" });
  }, [messages.data?.length, draft]);

  const onSend = (text: string) => {
    const selection = useApp.getState().selection;
    stick.current = true;
    set({ selection: null });
    void send(text, { selection });
  };

  const clearThread = async () => {
    if (!bookId || !window.confirm("Clear this conversation? Your study guide and flashcards are kept.")) return;
    await api(`/books/${bookId}/messages`, { method: "DELETE" });
    queryClient.setQueryData(keys.messages(bookId), []);
    toast("Conversation cleared");
  };

  const list = messages.data ?? [];
  const empty = !list.length && !draft;
  const tutorAvatar = useApp((state) => state.tutorAvatar);
  const latestTutorId = draft ? null : [...list].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <section
      className={cx("flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfaf7] text-stone-900", className)}
      aria-label="Tutor chat"
    >
      <header className="flex items-center gap-2 border-b border-stone-200/70 px-3 py-2.5 sm:px-4">
        <BookSwitcher />
        <div className="flex-1" />
        {list.length > 0 && (
          <IconButton label="Clear conversation" tone="light" size={34} onClick={clearThread}>
            <RotateCcw className="size-4" />
          </IconButton>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {empty ? (
          <div className="flex h-full flex-col justify-center py-6">
            <div className="mb-5 flex items-center gap-4">
              <BotAvatar type={tutorAvatar} size={64} aria-label="Your tutor" />
              <div>
                <h2 className="text-lg text-stone-900">What shall we learn?</h2>
                <p className="text-sm text-stone-500">
                  {docs.length
                    ? "Ask anything about your documents — I'll cite the pages."
                    : "Ask anything, or add a PDF to study from."}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {suggestions(documents.data ?? [], page).map(({ icon: Icon, text }, index) => (
                <motion.button
                  key={text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.05 * index }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSend(text)}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm text-stone-700 ring-1 ring-stone-200 transition-colors hover:ring-orange-300"
                >
                  <Icon className="size-4 shrink-0 text-signal" />
                  {text}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {list.map((message) => (
              <MessageView
                key={message.id}
                message={message}
                docs={docs}
                bookId={bookId!}
                latest={message.id === latestTutorId}
              />
            ))}
            {draft && <DraftView draft={draft} docs={docs} bookId={bookId!} />}
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
              >
                <span>{error.message}</span>
                {error.retryable && (
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => {
                      clearError();
                      onSend(error.lastInput);
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Composer
        busy={busy}
        onSend={onSend}
        onStop={stop}
        onVoice={() => set({ voiceOpen: true })}
        placeholder={docs.length ? `Ask about ${docs[0].title}…` : "Ask your tutor anything…"}
      />
    </section>
  );
}
