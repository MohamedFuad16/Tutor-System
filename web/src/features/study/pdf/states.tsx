/** Reader state panels: sheet skeleton and shimmer while loading, page/document errors, and processing status. */
import { motion } from "motion/react";
import { FileWarning, RotateCw } from "lucide-react";
import type { StudyDocument } from "@shared/types";
import { Button, Spinner, cx, softSpring } from "@/components/ui";
import { useMotion } from "@/store/app";

export function SheetSkeleton({ width, height }: { width: number; height: number }) {
  return (
    <div
      role="status"
      aria-label="Loading document"
      className="relative overflow-hidden rounded-[3px] bg-white shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)]"
      style={{ width, height, fontSize: Math.max(8, width / 42) }}
    >
      <div className="flex flex-col gap-[2.2%] p-[9%]">
        <div className="mb-[4%] h-[1.1em] w-1/2 rounded bg-black/[0.07]" />
        {[100, 94, 98, 72, 0, 100, 88, 96, 60].map((line, index) =>
          line ? (
            <div key={index} className="h-[0.6em] rounded bg-black/[0.055]" style={{ width: `${line}%` }} />
          ) : (
            <div key={index} className="h-[0.8em]" />
          ),
        )}
        <div className="my-[3%] aspect-[16/8] w-full rounded-md bg-black/[0.045]" />
        {[100, 92, 97, 54].map((line, index) => (
          <div key={`b${index}`} className="h-[0.6em] rounded bg-black/[0.055]" style={{ width: `${line}%` }} />
        ))}
      </div>
      <PageShimmer />
    </div>
  );
}

export function PageShimmer({ height }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(0,0,0,0.05)_45%,rgba(255,255,255,0.6)_50%,rgba(0,0,0,0.05)_55%,transparent_70%)] bg-[length:200%_100%]"
      style={height ? { height } : undefined}
    />
  );
}

export function PageError({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center p-6 text-center text-sm text-stone-500" style={{ height }}>
      This page couldn't be rendered.
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[var(--radius-card)] border border-white/8 bg-ink-900 px-6 py-8 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-bad/10 text-bad">
        <FileWarning className="size-5" aria-hidden />
      </div>
      <h3 className="text-base text-fog-50">This PDF didn't open</h3>
      <p className="text-sm leading-relaxed text-fog-400">
        Something interrupted the download. Check your connection and try again.
        {message && <span className="mt-2 block font-mono text-[0.7rem] break-words text-fog-500">{message}</span>}
      </p>
      <Button variant="primary" size="sm" onClick={onRetry} className="mt-1">
        <RotateCw className="size-3.5" aria-hidden />
        Try again
      </Button>
    </div>
  );
}

export function DocumentStatusState({ doc }: { doc: StudyDocument }) {
  const animate = useMotion();
  const failed = doc.status === "failed";
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-ink-950 p-6">
      <motion.div
        role={failed ? "alert" : "status"}
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        className="flex max-w-sm flex-col items-center gap-4 text-center"
      >
        <div
          className={cx(
            "relative flex size-14 items-center justify-center rounded-2xl border",
            failed ? "border-bad/25 bg-bad/10 text-bad" : "border-white/8 bg-white/[0.04] text-signal",
          )}
        >
          {!failed && (
            <span aria-hidden className="absolute inset-0 animate-breathe rounded-2xl bg-signal/10 blur-md" />
          )}
          {failed ? <FileWarning className="size-6" aria-hidden /> : <Spinner className="relative size-6" />}
        </div>
        <div>
          <h3 className="text-base text-fog-50">
            {failed ? "We couldn't read this document" : "Reading your document…"}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-fog-400">
            {failed
              ? doc.error || "Something went wrong while processing the file. Try uploading it again."
              : `Extracting text and structure from “${doc.title}”. It opens here as soon as it's ready.`}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
