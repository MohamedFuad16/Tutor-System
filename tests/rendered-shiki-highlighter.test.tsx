import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type HighlightOptions = {
  lang: string;
  theme: string;
};

type MockHighlighter = {
  getLoadedLanguages: ReturnType<typeof vi.fn<() => string[]>>;
  codeToHtml: ReturnType<
    typeof vi.fn<(code: string, options: HighlightOptions) => string>
  >;
};

type HighlighterConfiguration = {
  themes: Array<{ name: string }>;
  langs: Array<{ name: string }>;
  engine: { name: string };
};

const loadedLanguages = [
  "javascript",
  "typescript",
  "python",
  "json",
  "bash",
  "html",
  "css",
];

const shikiMocks = vi.hoisted(() => {
  let resolveHighlighter: ((highlighter: MockHighlighter) => void) | undefined;

  const theme = { name: "vitesse-dark" };
  const languageModules = [
    { name: "javascript" },
    { name: "typescript" },
    { name: "python" },
    { name: "json" },
    { name: "bash" },
    { name: "html" },
    { name: "css" },
  ];
  const engine = { name: "mock-regex-engine" };
  const highlighter: MockHighlighter = {
    getLoadedLanguages: vi.fn(() => languageModules.map(({ name }) => name)),
    codeToHtml: vi.fn((code: string, options: HighlightOptions) => {
      return `<pre data-language="${options.lang}" data-theme="${options.theme}"><code><span class="token-keyword">${code}</span></code></pre>`;
    }),
  };

  const highlighterPromise = new Promise<MockHighlighter>((resolve) => {
    resolveHighlighter = resolve;
  });

  return {
    createHighlighterCore: vi.fn(
      (_configuration: HighlighterConfiguration) => highlighterPromise,
    ),
    createJavaScriptRegexEngine: vi.fn(() => engine),
    engine,
    highlighter,
    highlighterPromise,
    languageModules,
    resolveHighlighter: () => {
      if (!resolveHighlighter) {
        throw new Error("Mock highlighter resolver was not initialized.");
      }
      resolveHighlighter(highlighter);
    },
    theme,
  };
});

vi.mock("shiki/core", () => ({
  createHighlighterCore: shikiMocks.createHighlighterCore,
}));

vi.mock("shiki/engine/javascript", () => ({
  createJavaScriptRegexEngine: shikiMocks.createJavaScriptRegexEngine,
}));

vi.mock("@shikijs/themes/vitesse-dark", () => ({
  default: shikiMocks.theme,
}));

vi.mock("@shikijs/langs/javascript", () => ({
  default: shikiMocks.languageModules[0],
}));

vi.mock("@shikijs/langs/typescript", () => ({
  default: shikiMocks.languageModules[1],
}));

vi.mock("@shikijs/langs/python", () => ({
  default: shikiMocks.languageModules[2],
}));

vi.mock("@shikijs/langs/json", () => ({
  default: shikiMocks.languageModules[3],
}));

vi.mock("@shikijs/langs/bash", () => ({
  default: shikiMocks.languageModules[4],
}));

vi.mock("@shikijs/langs/html", () => ({
  default: shikiMocks.languageModules[5],
}));

vi.mock("@shikijs/langs/css", () => ({
  default: shikiMocks.languageModules[6],
}));

import { ShikiHighlighter } from "../src/components/ShikiHighlighter";

function highlightedHtml(code: string, options: HighlightOptions) {
  return `<pre data-language="${options.lang}" data-theme="${options.theme}"><code><span class="token-keyword">${code}</span></code></pre>`;
}

beforeEach(() => {
  shikiMocks.highlighter.getLoadedLanguages
    .mockReset()
    .mockReturnValue(loadedLanguages);
  shikiMocks.highlighter.codeToHtml
    .mockReset()
    .mockImplementation(highlightedHtml);
});

