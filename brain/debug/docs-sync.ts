import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "brain/reference-docs");

type DocSource = {
  id: string;
  title: string;
  packageNames: string[];
  sourceUrl: string;
  fallback: string;
};

const SOURCES: DocSource[] = [
  {
    id: "typescript",
    title: "TypeScript Handbook",
    packageNames: ["typescript"],
    sourceUrl: "https://www.typescriptlang.org/docs/",
    fallback:
      "Use strict type checking, explicit public interfaces at boundaries, discriminated unions for variant state, and avoid any unless runtime data is intentionally unknown and narrowed before use.",
  },
  {
    id: "react",
    title: "React Reference",
    packageNames: ["react", "react-dom"],
    sourceUrl: "https://react.dev/reference/react",
    fallback:
      "Keep components pure, do not mutate props or state, keep Effects synchronized with external systems only, use stable keys, and avoid unnecessary derived state.",
  },
  {
    id: "vite",
    title: "Vite Guide",
    packageNames: ["vite", "@vitejs/plugin-react"],
    sourceUrl: "https://vite.dev/guide/",
    fallback:
      "Use Vite environment variables with the VITE_ prefix for client exposure, keep server-only secrets off the client, and prefer ESM-compatible tooling.",
  },
  {
    id: "tailwind",
    title: "Tailwind CSS Docs",
    packageNames: [
      "tailwindcss",
      "@tailwindcss/vite",
      "@tailwindcss/typography",
    ],
    sourceUrl: "https://tailwindcss.com/docs/installation/using-vite",
    fallback:
      "Keep utility classes intentional and responsive, avoid dynamic class names that Tailwind cannot discover, and use semantic component structure before visual polish.",
  },
  {
    id: "motion",
    title: "Motion For React Docs",
    packageNames: ["motion"],
    sourceUrl: "https://motion.dev/docs/react",
    fallback:
      "Use motion components for animated elements, keep layout animations bounded, respect reduced motion where relevant, and avoid animating expensive layout properties in hot paths.",
  },
  {
    id: "dexie",
    title: "Dexie Docs",
    packageNames: ["dexie", "dexie-react-hooks"],
    sourceUrl: "https://dexie.org/docs/Tutorial/React",
    fallback:
      "Treat IndexedDB schema versions as migrations, keep table queries bounded, use live queries for reactive UI reads, and do not make schema changes without explicit migration intent.",
  },
  {
    id: "zustand",
    title: "Zustand Docs",
    packageNames: ["zustand"],
    sourceUrl: "https://zustand.docs.pmnd.rs/getting-started/introduction",
    fallback:
      "Keep global state focused, use selectors scoped to component needs, persist only durable user preferences, and keep transient interaction state local.",
  },
  {
    id: "playwright",
    title: "Playwright Docs",
    packageNames: ["@playwright/test", "playwright"],
    sourceUrl: "https://playwright.dev/docs/intro",
    fallback:
      "Use role-based locators, wait for user-visible state rather than fixed timeouts when possible, and cover important browser workflows with deterministic assertions.",
  },
  {
    id: "three",
    title: "Three.js Docs",
    packageNames: ["three", "react-force-graph-3d"],
    sourceUrl: "https://threejs.org/docs/",
    fallback:
      "Reuse geometries/materials when possible, dispose GPU resources when replacing them, keep animation loops bounded, and verify 3D canvases are nonblank across viewports.",
  },
  {
    id: "react-pdf",
    title: "React PDF README",
    packageNames: ["react-pdf"],
    sourceUrl: "https://github.com/wojtekmaj/react-pdf",
    fallback:
      "Configure the PDF worker, keep page rendering responsive, clean up object URLs, and keep annotations aligned with rendered page coordinates.",
  },
  {
    id: "express",
    title: "Express Routing Guide",
    packageNames: ["express"],
    sourceUrl: "https://expressjs.com/en/guide/routing.html",
    fallback:
      "Keep route handlers explicit, validate input at API boundaries, keep streaming contracts stable, and register API routes before static/Vite middleware.",
  },
  {
    id: "node",
    title: "Node.js API Docs",
    packageNames: ["node"],
    sourceUrl: "https://nodejs.org/api/",
    fallback:
      "Use filesystem and child_process APIs with explicit paths, bounded output, deterministic cwd, and careful error handling for long-running background tools.",
  },
  {
    id: "python",
    title: "Python Docs",
    packageNames: ["python"],
    sourceUrl: "https://docs.python.org/3/",
    fallback:
      "Use Python docs only when Python source is audited or generated; prefer standard library APIs and explicit virtual environment assumptions.",
  },
];

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDoc(source: DocSource) {
  try {
    const response = await fetch(source.sourceUrl, {
      headers: { "user-agent": "LearningAI brain docs sync" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return stripHtml(text).slice(0, 40_000) || source.fallback;
  } catch (error) {
    return `${source.fallback}\n\nFetch fallback: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const downloadedAt = new Date().toISOString();
  const manifest = {
    generatedAt: downloadedAt,
    policy:
      "Official docs are primary evidence; web search is secondary and must be recorded separately.",
    sources: SOURCES.map(({ fallback: _fallback, ...source }) => source),
  };

  for (const source of SOURCES) {
    const content = await fetchDoc(source);
    const file = path.join(DOCS_DIR, `${source.id}.md`);
    fs.writeFileSync(
      file,
      `# ${source.title}\n\nSource: ${source.sourceUrl}\nDownloaded: ${downloadedAt}\nPackages: ${source.packageNames.join(", ")}\n\n${content}\n`,
    );
  }

  writeJson(path.join(DOCS_DIR, "manifest.json"), manifest);
  console.log(
    JSON.stringify(
      { ok: true, downloadedAt, count: SOURCES.length, docsDir: DOCS_DIR },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
