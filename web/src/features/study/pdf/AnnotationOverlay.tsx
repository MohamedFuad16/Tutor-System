/** Saved highlights/underlines drawn as page-relative marks, plus the floating popover that removes one. */
import { Trash2 } from "lucide-react";
import type { CSSProperties, RefObject } from "react";
import type { Annotation } from "@shared/types";
import { Button, cx } from "@/components/ui";
import { PENDING_PREFIX } from "./annotations";
import { Floating } from "./Floating";
import type { Anchor } from "./geometry";

export function AnnotationMarks({
  items,
  onOpen,
}: {
  items: Annotation[];
  onOpen: (annotation: Annotation, anchor: Anchor) => void;
}) {
  if (!items.length) return null;
  // No z-index on the wrapper: each mark must blend (multiply) with the canvas underneath.
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((annotation) => {
        const pending = annotation.id.startsWith(PENDING_PREFIX);
        const underline = annotation.kind === "underline";
        const label = `${underline ? "Underlined" : "Highlighted"}: ${annotation.text.slice(0, 80)}`;
        return annotation.rects.map((rect, index) => {
          const first = index === 0;
          const position: CSSProperties = {
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          };
          return (
            <div
              key={`${annotation.id}-${index}`}
              role={first ? "button" : undefined}
              tabIndex={first && !pending ? 0 : -1}
              aria-label={first ? label : undefined}
              aria-hidden={first ? undefined : true}
              onClick={(event) => {
                if (!pending)
                  onOpen(annotation, { x: event.clientX, top: event.clientY - 6, bottom: event.clientY + 6 });
              }}
              onKeyDown={(event) => {
                if (pending || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                const box = event.currentTarget.getBoundingClientRect();
                onOpen(annotation, { x: box.left + box.width / 2, top: box.top, bottom: box.bottom });
              }}
              className={cx(
                "pointer-events-auto absolute z-[4] cursor-pointer transition-opacity duration-200",
                underline ? "hover:bg-black/[0.04]" : "rounded-[2px] opacity-40 mix-blend-multiply hover:opacity-60",
                pending && "animate-pulse",
              )}
              style={
                underline
                  ? { ...position, borderBottom: `2px solid ${annotation.color}` }
                  : { ...position, backgroundColor: annotation.color }
              }
            />
          );
        });
      })}
    </div>
  );
}

export function AnnotationPopover({
  annotation,
  anchor,
  containerRef,
  animate,
  onRemove,
}: {
  annotation: Annotation;
  anchor: Anchor;
  containerRef: RefObject<HTMLDivElement | null>;
  animate: boolean;
  onRemove: () => void;
}) {
  return (
    <Floating
      anchor={anchor}
      preferBelow={false}
      containerRef={containerRef}
      label="Annotation actions"
      animate={animate}
    >
      <div className="glass flex h-11 max-w-[min(20rem,calc(100vw-1rem))] items-center gap-2 rounded-full py-1 pr-1 pl-3.5 shadow-[var(--shadow-float)]">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: annotation.color }} />
        <span className="min-w-0 truncate text-xs text-fog-400">
          {annotation.text || (annotation.kind === "underline" ? "Underline" : "Highlight")}
        </span>
        <Button
          variant="danger"
          size="sm"
          autoFocus
          aria-label={`Remove ${annotation.kind === "underline" ? "underline" : "highlight"}`}
          className="shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Remove
        </Button>
      </div>
    </Floating>
  );
}