describe.sequential("rendered ShikiHighlighter", () => {
  it("renders a stable loading state while initializing every bundled dependency", async () => {
    const { container } = render(
      <ShikiHighlighter code="const pending = true;" language="javascript" />,
    );

    expect(screen.getByText("Preparing syntax...")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("animate-pulse", "h-24");

    await waitFor(() => {
      expect(shikiMocks.createHighlighterCore).toHaveBeenCalledOnce();
    });

    expect(shikiMocks.createJavaScriptRegexEngine).toHaveBeenCalledOnce();
    expect(shikiMocks.createHighlighterCore).toHaveBeenCalledWith({
      themes: [shikiMocks.theme],
      langs: shikiMocks.languageModules,
      engine: shikiMocks.engine,
    });
  });

  it("uses the default loading-state shape when embedded is omitted", () => {
    const { container } = render(
      <ShikiHighlighter code="pending" language="javascript" />,
    );

    expect(container.firstElementChild).toHaveClass(
      "rounded-lg",
      "animate-pulse",
      "bg-white/5",
      "h-24",
      "w-full",
    );
    expect(container.firstElementChild).not.toHaveClass(
      "rounded-none",
      "border-0",
      "my-0",
    );
  });

  it("uses the embedded loading-state shape when requested", () => {
    const { container } = render(
      <ShikiHighlighter code="pending" language="javascript" embedded />,
    );

    expect(container.firstElementChild).toHaveClass(
      "rounded-none",
      "border-0",
      "my-0",
      "animate-pulse",
    );
    expect(container.firstElementChild).not.toHaveClass("rounded-lg");
  });

  it("shares the pending highlighter initialization across component instances", () => {
    render(
      <>
        <ShikiHighlighter code="first" language="javascript" />
        <ShikiHighlighter code="second" language="python" />
      </>,
    );

    expect(screen.getAllByText("Preparing syntax...")).toHaveLength(2);
    expect(shikiMocks.createHighlighterCore).not.toHaveBeenCalled();
  });

  it("ignores stale async results and safely handles an unmounted pending instance", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { container, rerender } = render(
      <ShikiHighlighter code="const stale = true;" language="javascript" />,
    );
    const pendingUnmount = render(
      <ShikiHighlighter code="print('unmounted')" language="python" />,
    );

    rerender(
      <ShikiHighlighter code="const current = true;" language="typescript" />,
    );
    pendingUnmount.unmount();

    await act(async () => {
      shikiMocks.resolveHighlighter();
      await shikiMocks.highlighterPromise;
    });

    await waitFor(() => {
      expect(container.querySelector("code")).toHaveTextContent(
        "const current = true;",
      );
    });

    expect(container).not.toHaveTextContent("const stale = true;");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each(loadedLanguages)(
    "passes the bundled %s language through to the highlighter",
    async (language) => {
      const code = `sample for ${language}`;
      const { container } = render(
        <ShikiHighlighter code={code} language={language} />,
      );

      await waitFor(() => {
        expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(code, {
          lang: language,
          theme: "vitesse-dark",
        });
      });

      expect(container.querySelector("pre")).toHaveAttribute(
        "data-language",
        language,
      );
    },
  );

  it("falls back to text when the requested language is not loaded", async () => {
    const { container } = render(
      <ShikiHighlighter code="unknown syntax" language="not-a-language" />,
    );

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(
        "unknown syntax",
        {
          lang: "text",
          theme: "vitesse-dark",
        },
      );
    });

    expect(container.querySelector("pre")).toHaveAttribute(
      "data-language",
      "text",
    );
  });

  it("falls back to text for an empty language prop", async () => {
    render(<ShikiHighlighter code="plain" language="" />);

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith("plain", {
        lang: "text",
        theme: "vitesse-dark",
      });
    });
  });

  it("treats loaded-language matching as case-sensitive", async () => {
    render(<ShikiHighlighter code="const value = 1" language="JavaScript" />);

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(
        "const value = 1",
        {
          lang: "text",
          theme: "vitesse-dark",
        },
      );
    });
  });

  it("passes through a custom language reported by the highlighter", async () => {
    shikiMocks.highlighter.getLoadedLanguages.mockReturnValue(["custom-lang"]);

    render(<ShikiHighlighter code="custom syntax" language="custom-lang" />);

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(
        "custom syntax",
        {
          lang: "custom-lang",
          theme: "vitesse-dark",
        },
      );
    });
  });

  it("performs one loaded-language lookup and one highlight call per render", async () => {
    render(
      <ShikiHighlighter code="const once = true;" language="javascript" />,
    );

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledOnce();
    });

    expect(shikiMocks.highlighter.getLoadedLanguages).toHaveBeenCalledOnce();
  });

  it("always requests the bundled vitesse-dark theme", async () => {
    render(<ShikiHighlighter code="print('theme')" language="python" />);

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(
        "print('theme')",
        {
          lang: "python",
          theme: "vitesse-dark",
        },
      );
    });
  });

  it("renders successful highlighted HTML returned by the dependency", async () => {
    const { container } = render(
      <ShikiHighlighter code="let answer = 42;" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".token-keyword")).toHaveTextContent(
        "let answer = 42;",
      );
    });

    expect(container.querySelector("pre")).toHaveAttribute(
      "data-theme",
      "vitesse-dark",
    );
  });

  it("passes an empty code prop through without substituting content", async () => {
    const { container } = render(
      <ShikiHighlighter code="" language="javascript" />,
    );

    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith("", {
        lang: "javascript",
        theme: "vitesse-dark",
      });
    });

    expect(container.querySelector("code")?.textContent).toBe("");
    expect(container.querySelector(".token-keyword")).toBeInTheDocument();
  });

  it("preserves whitespace-only code", async () => {
    const code = "   \n\t  ";
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });

    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(code, {
      lang: "javascript",
      theme: "vitesse-dark",
    });
  });

  it("preserves multiline code", async () => {
    const code = "function sum(a, b) {\n  return a + b;\n}";
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });
  });

  it("passes long code through without truncation", async () => {
    const code = Array.from(
      { length: 250 },
      (_, index) => `const value${index} = ${index};`,
    ).join("\n");
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });
    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(code, {
      lang: "javascript",
      theme: "vitesse-dark",
    });
  });

  it("preserves Unicode code content", async () => {
    const code = 'const greeting = "こんにちは世界"; // café';
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });
  });

  it("preserves punctuation-heavy code content", async () => {
    const code = `const regex = /[A-Z]+\\s?/g; // "quoted" & 'single'`;
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });
  });

  it("renders nested token markup returned by the highlighter", async () => {
    shikiMocks.highlighter.codeToHtml.mockReturnValue(
      '<pre><code><span class="line"><span class="keyword">const</span> value</span></code></pre>',
    );
    const { container } = render(
      <ShikiHighlighter code="const value" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".keyword")).toHaveTextContent("const");
    });
    expect(container.querySelector(".line")).toHaveTextContent("const value");
  });

  it("retains semantic pre and code elements from highlighted output", async () => {
    const { container } = render(
      <ShikiHighlighter code="echo semantic" language="bash" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre code")).toHaveTextContent(
        "echo semantic",
      );
    });
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(container.querySelectorAll("code")).toHaveLength(1);
  });

  it("removes the loading message after successful highlighting", async () => {
    render(<ShikiHighlighter code="body {}" language="css" />);

    expect(screen.getByText("Preparing syntax...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Preparing syntax...")).not.toBeInTheDocument();
    });
  });

  it("preserves attributes returned by the highlighting dependency", async () => {
    shikiMocks.highlighter.codeToHtml.mockReturnValue(
      '<pre data-custom="kept"><code aria-label="highlighted code">kept</code></pre>',
    );
    const { container } = render(
      <ShikiHighlighter code="kept" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre")).toHaveAttribute(
        "data-custom",
        "kept",
      );
    });
    expect(container.querySelector("code")).toHaveAttribute(
      "aria-label",
      "highlighted code",
    );
  });

  it("renders multiple instances with independent content and languages", async () => {
    const { container } = render(
      <>
        <ShikiHighlighter code="const one = 1;" language="javascript" />
        <ShikiHighlighter code="print('two')" language="python" />
      </>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll("pre")).toHaveLength(2);
    });
    expect(container.querySelectorAll("pre")[0]).toHaveAttribute(
      "data-language",
      "javascript",
    );
    expect(container.querySelectorAll("pre")[1]).toHaveAttribute(
      "data-language",
      "python",
    );
    expect(container.querySelectorAll("code")[0]).toHaveTextContent(
      "const one = 1;",
    );
    expect(container.querySelectorAll("code")[1]).toHaveTextContent(
      "print('two')",
    );
  });

  it("uses the default highlighted wrapper classes", async () => {
    const { container } = render(
      <ShikiHighlighter code="default wrapper" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre")).toBeInTheDocument();
    });
    expect(container.firstElementChild).toHaveClass(
      "my-4",
      "rounded-lg",
      "border",
      "border-white/10",
      "text-[13px]",
      "overflow-hidden",
    );
    expect(container.firstElementChild).not.toHaveClass("rounded-none");
  });

  it("uses the embedded highlighted wrapper classes", async () => {
    const { container } = render(
      <ShikiHighlighter
        code="embedded wrapper"
        language="javascript"
        embedded
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre")).toBeInTheDocument();
    });
    expect(container.firstElementChild).toHaveClass(
      "my-0",
      "rounded-none",
      "border-0",
      "text-[13px]",
      "overflow-hidden",
    );
    expect(container.firstElementChild).not.toHaveClass("my-4", "rounded-lg");
  });

  it("updates embedded wrapper styling without re-highlighting", async () => {
    const { container, rerender } = render(
      <ShikiHighlighter code="stable code" language="javascript" />,
    );
    await waitFor(() => {
      expect(container.querySelector("pre")).toBeInTheDocument();
    });
    shikiMocks.highlighter.codeToHtml.mockClear();

    rerender(
      <ShikiHighlighter code="stable code" language="javascript" embedded />,
    );

    expect(container.firstElementChild).toHaveClass("my-0", "rounded-none");
    expect(shikiMocks.highlighter.codeToHtml).not.toHaveBeenCalled();
  });

  it("re-highlights and updates content when the code prop changes", async () => {
    const { container, rerender } = render(
      <ShikiHighlighter code="const before = 1;" language="javascript" />,
    );
    await waitFor(() => {
      expect(container.querySelector("code")).toHaveTextContent(
        "const before = 1;",
      );
    });
    shikiMocks.highlighter.codeToHtml.mockClear();

    rerender(
      <ShikiHighlighter code="const after = 2;" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")).toHaveTextContent(
        "const after = 2;",
      );
    });
    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledOnce();
  });

  it("re-highlights with the new language when the language prop changes", async () => {
    const { container, rerender } = render(
      <ShikiHighlighter code="shared code" language="javascript" />,
    );
    await waitFor(() => {
      expect(container.querySelector("pre")).toHaveAttribute(
        "data-language",
        "javascript",
      );
    });
    shikiMocks.highlighter.codeToHtml.mockClear();

    rerender(<ShikiHighlighter code="shared code" language="typescript" />);

    await waitFor(() => {
      expect(container.querySelector("pre")).toHaveAttribute(
        "data-language",
        "typescript",
      );
    });
    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith(
      "shared code",
      {
        lang: "typescript",
        theme: "vitesse-dark",
      },
    );
  });

  it("does not re-highlight when code and language props are unchanged", async () => {
    const { rerender } = render(
      <ShikiHighlighter code="unchanged" language="javascript" />,
    );
    await waitFor(() => {
      expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledOnce();
    });
    shikiMocks.highlighter.codeToHtml.mockClear();

    rerender(<ShikiHighlighter code="unchanged" language="javascript" />);

    expect(shikiMocks.highlighter.codeToHtml).not.toHaveBeenCalled();
  });

  it("keeps only the latest result after rapid code rerenders", async () => {
    const { container, rerender } = render(
      <ShikiHighlighter code="first" language="javascript" />,
    );
    rerender(<ShikiHighlighter code="second" language="javascript" />);
    rerender(<ShikiHighlighter code="third" language="javascript" />);

    await waitFor(() => {
      expect(container.querySelector("code")).toHaveTextContent("third");
    });
    expect(container).not.toHaveTextContent("first");
    expect(container).not.toHaveTextContent("second");
  });

  it("keeps only the latest result after rapid language rerenders", async () => {
    const { container, rerender } = render(
      <ShikiHighlighter code="shared" language="javascript" />,
    );
    rerender(<ShikiHighlighter code="shared" language="python" />);
    rerender(<ShikiHighlighter code="shared" language="css" />);

    await waitFor(() => {
      expect(container.querySelector("pre")).toHaveAttribute(
        "data-language",
        "css",
      );
    });
    expect(container.querySelector("pre")).not.toHaveAttribute(
      "data-language",
      "javascript",
    );
  });

  it("replaces old highlighted markup after a code rerender", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation((code) => {
      return `<pre><code><span data-version="${code}">${code}</span></code></pre>`;
    });
    const { container, rerender } = render(
      <ShikiHighlighter code="old" language="javascript" />,
    );
    await waitFor(() => {
      expect(
        container.querySelector('[data-version="old"]'),
      ).toBeInTheDocument();
    });

    rerender(<ShikiHighlighter code="new" language="javascript" />);

    await waitFor(() => {
      expect(
        container.querySelector('[data-version="new"]'),
      ).toBeInTheDocument();
    });
    expect(
      container.querySelector('[data-version="old"]'),
    ).not.toBeInTheDocument();
  });

  it("avoids a state-update warning when unmounted after initialization", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { unmount } = render(
      <ShikiHighlighter code="unmount now" language="javascript" />,
    );

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("escapes angle brackets in the plain-code fallback", async () => {
    const unsafeCode = "<script>alert('x')</script>";
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code={unsafeCode} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre code")).toHaveTextContent(unsafeCode);
    });
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("code")?.innerHTML).toContain(
      "&lt;script&gt;",
    );
  });

  it("escapes ampersands in the plain-code fallback", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code="left & right" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.innerHTML).toBe(
        "left &amp; right",
      );
    });
  });

  it("preserves double and single quotes as plain fallback text", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code={`"double" and 'single'`} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(
        `"double" and 'single'`,
      );
    });
    expect(container.querySelector("code")?.children).toHaveLength(0);
  });

  it("preserves multiline content in the plain-code fallback", async () => {
    const code = "line one\n  line two\n\tline three";
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code={code} language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("code")?.textContent).toBe(code);
    });
  });

  it("uses text language lookup before rendering a fallback for an unknown language", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code="unknown" language="unknown-lang" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre code")).toHaveTextContent("unknown");
    });
    expect(shikiMocks.highlighter.codeToHtml).toHaveBeenCalledWith("unknown", {
      lang: "text",
      theme: "vitesse-dark",
    });
  });

  it("recovers from a highlighting error after the code prop changes", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container, rerender } = render(
      <ShikiHighlighter code="<broken>" language="javascript" />,
    );
    await waitFor(() => {
      expect(container.querySelector("code")?.innerHTML).toBe("&lt;broken&gt;");
    });

    shikiMocks.highlighter.codeToHtml.mockImplementation(highlightedHtml);
    rerender(
      <ShikiHighlighter code="const recovered = true;" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".token-keyword")).toHaveTextContent(
        "const recovered = true;",
      );
    });
  });

  it("recovers from a highlighting error after the language prop changes", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container, rerender } = render(
      <ShikiHighlighter code="shared recovery" language="javascript" />,
    );
    await waitFor(() => {
      expect(container.querySelector("pre code")).toHaveTextContent(
        "shared recovery",
      );
    });

    shikiMocks.highlighter.codeToHtml.mockImplementation(highlightedHtml);
    rerender(<ShikiHighlighter code="shared recovery" language="python" />);

    await waitFor(() => {
      expect(container.querySelector("pre")).toHaveAttribute(
        "data-language",
        "python",
      );
    });
  });

  it("does not let a stale failed render replace a succeeding rerender", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation((code, options) => {
      if (code === "<broken>") {
        throw new Error("Mock highlighting failure");
      }
      return highlightedHtml(code, options);
    });
    const { container, rerender } = render(
      <ShikiHighlighter code="<broken>" language="javascript" />,
    );

    rerender(
      <ShikiHighlighter code="const fixed = true;" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".token-keyword")).toHaveTextContent(
        "const fixed = true;",
      );
    });
    expect(container.querySelector("code")?.innerHTML).not.toContain(
      "&lt;broken&gt;",
    );
  });

  it("renders the fallback with semantic pre and code elements", async () => {
    shikiMocks.highlighter.codeToHtml.mockImplementation(() => {
      throw new Error("Mock highlighting failure");
    });
    const { container } = render(
      <ShikiHighlighter code="plain fallback" language="javascript" />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre code")).toHaveTextContent(
        "plain fallback",
      );
    });
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(container.querySelectorAll("code")).toHaveLength(1);
    expect(screen.queryByText("Preparing syntax...")).not.toBeInTheDocument();
  });
});
