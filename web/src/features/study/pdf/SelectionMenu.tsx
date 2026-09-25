/** Floating toolbar for a text selection on the page: ask the tutor, highlight, underline, copy. */
import { motion } from "motion/react";
import { Copy, Highlighter, Sparkles, Underline } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { spring } from "@/components/ui";
import { HIGHLIGHT_COLOR, UNDERLINE_COLOR } from "./annotations";
import { Floating } from "./Floating";
import type { Anchor } from "./geometry";

export function SelectionMenu({
  anchor,
  containerRef,
  pressRef,
  animate,
  onAsk,
  onAnnotate,
  onCopy,
}: {
  anchor: Anchor;
  containerRef: RefObject<HTMLDivElement | null>;
  /** Stamped on every press so a tap that drops the selection doesn't close the menu first. */
  pressRef: RefObject<number>;
  animate: boolean;
  onAsk: () => void;
  onAnnotate: (kind: "highlight" | "underline") => void;
  onCopy: () => void;
}) {
  return (
    <Floating
      anchor={anchor}
      preferBelow={coarsePointer()}
      containerRef={containerRef}
      label="Selection actions"
      animate={animate}
    >
      <div
        className="glass flex h-11 items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-float)]"
        onPointerDown={() => (pressRef.current = Date.now())}
      >
        <motion.button
          type="button"
          aria-label="Ask tutor about the selection"
          whileTap={{ scale: 0.95 }}
          transition={spring}
          onClick={onAsk}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--color-aura-violet),var(--color-aura-blue))] px-3.5 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(139,92,246,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[filter] hover:brightness-110"
        >
          <Sparkles className="size-4" aria-hidden />
          Ask tutor
        </motion.button>
        <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />
        <ToolbarButton
          label="Highlight"
          onClick={() => onAnnotate("highlight")}
          icon={<Highlighter className="size-4" style={{ color: HIGHLIGHT_COLOR }} aria-hidden />}
        />
        <ToolbarButton
          label="Underline"
          onClick={() => onAnnotate("underline")}
          icon={<Underline className="size-4" style={{ color: UNDERLINE_COLOR }} aria-hidden />}
        />
        <ToolbarButton label="Copy" onClick={onCopy} icon={<Copy className="size-4" aria-hidden />} />
      </div>
    </Floating>
  );
}

function ToolbarButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      onClick={onClick}
      className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-fog-200 transition-colors hover:bg-white/8 hover:text-white"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

function coarsePointer() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}
