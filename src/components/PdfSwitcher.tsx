import React, { useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, FileText, Check, ArrowLeft } from "lucide-react";
import { useStore } from "../store";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Fractal-noise grain layered over the gradients for a filmic texture.
const GRAIN_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>",
  );

interface PdfThumbnailProps {
  url: string;
  width: number;
}

const PdfThumbnail = React.memo(function PdfThumbnail({
  url,
  width,
}: PdfThumbnailProps) {
  return (
    <Document
      file={url}
      loading={
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#ff6e00]/80" />
        </div>
      }
      error={
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/35">
          <FileText size={26} />
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Preview
          </span>
        </div>
      }
      noData={null}
    >
      <Page
        pageNumber={1}
        width={width}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </Document>
  );
});

interface PdfSwitcherProps {
  open: boolean;
  onClose: () => void;
  onAddClick: () => void;
}

export function PdfSwitcher({ open, onClose, onAddClick }: PdfSwitcherProps) {
  const pdfs = useStore((state) => state.pdfs);
  const activePdfId = useStore((state) => state.activePdfId);
  const setActivePdf = useStore((state) => state.setActivePdf);
  const removePdf = useStore((state) => state.removePdf);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pdf-switcher-section"
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0A0A0B]"
        >
          {/* Gradient bloom */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_-8%,rgba(124,58,237,0.12),transparent_46%),radial-gradient(circle_at_96%_112%,rgba(255,110,0,0.10),transparent_48%),radial-gradient(circle_at_50%_50%,rgba(56,98,255,0.05),transparent_60%)]" />
          {/* Grain over the gradient */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light"
            style={{
              backgroundImage: `url("${GRAIN_DATA_URI}")`,
              backgroundSize: "160px 160px",
            }}
          />

          <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-6 py-4 md:px-8 md:py-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to document"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-300 backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="text-base font-semibold tracking-tight text-white">
                  Document Library
                </div>
                <div className="text-xs text-white/40">
                  {pdfs.length} {pdfs.length === 1 ? "document" : "documents"} in
                  context
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close library"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-300 backdrop-blur-xl transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative z-10 grid flex-1 auto-rows-min grid-cols-2 content-start gap-4 overflow-y-auto p-6 sm:grid-cols-3 md:grid-cols-4 md:gap-5 md:p-8 lg:grid-cols-5">
              {pdfs.map((pdf) => {
                const isActive = pdf.id === activePdfId;
                return (
                  <motion.div
                    key={pdf.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="group flex flex-col gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActivePdf(pdf.id);
                        onClose();
                      }}
                      className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border bg-[#050505] transition-all duration-300 ${
                        isActive
                          ? "border-[#ff6e00]/70 shadow-[0_0_0_1px_rgba(255,110,0,0.4),0_18px_44px_rgba(255,110,0,0.18)]"
                          : "border-white/10 hover:border-white/25 hover:shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      <div className="flex h-full w-full items-start justify-center overflow-hidden [&_canvas]:!h-auto [&_canvas]:!w-full">
                        <PdfThumbnail url={pdf.url} width={220} />
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />

                      {isActive && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff6e00] text-black shadow-[0_0_16px_rgba(255,110,0,0.6)]">
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePdf(pdf.id);
                        }}
                        aria-label={`Remove ${pdf.name}`}
                        className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-300 opacity-0 backdrop-blur-md transition-all duration-200 hover:bg-red-500/25 hover:text-red-100 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    </button>

                    <div
                      className={`truncate px-1 text-center text-xs font-medium tracking-tight ${
                        isActive ? "text-[#ff6e00]" : "text-white/60"
                      }`}
                      title={pdf.name}
                    >
                      {pdf.name}
                    </div>
                  </motion.div>
                );
              })}

              <motion.div layout className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onAddClick}
                  className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-300 hover:border-[#ff6e00]/40 hover:bg-white/[0.07] hover:shadow-[0_18px_44px_rgba(255,110,0,0.12)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)] opacity-70" />
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.08]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at center, rgba(255,255,255,0.5) 1px, transparent 1px)",
                      backgroundSize: "18px 18px",
                    }}
                  />
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/80 transition-all duration-300 group-hover:scale-105 group-hover:border-[#ff6e00]/40 group-hover:bg-[#ff6e00]/15 group-hover:text-[#ff6e00]">
                    <Plus size={22} />
                  </div>
                  <span className="relative z-10 text-xs font-medium tracking-tight text-white/55 transition-colors group-hover:text-white/80">
                    Add PDF
                  </span>
                </button>
              </motion.div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
