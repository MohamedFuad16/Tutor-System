/** pdf.js setup for react-pdf: registers the worker on import and exports the shared `<Document>` options. */
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

/** cMaps + standard fonts are required for CJK text; served by vite.config.ts. */
export const PDF_OPTIONS = {
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
};
