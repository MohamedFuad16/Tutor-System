import { describe, expect, it } from "vitest";
import { plainText } from "../../shared/guide";

describe("plainText", () => {
  it("turns number ranges into words and spaced dashes between numbers into minus signs", () => {
    expect(plainText("Use 3–5 drops, pages 12—14.")).toBe("Use 3 to 5 drops, pages 12 to 14.");
    expect(plainText("So 5 – 3 = 2.")).toBe("So 5 - 3 = 2.");
    expect(plainText("It lasted 1914–1918.")).toBe("It lasted 1914 to 1918.");
  });

  it("turns a bold term followed by a dash into a definition", () => {
    expect(plainText("**Osmosis** — water moving across a membrane.")).toBe(
      "**Osmosis**: water moving across a membrane.",
    );
    expect(plainText("**Mass** – how much matter there is.")).toBe("**Mass**: how much matter there is.");
  });

  it("turns other dashes into commas and tidies the punctuation around them", () => {
    expect(plainText("The answer — surprisingly — is four.")).toBe("The answer, surprisingly, is four.");
    expect(plainText("Plants need light—and water.")).toBe("Plants need light, and water.");
    expect(plainText("It ends here —.")).toBe("It ends here.");
    expect(plainText("First, — then second.")).toBe("First, then second.");
    expect(plainText("Stop. — Next idea.")).toBe("Stop. Next idea.");
    expect(plainText("An aside (— like this).")).toBe("An aside (like this).");
  });

  it("strips dashes at the start or end of a line", () => {
    expect(plainText("— A note\nAnother line —")).toBe("A note\nAnother line");
  });

  it("uses a colon for the first spaced dash in a title", () => {
    expect(plainText("Photosynthesis — the light reactions", "title")).toBe("Photosynthesis: the light reactions");
    expect(plainText("Cells — parts — and jobs", "title")).toBe("Cells: parts, and jobs");
  });

  it("keeps compound names joined with a hyphen", () => {
    expect(plainText("The Michaelis–Menten model")).toBe("The Michaelis-Menten model");
  });

  it("never touches hyphens, arrows, code or math", () => {
    const untouched = "A well-known step --> next -- then `a — b` and $x – y$ and $$a — b$$.";
    expect(plainText(untouched)).toBe(untouched);
    expect(plainText("Code `x—y` — and more")).toBe("Code `x—y`, and more");
    expect(plainText("```\nconst a = 1 — 2;\n```\nThen — go")).toBe("```\nconst a = 1 — 2;\n```\nThen, go");
    expect(plainText("Where $v = d / t$ — speed")).toBe("Where $v = d / t$, speed");
  });

  it("returns text without dashes unchanged", () => {
    expect(plainText("")).toBe("");
    expect(plainText("Plain words, nothing else.")).toBe("Plain words, nothing else.");
  });
});
