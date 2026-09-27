/**
 * One photo, presented well: the best result (ranked on the server) opens
 * through an iris of light, sharpens from a blur, gets one light sweep and
 * then drifts slowly (a gentle Ken Burns). A blurred copy fills the frame
 * behind it so any aspect ratio looks intentional. "Next" (by voice or the
 * arrows) moves through the other results; a photo that fails to load is
 * skipped automatically.
 */
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { WebImage } from "@shared/types";
import type { StageView } from "@shared/voice";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

export function StageImage({
  images,
  query,
  view,
}: {
  images: WebImage[];
  query: string;
  /** Latest view command for this visual ("next", "zoom_in", …) with a nonce so repeats register. */
  view: { view: StageView; nonce: number } | null;
}) {
  const motionOn = useMotion();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(1);

  const usable = images.map((_, i) => i).filter((i) => !failed.has(i));
  const step = (direction: 1 | -1) => {
    if (usable.length < 2) return;
    const position = usable.indexOf(index);
    setIndex(usable[(position + direction + usable.length) % usable.length]);
    setZoom(1);
  };

  useEffect(() => {
    if (!view) return;
    if (view.view === "next") step(1);
    else if (view.view === "previous") step(-1);
    else if (view.view === "zoom_in") setZoom((value) => Math.min(2.4, value * 1.45));
    else if (view.view === "zoom_out") setZoom((value) => Math.max(1, value / 1.45));
    else if (view.view === "reset") setZoom(1);
    // Only a new command should move the photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.nonce]);

  const image = images[index];
  if (!image) return null;
  const skip = () => {
    const remaining = usable.filter((i) => i !== index);
    setFailed((current) => new Set(current).add(index));
    const next = remaining.find((i) => i > index) ?? remaining[0];
    if (next !== undefined) setIndex(next);
  };
  const ready = loaded.has(index);

  return (
    <figure className="relative">
      <div className="stage-photo relative isolate flex h-[min(58vh,560px)] items-center justify-center overflow-hidden rounded-[1.4rem] bg-black/40">
        {/* The same photo, blurred, fills the frame behind it. */}
        <AnimatePresence>
          <motion.img
            key={`bg-${index}`}
            src={image.thumbnailUrl || image.imageUrl}
            alt=""
            aria-hidden
            referrerPolicy="no-referrer"
            className="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-45 blur-2xl saturate-150"
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 0.45 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        </AnimatePresence>

        {!ready && (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center">
            <span className="summon-rings" />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={index}
            className="relative flex size-full items-center justify-center"
            initial={motionOn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
            transition={{ duration: 0.45 }}
          >
            <div className={cx("flex size-full items-center justify-center", ready && motionOn && "ken-burns")}>
              <motion.img
                src={image.imageUrl}
                alt={image.title || query}
                referrerPolicy="no-referrer"
                onLoad={() => setLoaded((current) => new Set(current).add(index))}
                onError={skip}
                className="max-h-full max-w-full object-contain"
                initial={
                  motionOn
                    ? {
                        clipPath: "circle(0% at 50% 50%)",
                        filter: "blur(26px) saturate(1.8) brightness(1.4)",
                        scale: 1.1,
                      }
                    : false
                }
                animate={
                  ready
                    ? { clipPath: "circle(80% at 50% 50%)", filter: "blur(0px) saturate(1) brightness(1)", scale: zoom }
                    : undefined
                }
                transition={{
                  duration: 1.25,
                  ease: REVEAL_EASE,
                  scale: { type: "spring", stiffness: 120, damping: 20 },
                }}
                draggable={false}
              />
            </div>
            {ready && motionOn && <span aria-hidden className="light-sweep" />}
          </motion.div>
        </AnimatePresence>

        {usable.length > 1 && (
          <>
            <button
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white/85 opacity-70 backdrop-blur-md transition hover:bg-black/55 hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white/85 opacity-70 backdrop-blur-md transition hover:bg-black/55 hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
      <figcaption className="mt-3 flex items-center gap-3 px-1 text-xs text-fog-400">
        <span className="min-w-0 flex-1 truncate">
          <span className="text-fog-200">{image.title || query}</span>
        </span>
        {usable.length > 1 && (
          <span className="shrink-0 font-mono tabular-nums">
            {usable.indexOf(index) + 1} / {usable.length}
          </span>
        )}
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="flex shrink-0 items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 hover:bg-white/12 hover:text-white"
        >
          {image.domain} <ExternalLink className="size-3" />
        </a>
      </figcaption>
    </figure>
  );
}
