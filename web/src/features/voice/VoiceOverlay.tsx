/**
 * Voice mode: a full-screen conversation space. The orb breathes with the
 * dialogue, live captions show both sides, and the stage shows whatever the
 * tutor puts up while it talks: one good photo, a narrated diagram, the
 * magic-pen whiteboard, a 3D model or a live web page. The tutor controls
 * the stage by voice (show, point at, zoom, turn, close); when it clears the
 * screen the orb glides back to the centre and grows. Placeholders animate
 * while something is being fetched or built and turn into the result.
 */
import { AnimatePresence, motion } from "motion/react";
import {
  Box,
  FileText,
  Globe,
  Hand,
  Image as ImageIcon,
  Keyboard,
  Mic,
  MicOff,
  Palette,
  PenLine,
  PhoneOff,
  Send,
  StickyNote,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { VoiceVisual } from "@shared/voice";
import { ThinkingOrb } from "thinking-orbs";
import { VoiceBeam } from "voice-glow";
import { IconButton, cx, softSpring, spring } from "@/components/ui";
import { useApp } from "@/store/app";
import { StageContent, visualTitle } from "./stage/Stage";
import { StagePending } from "./stage/StagePending";
import { useVoiceSession } from "./useVoiceSession";
import { ORB_STYLES, ORB_STYLE_LABELS, VoiceOrb, orbSwatch } from "./VoiceOrb";

const STATE_LABEL: Record<string, string> = {
  idle: "Starting…",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
};

const KIND_ICONS: Record<VoiceVisual["kind"], typeof ImageIcon> = {
  images: ImageIcon,
  diagram: Workflow,
  board: PenLine,
  scene: Box,
  web: Globe,
  markdown: StickyNote,
  page: FileText,
};

/** Orb sizes: large and centred when the stage is empty, small beside a visual. */
function useOrbSizes() {
  const measure = () => {
    if (typeof window === "undefined") return { big: 320, small: 120 };
    const short = Math.min(window.innerWidth, window.innerHeight);
    return {
      big: Math.round(Math.min(380, Math.max(220, short * 0.46))),
      small: window.innerWidth >= 1024 ? 132 : 84,
    };
  };
  const [sizes, setSizes] = useState(measure);
  useEffect(() => {
    const onResize = () => setSizes(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return sizes;
}

function OrbPicker() {
  const orbStyle = useApp((state) => state.orbStyle);
  const set = useApp((state) => state.set);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconButton label="Orb style" tone="glass" onClick={() => setOpen((value) => !value)} active={open}>
        <Palette className="size-4" />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={spring}
            className="liquid-glass absolute top-12 right-0 z-20 grid w-64 grid-cols-3 gap-2 rounded-3xl p-3"
            role="listbox"
            aria-label="Orb style"
          >
            {ORB_STYLES.map((style) => (
              <button
                key={style}
                role="option"
                aria-selected={orbStyle === style}
                onClick={() => {
                  set({ orbStyle: style });
                  setOpen(false);
                }}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-2xl p-2 text-[0.65rem] text-fog-300 transition-colors hover:bg-white/8",
                  orbStyle === style && "bg-white/10 text-white",
                )}
              >
                <span
                  className={cx("size-10 rounded-full ring-2", orbStyle === style ? "ring-white/70" : "ring-white/10")}
                  style={{ background: orbSwatch(style) }}
                />
                {ORB_STYLE_LABELS[style]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VoiceOverlay() {
  const open = useApp((state) => state.voiceOpen);
  const set = useApp((state) => state.set);
  const orbStyle = useApp((state) => state.orbStyle);
  const voice = useVoiceSession();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [shownVisual, setShownVisual] = useState<string | null>(null);
  /** Visuals brought back from history show at once, without their build-up. */
  const [replayed, setReplayed] = useState<string | null>(null);
  const orb = useOrbSizes();

  useEffect(() => {
    if (open && voice.state === "idle") void voice.start();
    if (!open && voice.state !== "idle") voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Show the newest visual (or what is on its way); the focus of a narrated step pins its visual.
  useEffect(() => {
    const latest = voice.visuals[voice.visuals.length - 1];
    if (latest) setShownVisual(latest.id);
  }, [voice.visuals]);
  const lastPending = voice.pending[voice.pending.length - 1];
  useEffect(() => {
    if (lastPending) setShownVisual(lastPending.id);
  }, [lastPending]);
  useEffect(() => {
    if (voice.focus) setShownVisual(voice.focus.visualId);
  }, [voice.focus]);
  useEffect(() => {
    if (voice.pinned) setShownVisual(voice.pinned.visualId);
  }, [voice.pinned]);
  useEffect(() => {
    if (voice.closed) setShownVisual(null);
  }, [voice.closed]);

  const visual = useMemo(
    () => voice.visuals.find((item) => item.id === shownVisual) ?? null,
    [voice.visuals, shownVisual],
  );
  const placeholder = !visual ? (voice.pending.find((item) => item.id === shownVisual) ?? null) : null;
  const staged = Boolean(visual || placeholder);
  const focusNode =
    visual && voice.focus?.visualId === visual.id
      ? voice.focus.node
      : visual && voice.pinned?.visualId === visual.id
        ? voice.pinned.node
        : null;
  const view = visual && voice.view?.visualId === visual.id ? { view: voice.view.view, nonce: voice.view.nonce } : null;
  const recent = voice.visuals
    .filter((item) => item.id !== visual?.id)
    .slice(-4)
    .reverse();

  // The reader behind the overlay follows the document page on the stage.
  const jump = useApp((state) => state.jump);
  const readerPage = visual?.kind === "page" ? `${visual.documentId}:${visual.page}` : null;
  useEffect(() => {
    if (visual?.kind === "page") jump(visual.documentId, visual.page);
    // Only when the page itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerPage]);

  const hide = () => {
    setShownVisual(null);
    voice.sendStage(null);
  };
  const bringBack = (id: string) => {
    setReplayed(id);
    setShownVisual(id);
    voice.sendStage(id);
  };
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

  const orbSize = staged ? orb.small : orb.big;

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
                      <ThinkingOrb state="weaving" size={20} theme="dark" aria-hidden />
                    ) : (
                      <span className={cx("size-1.5 rounded-full", task.status === "done" ? "bg-ok" : "bg-bad")} />
                    )}
                    {task.title}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <OrbPicker />
            <IconButton label="End voice conversation" onClick={close}>
              <X className="size-5" />
            </IconButton>
          </div>

          {/* Stage */}
          <div
            className={cx(
              "relative flex min-h-0 flex-1 items-center justify-center gap-6 px-4 sm:px-10 lg:gap-10",
              staged ? "flex-col lg:flex-row" : "flex-col",
            )}
          >
            {/* The orb animates its box and its scale, so it glides and grows instead of jumping. */}
            <motion.div
              layout
              className="relative flex shrink-0 items-center justify-center"
              animate={{ width: orbSize, height: orbSize }}
              transition={staged ? softSpring : { type: "spring", stiffness: 110, damping: 13, mass: 0.9 }}
            >
              <motion.div
                className="absolute top-1/2 left-1/2"
                style={{ width: orb.big, height: orb.big, x: "-50%", y: "-50%" }}
                animate={{ scale: orbSize / orb.big }}
                transition={staged ? softSpring : { type: "spring", stiffness: 110, damping: 13, mass: 0.9 }}
              >
                <VoiceOrb
                  state={voice.state}
                  bands={voice.bands}
                  levels={voice.levels}
                  style={orbStyle}
                  size={orb.big}
                />
              </motion.div>
            </motion.div>
            <AnimatePresence mode="popLayout">
              {staged && (
                <motion.div
                  key={visual?.id ?? placeholder!.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 24, filter: "blur(12px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.94, y: 10, filter: "blur(10px)" }}
                  transition={softSpring}
                  className="liquid-glass stage-panel relative w-full max-w-5xl rounded-[2rem] p-3 sm:p-5"
                >
                  <button
                    onClick={hide}
                    aria-label="Hide visual"
                    className="absolute top-2.5 right-2.5 z-20 rounded-full bg-black/30 p-1.5 text-fog-400 backdrop-blur-md hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                  {visual ? (
                    <StageContent
                      visual={visual}
                      focus={focusNode}
                      view={view}
                      instant={replayed === visual.id}
                      onAsk={(question) => voice.sendText(question)}
                      onTurnPage={(page) => {
                        voice.sendStage(visual.id, page);
                        if (visual.kind === "page") jump(visual.documentId, page);
                      }}
                    />
                  ) : (
                    <StagePending kind={placeholder!.visual} title={placeholder!.title} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {/* With the stage clear, earlier visuals stay one tap away. */}
            <AnimatePresence>
              {!staged && recent.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.35 }}
                  className="absolute bottom-2 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap justify-center gap-2"
                >
                  {recent.map((item) => {
                    const Icon = KIND_ICONS[item.kind];
                    return (
                      <button
                        key={item.id}
                        onClick={() => bringBack(item.id)}
                        className="flex max-w-56 items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-xs text-fog-300 ring-1 ring-white/8 transition-colors hover:bg-white/12 hover:text-white"
                      >
                        <Icon className="size-3.5 shrink-0 text-signal-soft" />
                        <span className="truncate">{visualTitle(item)}</span>
                      </button>
                    );
                  })}
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

          {/* Controls: a glass dock whose bottom edge glows with whoever is talking. */}
          <div className="relative flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <VoiceBeam
              level={() => {
                const { mic, out } = voice.levels();
                return voice.state === "speaking" ? out : voice.state === "listening" ? mic : 0;
              }}
              processing={voice.state === "thinking"}
              theme="dark"
              scale={0.85}
            >
              <div className="rounded-full bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl">
                <div className="relative z-[5] flex items-center gap-2.5 p-2 sm:gap-3">
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
              </div>
            </VoiceBeam>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
