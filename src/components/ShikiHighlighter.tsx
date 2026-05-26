import React, { useEffect, useState } from 'react';
import { createHighlighter, Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

export function ShikiHighlighter({ code, language, embedded = false }: { code: string; language: string; embedded?: boolean }) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: ['vitesse-dark'],
        langs: ['javascript', 'typescript', 'python', 'json', 'bash', 'html', 'css'],
      });
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
        const validLang = hl.getLoadedLanguages().includes(language) ? language : 'text';
        const out = hl.codeToHtml(code, {
          lang: validLang,
          theme: 'vitesse-dark',
        });
        setHtml(out);
      } catch (err) {
        setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
      }
    });
  }, [code, language]);

  if (!html) {
    return (
      <div className={`${embedded ? 'rounded-none border-0 my-0' : 'rounded-lg'} animate-pulse bg-white/5 h-24 w-full flex items-center justify-center`}>
        <span className="text-xs text-zinc-500 font-mono">Preparing syntax...</span>
      </div>
    );
  }

  return (
    <div 
      className={`${embedded ? 'my-0 rounded-none border-0 [&>pre]:!bg-[#030303] [&>pre]:!p-5' : 'my-4 rounded-lg border border-white/10 [&>pre]:!bg-[#121212] [&>pre]:!p-4'} text-[13px] overflow-hidden [&>pre]:!m-0 [&>pre]:overflow-x-auto`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
