/**
 * Voice mode: a full-screen conversation space. The orb breathes with the
 * dialogue, live captions show both sides, and anything the background
 * specialist produces (diagrams with a narrated, highlighted tour; images;
 * detailed notes) appears on the stage while the tutor talks about it.
 */
import { AnimatePresence, motion } from "motion/react";
import { Hand, Keyboard, Loader2, Mic, MicOff, PhoneOff, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { VoiceVisual } from "@shared/voice";
import { Diagram } from "@/components/Diagram";
import { Markdown } from "@/components/Markdown";
import { IconButton, cx, softSpring, spring } from "@/components/ui";
import { ImageGallery } from "@/features/chat/parts";
import { useApp } from "@/store/app";
import { useVoiceSession } from "./useVoiceSession";
import { VoiceOrb } from "./VoiceOrb";

const STATE_LABEL: Record<string, string> = {
  idle: "Starting…",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
};

function Stage({ visual, focusNode }: { visual: VoiceVisual; focusNode: string | null }) {
  if (visual.kind === "diagram") {
    return (
      <Diagram
        source={visual.diagram.mermaid}
        title={visual.diagram.title}
        steps={visual.diagram.steps}
        activeNode={focusNode}
        theme="dark"
        controls={false}
        maxHeight={640}
        className="w-full !bg-transparent !ring-0"
      />
    );
  }
  if (visual.kind === "images") return <ImageGallery images={visual.images} query={visual.query} tone="dark" />;
  return (
    <div className="scroll-quiet max-h-[60vh] overflow-y-auto">
      <h3 className="mb-3 text-sm tracking-wide text-fog-400 uppercase">{visual.title}</h3>
      <Markdown text={visual.markdown} tone="dark" />
    </div>
  );
}

export function VoiceOverlay() {
  const open = useApp((state) => state.voiceOpen);
  const set = useApp((state) => state.set);
  const voice = useVoiceSession();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [shownVisual, setShownVisual] = useState<string | null>(null);

  useEffect(() => {
    if (open && voice.state === "idle") void voice.start();
    if (!open && voice.state !== "idle") voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Show the newest visual; the focus of a narrated step pins its diagram.
  useEffect(() => {
    const latest = voice.visuals[voice.visuals.length - 1];
    if (latest) setShownVisual(latest.id);
  }, [voice.visuals]);
  useEffect(() => {
    if (voice.focus) setShownVisual(voice.focus.visualId);
  }, [voice.focus]);

  const visual = useMemo(
    () => voice.visuals.find((item) => item.id === shownVisual) ?? null,
    [voice.visuals, shownVisual],
  );
  const close = () => set({ voiceOpen: false });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-ink-950 text-fog-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-label="Voice conversation"
        >
          {/* Ambient aurora */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-[-20%] left-[10%] size-[60vmax] rounded-full bg-aura-violet/10 blur-[120px]" />
            <div className="absolute right-[-10%] bottom-[-25%] size-[55vmax] rounded-full bg-aura-blue/10 blur-[120px]" />
            <div className="absolute bottom-[10%] left-[-15%] size-[35vmax] rounded-full bg-signal/8 blur-[120px]" />
          </div>

          {/* Top bar: state + background tasks */}
          <div className="relative flex items-center gap-3 px-5 pt-5 sm:px-8">
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-xs whitespace-nowrap">
              <span
                className={cx(
                  "size-2 rounded-full",
                  voice.state === "listening"
                    ? "bg-aura-cyan"
                    : voice.state === "speaking"
                      ? "bg-signal"
                      : voice.state === "thinking"
                        ? "bg-aura-violet animate-pulse"
                        : "bg-fog-500",
                )}
              />
              {STATE_LABEL[voice.state] ?? voice.state}
              {voice.modes && (
                <span className="hidden text-fog-500 sm:inline">
                  · {voice.modes.stt === "server" ? "live transcription" : "browser speech"}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <AnimatePresence>
                {voice.tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="liquid-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap"
                  >
                    {task.status === "running" ? (
                      <Loader2 className="size-3.5 animate-spin text-aura-violet" />
                    ) : (
                      <span className={cx("size-1.5 rounded-full", task.status === "done" ? "bg-ok" : "bg-bad")} />
                    )}
                    {task.title}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <IconButton label="End voice conversation" onClick={close}>
              <X className="size-5" />
            </IconButton>
          </div>

          {/* Stage */}
          <div
            className={cx(
              "relative flex min-h-0 flex-1 items-center justify-center gap-8 px-5 sm:px-10",
              visual ? "flex-col lg:flex-row" : "flex-col",
            )}
          >
            <motion.div layout transition={softSpring} className="flex shrink-0 items-center justify-center">
              <VoiceOrb state={voice.state} levels={voice.levels} size={visual ? 120 : 260} />
            </motion.div>
            <AnimatePresence mode="wait">
              {visual && (
                <motion.div
                  key={visual.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={softSpring}
                  className="liquid-glass relative w-full max-w-4xl rounded-[2rem] p-4 sm:p-6"
                >
                  <button
                    onClick={() => setShownVisual(null)}
                    aria-label="Hide visual"
                    className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-fog-500 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                  <Stage visual={visual} focusNode={voice.focus?.visualId === visual.id ? voice.focus.node : null} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Captions */}
          <div className="relative mx-auto w-full max-w-3xl px-6 pb-4 text-center" aria-live="polite">
            <AnimatePresence mode="popLayout">
              {voice.captions.user && (
                <motion.p
                  key={`u-${voice.captions.user.text}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: voice.captions.user.final ? 0.55 : 0.8 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 text-sm text-fog-400 italic"
                >
                  “{voice.captions.user.text}”
                </motion.p>
              )}
              {voice.captions.tutor && (
                <motion.p
                  key={`t-${voice.captions.tutor.text}`}
                  initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="font-display text-lg leading-snug text-white sm:text-2xl"
                >
                  {voice.captions.tutor.text}
                </motion.p>
              )}
            </AnimatePresence>
            {voice.error && <p className="mt-3 text-sm text-red-300">{voice.error}</p>}
            {voice.state === "error" && (
              <button
                onClick={() => void voice.start()}
                className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/15"
              >
                Reconnect
              </button>
            )}
          </div>

          {/* Typed input */}
          <AnimatePresence>
            {typing && (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative mx-auto mb-3 flex w-[min(36rem,calc(100%-2rem))] items-center gap-2 rounded-full bg-white/8 p-1.5 ring-1 ring-white/10"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!text.trim()) return;
                  voice.sendText(text.trim());
                  setText("");
                }}
              >
                <input
                  autoFocus
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type instead of talking…"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-fog-600"
                  aria-label="Type your message"
                />
                <IconButton label="Send" size={34} type="submit" className="bg-signal !text-white">
                  <Send className="size-4" />
                </IconButton>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="relative flex items-center justify-center gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <IconButton
              label={voice.muted ? "Unmute microphone" : "Mute microphone"}
              tone="glass"
              size={52}
              active={voice.muted}
              onClick={voice.toggleMute}
            >
              {voice.muted ? <MicOff className="size-5 text-red-300" /> : <Mic className="size-5" />}
            </IconButton>
            <IconButton
              label="Interrupt the tutor"
              tone="glass"
              size={52}
              onClick={voice.interrupt}
              disabled={voice.state !== "speaking"}
            >
              <Hand className="size-5" />
            </IconButton>
            <IconButton
              label="Type a message"
              tone="glass"
              size={52}
              active={typing}
              onClick={() => setTyping((value) => !value)}
            >
              <Keyboard className="size-5" />
            </IconButton>
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={spring}
              onClick={close}
              aria-label="End voice conversation"
              className="flex h-[52px] items-center gap-2 rounded-full bg-red-500/90 px-5 text-sm font-medium text-white hover:bg-red-500"
            >
              <PhoneOff className="size-4" /> End
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
