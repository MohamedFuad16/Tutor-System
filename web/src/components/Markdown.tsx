/**
 * Markdown renderer for tutor answers: GFM, math (KaTeX), code (Shiki),
 * Mermaid diagrams (with narrated tours), and clickable page citations like
 * [D1 p.12] that jump the reader to that page.
 */
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import type { WebSource } from "@shared/types";
import { rehypeStreamWords } from "@/lib/rehype-stream-words";
import { useApp } from "@/store/app";
import { CodeBlock } from "./CodeBlock";
import { Diagram, DiagramSkeleton } from "./Diagram";
import type { DiagramTheme } from "@/lib/mermaid";
import { cx } from "./ui";

export type CitationDocs = Array<{ id: string; title: string }>;

type Props = {
  text: string;
  /** Documents in citation order (D1, D2, …). */
  docs?: CitationDocs;
  web?: WebSource[];
  tone?: "light" | "dark" | "paper";
  streaming?: boolean;
  /** Fade each newly arrived word in (streaming drafts). */
  animateWords?: boolean;
  className?: string;
};

/** Rewrites [D1 p.12] and [W2] into links the renderer turns into chips. */
function linkCitations(text: string) {
  return text
    .replace(
      /\[D(\d+)\s*p\.?\s*(\d+)(?:\s*[-–]\s*\d+)?\]/gi,
      (_m, doc, page) => `[p.${page}](#cite-doc-${doc}-${page})`,
    )
    .replace(/\[p\.?\s*(\d+)\](?!\()/gi, (_m, page) => `[p.${page}](#cite-doc-1-${page})`)
    .replace(/\[W(\d+)\]/g, (_m, index) => `[${index}](#cite-web-${index})`);
}

/** Hides an unterminated ```mermaid block while it is still streaming in. */
function hideOpenDiagram(text: string) {
  const fences = text.match(/```/g)?.length ?? 0;
  if (fences % 2 === 0) return { text, drawing: false };
  const start = text.lastIndexOf("```");
  const isMermaid = /^```mermaid/i.test(text.slice(start));
  return { text: isMermaid ? text.slice(0, start) : `${text}\n\`\`\``, drawing: isMermaid };
}

function Citation({
  href,
  children,
  docs,
  web,
  tone,
}: {
  href: string;
  children: ReactNode;
  docs?: CitationDocs;
  web?: WebSource[];
  tone: Props["tone"];
}) {
  const jump = useApp((state) => state.jump);
  const docMatch = href.match(/^#cite-doc-(\d+)-(\d+)$/);
  if (docMatch) {
    const doc = docs?.[Number(docMatch[1]) - 1] ?? docs?.[0];
    const page = Number(docMatch[2]);
    return (
      <button
        type="button"
        onClick={() => doc && jump(doc.id, page)}
        title={doc ? `${doc.title} — page ${page}` : `Page ${page}`}
        className={cx(
          "mx-0.5 inline-flex -translate-y-px items-center rounded-full px-1.5 py-px align-baseline font-mono text-[0.7rem] transition-colors",
          tone === "dark"
            ? "bg-white/10 text-orange-200 hover:bg-white/20"
            : "bg-orange-100 text-orange-800 hover:bg-orange-200",
        )}
      >
        {children}
      </button>
    );
  }
  const webMatch = href.match(/^#cite-web-(\d+)$/);
  if (webMatch) {
    const source = web?.[Number(webMatch[1]) - 1];
    return (
      <a
        href={source?.url}
        target="_blank"
        rel="noreferrer noopener"
        title={source?.title}
        className="mx-0.5 inline-flex -translate-y-px items-center rounded-full bg-sky-100 px-1.5 py-px align-baseline font-mono text-[0.7rem] !text-sky-800 !no-underline"
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

/** KaTeX is ~80 KB gzipped: load it only once an answer actually contains math. */
let katexPlugin: PluggableList | null = null;
let katexLoading: Promise<PluggableList> | null = null;
const hasMath = (text: string) => /\$[^$\n]+\$|\$\$|\\\(|\\\[/.test(text);

function useRehypePlugins(text: string): PluggableList {
  const needed = hasMath(text);
  const [plugins, setPlugins] = useState<PluggableList>(katexPlugin ?? []);
  useEffect(() => {
    if (!needed || katexPlugin) {
      if (katexPlugin && plugins !== katexPlugin) setPlugins(katexPlugin);
      return;
    }
    katexLoading ??= import("rehype-katex").then((module) => {
      katexPlugin = [[module.default, { throwOnError: false, strict: false }]];
      return katexPlugin;
    });
    let alive = true;
    void katexLoading.then((loaded) => alive && setPlugins(loaded));
    return () => {
      alive = false;
    };
  }, [needed, plugins]);
  return plugins;
}

export const Markdown = memo(function Markdown({
  text,
  docs,
  web,
  tone = "light",
  streaming = false,
  animateWords = false,
  className,
}: Props) {
  const prepared = useMemo(() => {
    const { text: visible, drawing } = streaming ? hideOpenDiagram(text) : { text, drawing: false };
    return { source: linkCitations(visible), drawing };
  }, [text, streaming]);

  const mathPlugins = useRehypePlugins(text);
  const rehypePlugins = useMemo<PluggableList>(
    () => (animateWords ? [...mathPlugins, rehypeStreamWords] : mathPlugins),
    [mathPlugins, animateWords],
  );
  const diagramTheme: DiagramTheme = tone === "dark" ? "dark" : tone === "paper" ? "paper" : "light";

  const components = useMemo<Components>(
    () => ({
      a: ({ href, children }) => (
        <Citation href={href ?? ""} docs={docs} web={web} tone={tone}>
          {children}
        </Citation>
      ),
      pre: ({ children }) => <>{children}</>,
      code: ({ className: codeClass, children }) => {
        const language = /language-([\w+-]+)/.exec(codeClass ?? "")?.[1] ?? "";
        const code = String(children ?? "").replace(/\n$/, "");
        const isBlock = Boolean(language) || code.includes("\n");
        if (!isBlock) return <code>{children}</code>;
        if (language === "mermaid") return <Diagram source={code} theme={diagramTheme} context={text.slice(0, 1500)} />;
        return <CodeBlock code={code} language={language} />;
      },
      img: ({ src, alt }) =>
        typeof src === "string" && /^https:\/\//.test(src) ? (
          <img src={src} alt={alt ?? ""} loading="lazy" className="max-h-80 rounded-xl" />
        ) : null,
    }),
    [docs, web, tone, diagramTheme, text],
  );

  return (
    <div className={cx("answer", tone === "dark" && "answer-dark", tone === "paper" && "answer-paper", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={rehypePlugins} components={components}>
        {prepared.source}
      </ReactMarkdown>
      {prepared.drawing && (
        <div
          className={cx(
            "my-3 overflow-hidden rounded-2xl",
            tone === "dark" ? "bg-white/[0.03] ring-1 ring-white/8" : "diagram-canvas ring-1 ring-stone-200/90",
          )}
        >
          <DiagramSkeleton tone={tone === "dark" ? "dark" : "light"} label="Sketching a diagram…" />
        </div>
      )}
    </div>
  );
});
