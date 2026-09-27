/**
 * A web page the tutor built, running live in a browser-like frame. It opens
 * with the source streaming in (the "being built" moment), then the page
 * itself wipes in. The page runs in a sandboxed frame with an opaque origin:
 * scripts work, but it can't reach Tutor's storage, cookies or window, and it
 * can't navigate the app. Source view and download are one tap away.
 */
import { AnimatePresence, motion } from "motion/react";
import { Code2, Download, Eye, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

const BUILD_MS = 1700;

export default function StageWeb({ title, html }: { title: string; html: string }) {
  const motionOn = useMotion();
  const [phase, setPhase] = useState<"building" | "live">(motionOn ? "building" : "live");
  const [shown, setShown] = useState(0);
  const [source, setSource] = useState(false);
  const [reload, setReload] = useState(0);
  const lines = useMemo(() => html.split("\n"), [html]);

  // Stream the source in quickly, then swap to the live page.
  useEffect(() => {
    if (phase !== "building") return;
    const started = performance.now();
    let frame = 0;
    const step = () => {
      const progress = Math.min(1, (performance.now() - started) / BUILD_MS);
      setShown(Math.floor(progress * html.length));
      if (progress < 1) frame = requestAnimationFrame(step);
      else setPhase("live");
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, html]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      title
        .replace(/[^\w-]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "page"
    }.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const typed = html.slice(Math.max(0, shown - 2400), shown);

  return (
    <figure className="relative">
      <div className="stage-web overflow-hidden rounded-[1.4rem] bg-[#111114] ring-1 ring-white/10">
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex min-w-0 max-w-md flex-1 items-center justify-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-fog-300">
            {phase === "building" ? (
              <span className="shimmer-text">Building {title}…</span>
            ) : (
              <span className="truncate">{title}</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setSource(!source)}
              aria-label={source ? "Show the page" : "Show the source"}
              title={source ? "Show the page" : "Show the source"}
              className="rounded-full p-1.5 text-fog-400 hover:bg-white/10 hover:text-white"
            >
              {source ? <Eye className="size-4" /> : <Code2 className="size-4" />}
            </button>
            <button
              onClick={() => setReload((value) => value + 1)}
              aria-label="Reload"
              title="Reload"
              className="rounded-full p-1.5 text-fog-400 hover:bg-white/10 hover:text-white"
            >
              <RotateCw className="size-4" />
            </button>
            <button
              onClick={download}
              aria-label="Download the page"
              title="Download"
              className="rounded-full p-1.5 text-fog-400 hover:bg-white/10 hover:text-white"
            >
              <Download className="size-4" />
            </button>
          </div>
        </div>
        <div className="relative h-[min(56vh,540px)]">
          <AnimatePresence mode="wait">
            {phase === "building" || source ? (
              <motion.pre
                key="source"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                className={cx(
                  "scroll-quiet absolute inset-0 overflow-auto p-4 font-mono text-[0.72rem] leading-relaxed text-[#a5b4fc]",
                  phase === "building" && "flex flex-col justify-end",
                )}
              >
                <code>{source && phase === "live" ? lines.join("\n") : typed}</code>
                {phase === "building" && (
                  <span className="inline-block h-3.5 w-1.5 animate-pulse bg-signal align-middle" />
                )}
              </motion.pre>
            ) : (
              <motion.iframe
                key={`live-${reload}`}
                title={title}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-modals"
                referrerPolicy="no-referrer"
                initial={motionOn ? { clipPath: "inset(0 0 100% 0)", opacity: 0.4 } : false}
                animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 size-full bg-white"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </figure>
  );
}
