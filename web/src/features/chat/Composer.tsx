/**
 * Message composer: auto-growing input, highlighted-passage chip, deep/web
 * toggles, voice entry, send ↔ stop.
 */
import { motion } from "motion/react";
import { ArrowUp, AudioLines, Brain, Globe, Quote, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import { cx, spring } from "@/components/ui";
import { useApp } from "@/store/app";

export function Composer({
  busy,
  onSend,
  onStop,
  onVoice,
  placeholder,
}: {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onVoice: () => void;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const selection = useApp((state) => state.selection);
  const deepMode = useApp((state) => state.deepMode);
  const webMode = useApp((state) => state.webMode);
  const set = useApp((state) => state.set);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(180, el.scrollHeight)}px`;
  }, [text]);

  // A new highlighted passage focuses the input.
  useEffect(() => {
    if (selection) ref.current?.focus();
  }, [selection]);

  const submit = () => {
    const value = text.trim() || (selection ? "Explain this passage." : "");
    if (!value || busy) return;
    onSend(value);
    setText("");
  };

  return (
    <div className="px-3 pt-2 pb-3 sm:px-4">
      {selection && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex items-start gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-orange-200/70"
        >
          <Quote className="mt-0.5 size-3.5 shrink-0 text-signal" />
          <span className="line-clamp-2 flex-1 italic">{selection.text}</span>
          <span className="shrink-0 font-mono text-stone-400">p.{selection.page}</span>
          <button
            aria-label="Remove highlighted passage"
            onClick={() => set({ selection: null })}
            className="shrink-0 text-stone-400 hover:text-stone-700"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
      {/* A beam circles the composer while the tutor is working on an answer. */}
      <BorderBeam
        active={busy}
        size="md"
        theme="dark"
        strength={0.9}
        className="shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)]"
      >
        <div className="rounded-[1.6rem] bg-ink-900 p-1.5 ring-1 ring-black/20">
          <textarea
            ref={ref}
            value={text}
            rows={1}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={selection ? "Ask about the highlighted passage…" : placeholder}
            aria-label="Message the tutor"
            className="block max-h-[180px] w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-[0.95rem] text-fog-50 placeholder:text-fog-600 focus:outline-none"
          />
          <div className="flex items-center gap-1 px-1 pb-0.5">
            <Toggle
              active={deepMode}
              onClick={() => set({ deepMode: !deepMode })}
              label="Deep think"
              hint="Use the stronger model and reason longer"
            >
              <Brain className="size-3.5" />
            </Toggle>
            <Toggle
              active={webMode}
              onClick={() => set({ webMode: !webMode })}
              label="Web"
              hint="Let the tutor search the web this turn"
            >
              <Globe className="size-3.5" />
            </Toggle>
            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={onVoice}
              aria-label="Start voice conversation"
              title="Talk with your tutor"
              className="relative flex size-9 items-center justify-center overflow-hidden rounded-full text-white"
            >
              <span className="absolute inset-0 animate-spin-slow bg-[conic-gradient(from_0deg,#8b5cf6,#3b82f6,#22d3ee,#ff6e00,#8b5cf6)] opacity-90" />
              <span className="absolute inset-[2px] rounded-full bg-ink-800" />
              <AudioLines className="relative size-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={busy ? onStop : submit}
              disabled={!busy && !text.trim() && !selection}
              aria-label={busy ? "Stop answer" : "Send message"}
              className={cx(
                "flex size-9 items-center justify-center rounded-full transition-colors",
                busy ? "bg-white text-ink-900" : "bg-signal text-white disabled:bg-ink-600 disabled:text-fog-500",
              )}
            >
              {busy ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4" />}
            </motion.button>
          </div>
        </div>
      </BorderBeam>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
  hint,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={spring}
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={cx(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
        active
          ? "bg-signal/15 text-signal-soft ring-1 ring-signal/40"
          : "text-fog-500 hover:bg-white/6 hover:text-fog-200",
      )}
    >
      {children}
      {label}
    </motion.button>
  );
}
