/** Bottom glass control pill: previous/next page, editable page number, zoom out/in and fit to width. */
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton, softSpring } from "@/components/ui";
import { ZOOM_MAX, ZOOM_MIN } from "./useZoom";

export function ControlPill({
  page,
  total,
  zoom,
  disabled,
  animate,
  onPage,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  page: number;
  total: number;
  zoom: number;
  disabled: boolean;
  animate: boolean;
  onPage: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <motion.div
        role="toolbar"
        aria-label="Page controls"
        initial={animate ? { opacity: 0, y: 24, scale: 0.96 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={softSpring}
        className="glass pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-float)]"
      >
        <IconButton label="Previous page" size={36} disabled={disabled || page <= 1} onClick={onPrev}>
          <ChevronLeft className="size-4.5" />
        </IconButton>
        <PageField page={page} total={total} disabled={disabled} onCommit={onPage} />
        <IconButton label="Next page" size={36} disabled={disabled || (total > 0 && page >= total)} onClick={onNext}>
          <ChevronRight className="size-4.5" />
        </IconButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/10" />
        <IconButton label="Zoom out" size={36} disabled={disabled || zoom <= ZOOM_MIN} onClick={onZoomOut}>
          <ZoomOut className="size-4.5" />
        </IconButton>
        <span
          className="hidden w-11 shrink-0 text-center text-xs text-fog-400 tabular-nums sm:inline"
          aria-label={`Zoom ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </span>
        <IconButton label="Zoom in" size={36} disabled={disabled || zoom >= ZOOM_MAX} onClick={onZoomIn}>
          <ZoomIn className="size-4.5" />
        </IconButton>
        <IconButton label="Fit to width" size={36} active={zoom === 1} disabled={disabled} onClick={onFit}>
          <MoveHorizontal className="size-4.5" />
        </IconButton>
      </motion.div>
    </div>
  );
}

function PageField({
  page,
  total,
  disabled,
  onCommit,
}: {
  page: number;
  total: number;
  disabled: boolean;
  onCommit: (page: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const skipCommit = useRef(false);
  const digits = Math.max(2, String(total || page).length);

  const commit = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    if (draft !== null) {
      const value = Number.parseInt(draft, 10);
      if (Number.isFinite(value)) onCommit(value);
    }
    setDraft(null);
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 px-1 text-sm text-fog-400 tabular-nums">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="go"
        aria-label={total ? `Page number, 1 to ${total}` : "Page number"}
        disabled={disabled}
        value={draft ?? String(page)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          else if (event.key === "Escape") {
            skipCommit.current = true;
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        style={{ width: `calc(${digits}ch + 0.9rem)` }}
        className="h-7 rounded-lg bg-white/6 text-center text-fog-50 transition-colors outline-none hover:bg-white/9 focus:bg-white/10 focus:ring-1 focus:ring-signal/60 disabled:opacity-50"
      />
      <span aria-hidden>/</span>
      <span aria-hidden className="min-w-[2ch]">
        {total || "–"}
      </span>
    </div>
  );
}
