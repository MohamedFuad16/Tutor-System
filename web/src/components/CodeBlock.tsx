/**
 * Syntax-highlighted code (Shiki core + JS regex engine, loaded lazily with
 * a curated language set to keep the bundle small).
 */
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "./ui";

type Highlighter = {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
  getLoadedLanguages: () => string[];
};
let highlighter: Promise<Highlighter> | null = null;

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  jsx: "javascript",
  tsx: "tsx",
  yml: "yaml",
  "c++": "cpp",
};

function load() {
  highlighter ??= Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
    import("@shikijs/themes/github-dark-default"),
    import("@shikijs/langs/javascript"),
    import("@shikijs/langs/typescript"),
    import("@shikijs/langs/tsx"),
    import("@shikijs/langs/python"),
    import("@shikijs/langs/json"),
    import("@shikijs/langs/bash"),
    import("@shikijs/langs/html"),
    import("@shikijs/langs/css"),
    import("@shikijs/langs/sql"),
    import("@shikijs/langs/java"),
    import("@shikijs/langs/cpp"),
    import("@shikijs/langs/go"),
    import("@shikijs/langs/rust"),
    import("@shikijs/langs/yaml"),
  ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme, ...langs]) =>
    createHighlighterCore({
      themes: [theme.default],
      langs: langs.map((lang) => lang.default),
      engine: createJavaScriptRegexEngine(),
    }),
  ) as Promise<Highlighter>;
  return highlighter;
}

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const lang = ALIASES[language] ?? language;
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((hl) => {
        if (cancelled || !hl.getLoadedLanguages().includes(lang)) return;
        setHtml(hl.codeToHtml(code, { lang, theme: "github-dark-default" }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="not-prose my-3 overflow-hidden rounded-2xl bg-[#0d1117] ring-1 ring-black/10">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-2">
        <span className="font-mono text-[0.7rem] tracking-wide text-fog-400 uppercase">{language || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-fog-400 transition-colors hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {html ? (
        <div
          className="scroll-quiet overflow-x-auto p-4 text-[0.82rem] leading-relaxed [&_pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className={cx("scroll-quiet overflow-x-auto p-4 font-mono text-[0.82rem] leading-relaxed text-fog-200")}>
          {code}
        </pre>
      )}
    </div>
  );
}
