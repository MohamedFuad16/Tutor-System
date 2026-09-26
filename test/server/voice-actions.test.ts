import { describe, expect, it } from "vitest";
import { ActionTagFilter, parseActionTag } from "../../server/voice/actions";

describe("voice action tags", () => {
  it("parses image and deep-work tags", () => {
    expect(parseActionTag("images: red panda")).toEqual({ kind: "images", query: "red panda" });
    expect(parseActionTag(" Image : autumn leaves ")).toEqual({ kind: "images", query: "autumn leaves" });
    expect(parseActionTag("deep diagram: the Calvin cycle")).toEqual({
      kind: "deep",
      mode: "diagram",
      task: "the Calvin cycle",
    });
    expect(parseActionTag("deep: compare chapters 2 and 3")).toMatchObject({ kind: "deep", mode: "explain" });
    expect(parseActionTag("deep poem: write one")).toMatchObject({ mode: "explain" });
    expect(parseActionTag("just brackets")).toBeNull();
  });

  it("strips tags split across deltas and never speaks them", () => {
    const filter = new ActionTagFilter();
    const deltas = [
      "Chlorophyll fades in autumn. [",
      "[ima",
      "ges: autumn leaves]",
      "] It reveals yellow",
      " pigments.",
    ];
    let spoken = "";
    const actions = [];
    for (const delta of deltas) {
      const out = filter.push(delta);
      spoken += out.text;
      actions.push(...out.actions);
    }
    spoken += filter.flush();
    expect(spoken).toBe("Chlorophyll fades in autumn.  It reveals yellow pigments.");
    expect(actions).toEqual([{ kind: "images", query: "autumn leaves" }]);
  });

  it("keeps ordinary brackets and drops an unterminated tag at the end", () => {
    const filter = new ActionTagFilter();
    const a = filter.push("Array [1, 2] is fine. [[deep diagram: flow");
    expect(a.text).toBe("Array [1, 2] is fine. ");
    expect(filter.flush()).toBe("");
    const b = new ActionTagFilter();
    expect(b.push("Unknown [[tag]] here").text).toBe("Unknown  here");
  });
});
