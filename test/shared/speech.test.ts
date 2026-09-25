import { describe, expect, it } from "vitest";
import { PhraseChunker, estimateSpeechMs, toSpeakableText } from "../../shared/speech";

describe("toSpeakableText", () => {
  it("strips markdown emphasis, headings, bullets and links", () => {
    const out = toSpeakableText(
      "## The Idea\n\n- **Chlorophyll** absorbs *light*\n- See [the docs](https://example.com/x)",
    );
    expect(out).toBe("The Idea. Chlorophyll absorbs light. See the docs.");
  });

  it("never reads code or diagram source aloud", () => {
    const out = toSpeakableText("Here:\n```python\nprint('hi')\n```\nand\n```mermaid\nflowchart TD\nA-->B\n```");
    expect(out).not.toMatch(/print|flowchart|-->/);
    expect(out).toContain("code on screen");
    expect(out).toContain("drawn it on screen");
  });

  it("reads math in words and drops citations", () => {
    expect(toSpeakableText("Energy is $E = mc^2$ [D1 p.3] [2].")).toBe("Energy is E = mc squared.");
    expect(toSpeakableText("$\\frac{a}{b}$")).toBe("a over b.");
  });

  it("keeps snake_case identifiers intact and speaks URLs as domains", () => {
    expect(toSpeakableText("Call `load_data` from https://www.python.org/docs")).toBe(
      "Call load data from python.org.",
    );
    expect(toSpeakableText("my_var_name is set")).toBe("my_var_name is set.");
  });

  it("is idempotent", () => {
    const once = toSpeakableText("**Hi** there -> friend, e.g. you.");
    expect(toSpeakableText(once)).toBe(once);
  });
});

describe("PhraseChunker", () => {
  it("emits a short first phrase quickly, then longer phrases", () => {
    const chunker = new PhraseChunker({ firstMinChars: 12, minChars: 40 });
    const out: string[] = [];
    for (const token of "Great question. Photosynthesis turns light into sugar. It happens in chloroplasts, mostly in leaves. ".match(
      /.{1,5}/g,
    )!) {
      out.push(...chunker.push(token));
    }
    out.push(...chunker.flush());
    expect(out[0]).toBe("Great question.");
    expect(out.join(" ")).toBe(
      "Great question. Photosynthesis turns light into sugar. It happens in chloroplasts, mostly in leaves.",
    );
  });

  it("does not split on decimals or abbreviations", () => {
    const chunker = new PhraseChunker({ firstMinChars: 5, minChars: 5 });
    const out = [...chunker.push("Pi is about 3.14 and Dr. Smith agrees. Next "), ...chunker.flush()];
    expect(out[0]).toBe("Pi is about 3.14 and Dr. Smith agrees.");
  });

  it("swallows code fences into one spoken pointer", () => {
    const chunker = new PhraseChunker();
    const out = [
      ...chunker.push("Look at this.\n```js\nconst a = 1;\n"),
      ...chunker.push("```\nThat is all."),
      ...chunker.flush(),
    ];
    expect(out.join(" ")).not.toContain("const");
    expect(out.join(" ")).toContain("code on screen");
    expect(out.join(" ")).toContain("That is all.");
  });

  it("forces a clause split for very long sentences", () => {
    const chunker = new PhraseChunker({ firstMinChars: 10, minChars: 20, maxChars: 80 });
    const long =
      "This sentence keeps going, with clause after clause, and it never seems to end, because the model loves commas, apparently";
    const out = chunker.push(long);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].length).toBeLessThanOrEqual(85);
  });
});

describe("estimateSpeechMs", () => {
  it("scales with words", () => {
    expect(estimateSpeechMs("one two three")).toBeGreaterThan(estimateSpeechMs("one"));
  });
});
