import React, { useEffect, useState } from "react";

type TutorHighlighter = {
  getLoadedLanguages: () => string[];
  codeToHtml: (
    code: string,
    options: { lang: string; theme: string },
  ) => string;
};

let highlighterPromise: Promise<TutorHighlighter> | null = null;

function createTutorHighlighter() {
  return Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
    import("@shikijs/themes/vitesse-dark"),
    import("@shikijs/langs/javascript"),
    import("@shikijs/langs/typescript"),
    import("@shikijs/langs/python"),
    import("@shikijs/langs/json"),
    import("@shikijs/langs/bash"),
    import("@shikijs/langs/html"),
    import("@shikijs/langs/css"),
  ]).then(
    ([
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      vitesseDark,
      javascript,
      typescript,
      python,
      json,
      bash,
      html,
      css,
    ]) =>
      createHighlighterCore({
        themes: [vitesseDark.default],
        langs: [
          javascript.default,
          typescript.default,
          python.default,
          json.default,
          bash.default,
          html.default,
          css.default,
        ],
        engine: createJavaScriptRegexEngine(),
      }),
  );
}

export function ShikiHighlighter({
  code,
  language,
  embedded = false,
}: {
  code: string;
  language: string;
  embedded?: boolean;
}) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    if (!highlighterPromise) {
      highlighterPromise = createTutorHighlighter();
    }

    highlighterPromise.then((hl) => {
      const escapeHtml = (unsafe: string) => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      try {
        const validLang = hl.getLoadedLanguages().includes(language)
          ? language
          : "text";
        const out = hl.codeToHtml(code, {
          lang: validLang,
          theme: "vitesse-dark",
        });
        if (!cancelled) setHtml(out);
      } catch (err) {
        if (!cancelled) setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (!html) {
    return (
      <div
        className={`${embedded ? "rounded-none border-0 my-0" : "rounded-lg"} animate-pulse bg-white/5 h-24 w-full flex items-center justify-center`}
      >
        <span className="text-xs text-zinc-500 font-mono">
          Preparing syntax...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? "my-0 rounded-none border-0 [&>pre]:!bg-[#030303] [&>pre]:!p-5" : "my-4 rounded-lg border border-white/10 [&>pre]:!bg-[#121212] [&>pre]:!p-4"} text-[13px] overflow-hidden [&>pre]:!m-0 [&>pre]:overflow-x-auto`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
