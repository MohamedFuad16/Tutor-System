/**
 * One message in the thread (user bubble or tutor answer) plus the live
 * streaming draft. Tutor turns carry the tutor's animated avatar — hopping
 * while it works, idle once the answer lands — and a status line whose
 * little orb names the activity (searching, drawing, writing…). Streamed
 * text is paced and fades in word by word; when the stream ends, the saved
 * answer picks up exactly where the draft's reveal was.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Mic, Square, Volume2 } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { ChatMessage, MessagePart } from "@shared/types";
import { BotAvatar } from "@/components/fx/BotAvatar";
import { ThinkingOrb, type OrbState } from "@/components/fx/ThinkingOrb";
import { Markdown, type CitationDocs } from "@/components/Markdown";
import { IconButton, spring } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp } from "@/store/app";
import { Parts } from "./parts";
import type { Draft } from "./useChat";
import { rememberReveal, takeReveal, useSmoothText } from "./useSmoothText";

/** Status label → the orb animation that names that activity. */
export function orbStateFor(label: string | null | undefined, reasoning = false): OrbState {
  const text = (label ?? "").toLowerCase();
  if (/search|look|find|brows|web/.test(text)) return "searching";
  if (/read|notebook|document|page/.test(text)) return "searching";
  if (/draw|diagram|sketch|chart/.test(text)) return "shaping";
  if (/quiz|flashcard|check|solv|calculat/.test(text)) return "solving";
  if (/image|photo|picture/.test(text)) return "searching";
  if (/connect/.test(text)) return "connecting";
  if (/plan|guide|organis|organiz/.test(text)) return "weaving";
  if (/writ|draft|compos/.test(text)) return "composing";
  return reasoning ? "breathing" : "working";
}

function TutorHeader({
  working,
  animate,
  children,
}: {
  working: boolean;
  animate: boolean;
  children?: React.ReactNode;
}) {
  const avatar = useApp((state) => state.tutorAvatar);
  return (
    <div className="mb-1.5 flex min-h-8 items-center gap-2.5">
      <BotAvatar type={avatar} size={32} state={working ? "working" : "default"} paused={!animate} aria-hidden />
      <span className="text-[0.8rem] font-medium text-stone-800">Tutor</span>
      {children}
    </div>
  );
}

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
  latest = false,
}: {
  message: ChatMessage;
  docs: CitationDocs;
  bookId: string;
  /** The newest tutor answer keeps an idle, living avatar; older ones hold still. */
  latest?: boolean;
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

  return <TutorMessage message={message} docs={docs} bookId={bookId} latest={latest} />;
});

function TutorMessage({
  message,
  docs,
  bookId,
  latest,
}: {
  message: ChatMessage;
  docs: CitationDocs;
  bookId: string;
  latest: boolean;
}) {
  // An answer that just finished streaming continues its reveal from where the draft was.
  const [from] = useState(() => takeReveal(message.id));
  const text = useSmoothText(message.content, false, from !== undefined, from);
  const settling = text.length < message.content.length;
  const web = webSourcesOf(message.parts);
  return (
    <motion.div
      initial={from !== undefined ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="group/message"
    >
      <TutorHeader working={settling} animate={latest}>
        {message.channel === "voice" && (
          <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] tracking-wide text-stone-500 uppercase">
            <Mic className="size-3" /> Voice
          </span>
        )}
      </TutorHeader>
      {message.content && <Markdown text={text} docs={docs} web={web} streaming={settling} />}
      {message.interrupted && <p className="mt-1 text-xs text-stone-400 italic">Stopped.</p>}
      {message.parts.length > 0 && (
        <div className="mt-3">
          <Parts parts={message.parts} bookId={bookId} docs={docs} />
        </div>
      )}
      {message.content && !settling && <AnswerActions text={message.content} />}
    </motion.div>
  );
}

export function DraftView({ draft, docs, bookId }: { draft: Draft; docs: CitationDocs; bookId: string }) {
  const text = useSmoothText(draft.text, true);
  const waiting = !text;
  const reasoningTail = draft.reasoning.slice(-220).replace(/\s+/g, " ").trim();
  const label = draft.status ?? (waiting ? (draft.reasoning ? "Thinking it through" : "Reading your notebook") : null);

  // Hand the reveal position to the saved answer when the stream ends.
  useEffect(() => {
    if (draft.id !== "pending") rememberReveal(draft.id, text.length);
  }, [draft.id, text.length]);

  return (
    <div className="min-h-10" aria-live="polite" aria-busy="true">
      <TutorHeader working animate>
        <AnimatePresence mode="wait">
          {label && (
            <motion.span
              key={label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex min-w-0 items-center gap-1.5 text-xs text-stone-500"
            >
              <ThinkingOrb state={orbStateFor(label, Boolean(draft.reasoning))} size={20} aria-hidden />
              <span className="shimmer-text truncate">{label}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </TutorHeader>
      {waiting && reasoningTail && (
        <p className="line-clamp-2 text-xs leading-relaxed text-stone-400 italic">{reasoningTail}</p>
      )}
      {text && <Markdown text={text} docs={docs} web={webSourcesOf(draft.parts)} streaming animateWords />}
      {draft.parts.length > 0 && (
        <div className="mt-3">
          <Parts parts={draft.parts} bookId={bookId} docs={docs} />
        </div>
      )}
    </div>
  );
}
