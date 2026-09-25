/**
 * One message in the thread (user bubble or tutor answer) plus the live
 * streaming draft with its "thinking" preview.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Mic, Square, Volume2 } from "lucide-react";
import { memo, useState } from "react";
import type { ChatMessage, MessagePart } from "@shared/types";
import { Markdown, type CitationDocs } from "@/components/Markdown";
import { IconButton, cx, spring } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp } from "@/store/app";
import { Parts } from "./parts";
import type { Draft } from "./useChat";

const webSourcesOf = (parts: MessagePart[]) => parts.flatMap((part) => (part.type === "web" ? part.sources : []));

function AnswerActions({ text }: { text: string }) {
  const language = useApp((state) => state.language);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-0.5 opacity-60 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100">
      <IconButton
        label={speaking ? "Stop reading" : "Read aloud"}
        tone="light"
        size={30}
        onClick={async () => {
          if (speaking) {
            stopSpeaking();
            setSpeaking(false);
            return;
          }
          setSpeaking(true);
          await speak(text, language);
          setSpeaking(false);
        }}
      >
        {speaking ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-3.5" />}
      </IconButton>
      <IconButton
        label="Copy answer"
        tone="light"
        size={30}
        onClick={async () => {
          await navigator.clipboard.writeText(text).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </IconButton>
    </div>
  );
}

export const MessageView = memo(function MessageView({
  message,
  docs,
  bookId,
}: {
  message: ChatMessage;
  docs: CitationDocs;
  bookId: string;
}) {
  if (message.role === "user") {
    const quote = message.parts.find((part) => part.type === "sources" && part.sources[0]?.snippet);
    const snippet = quote && quote.type === "sources" ? quote.sources[0] : null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex justify-end"
      >
        <div className="max-w-[85%]">
          {snippet?.snippet && (
            <div className="mb-1 ml-auto line-clamp-3 max-w-full rounded-2xl border-l-2 border-signal bg-orange-50 px-3 py-1.5 text-xs text-stone-600 italic">
              “{snippet.snippet}” <span className="not-italic opacity-70">· p.{snippet.page}</span>
            </div>
          )}
          <div className="rounded-[1.25rem] rounded-br-md bg-ink-800 px-4 py-2.5 text-[0.93rem] leading-relaxed whitespace-pre-wrap text-fog-50">
            {message.channel === "voice" && (
              <Mic className="mr-1.5 mb-0.5 inline size-3.5 text-signal-soft" aria-label="Spoken" />
            )}
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  const web = webSourcesOf(message.parts);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="group/message"
    >
      {message.channel === "voice" && (
        <div className="mb-1 flex items-center gap-1.5 text-[0.7rem] tracking-wide text-stone-400 uppercase">
          <Mic className="size-3" /> Voice
        </div>
      )}
      {message.content && <Markdown text={message.content} docs={docs} web={web} />}
      {message.interrupted && <p className="mt-1 text-xs text-stone-400 italic">Stopped.</p>}
      {message.parts.length > 0 && (
        <div className="mt-3">
          <Parts parts={message.parts} bookId={bookId} docs={docs} />
        </div>
      )}
      {message.content && <AnswerActions text={message.content} />}
    </motion.div>
  );
});

export function DraftView({ draft, docs, bookId }: { draft: Draft; docs: CitationDocs; bookId: string }) {
  const thinking = !draft.text;
  const reasoningTail = draft.reasoning.slice(-220).replace(/\s+/g, " ").trim();
  return (
    <div className="min-h-10" aria-live="polite" aria-busy="true">
      <AnimatePresence mode="wait">
        {thinking && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3"
          >
            <ThinkingOrb />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="shimmer-text text-sm font-medium text-stone-500">
                {draft.status ?? (draft.reasoning ? "Thinking it through" : "Reading your notebook")}
              </div>
              {reasoningTail && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-400 italic">{reasoningTail}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {draft.text && <Markdown text={draft.text} docs={docs} web={webSourcesOf(draft.parts)} streaming />}
      {draft.text && draft.status && (
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
          <ThinkingOrb small /> <span className="shimmer-text">{draft.status}</span>
        </div>
      )}
      {draft.parts.length > 0 && (
        <div className="mt-3">
          <Parts parts={draft.parts} bookId={bookId} docs={docs} />
        </div>
      )}
    </div>
  );
}

/** Tiny liquid orb that signals the AI is working. */
export function ThinkingOrb({ small }: { small?: boolean }) {
  return (
    <span className={cx("relative inline-flex shrink-0", small ? "size-3.5" : "size-7")} aria-hidden>
      <span className="absolute inset-0 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#3b82f6,#22d3ee,#f472b6,#8b5cf6)] blur-[1px]" />
      <span className="absolute inset-[18%] rounded-full bg-white/70 backdrop-blur" />
    </span>
  );
}
