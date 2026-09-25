import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotAvatar } from "@/components/fx/BotAvatar";
import { ImageMosaic } from "@/components/fx/ImageMosaic";
import { ThinkingOrb } from "@/components/fx/ThinkingOrb";
import { Markdown } from "@/components/Markdown";
import { orbStateFor } from "@/features/chat/Message";
import { rememberReveal, takeReveal, useSmoothText } from "@/features/chat/useSmoothText";
import { applyAudioUniforms } from "@/features/voice/orb/audio";
import { styleFlowIndexes, stylePresets } from "@/features/voice/orb/presets";
import { createPresetOrbStateConfiguration, resolveOrbStateParams } from "@/features/voice/orb/states";
import { ORB_STYLES } from "@/features/voice/orb/styles";
import { orbUniformFloatCount, writeOrbUniforms } from "@/features/voice/orb/uniforms";
import { flowDirection, svgSize, withDirection } from "@/lib/mermaid";
import { rehypeStreamWords } from "@/lib/rehype-stream-words";

describe("rehypeStreamWords", () => {
  it("wraps prose words but leaves code and math alone", () => {
    const tree = {
      type: "root",
      children: [
        { type: "element", tagName: "p", children: [{ type: "text", value: "Light drives  photosynthesis" }] },
        { type: "element", tagName: "pre", children: [{ type: "text", value: "const x = 1" }] },
        {
          type: "element",
          tagName: "span",
          properties: { className: ["katex"] },
          children: [{ type: "text", value: "E = mc^2" }],
        },
      ],
    };
    rehypeStreamWords()(tree);
    const paragraph = tree.children[0].children!;
    expect(paragraph.map((node) => (node.type === "text" ? node.value : `[${node.children![0].value}]`))).toEqual([
      "[Light]",
      " ",
      "[drives]",
      "  ",
      "[photosynthesis]",
    ]);
    expect(tree.children[1].children).toEqual([{ type: "text", value: "const x = 1" }]);
    expect(tree.children[2].children).toEqual([{ type: "text", value: "E = mc^2" }]);
  });

  it("fades words in only while animating", () => {
    const { container, rerender } = render(<Markdown text="Chlorophyll absorbs light." animateWords />);
    expect(container.querySelectorAll(".sw")).toHaveLength(3);
    rerender(<Markdown text="Chlorophyll absorbs light." />);
    expect(container.querySelectorAll(".sw")).toHaveLength(0);
  });
});

describe("mermaid helpers", () => {
  it("reads and rewrites flowchart direction", () => {
    expect(flowDirection("flowchart TD\n A-->B")).toBe("TD");
    expect(flowDirection("graph LR; A-->B")).toBe("LR");
    expect(flowDirection("flowchart\n A-->B")).toBe("TD");
    expect(flowDirection("sequenceDiagram\n A->>B: hi")).toBeNull();
    expect(withDirection("graph TD\n  A-->B", "LR")).toBe("graph LR\n  A-->B");
    expect(withDirection("```mermaid\nflowchart\nA-->B\n```", "LR")).toBe("flowchart LR\nA-->B");
  });

  it("reads natural size from the viewBox", () => {
    expect(svgSize('<svg viewBox="-8 -8 320.5 140">')).toEqual({ width: 320.5, height: 140 });
    expect(svgSize("<svg>")).toBeNull();
  });
});

describe("voice orb port", () => {
  it("packs uniforms in the shader's layout", () => {
    const values = new Float32Array(orbUniformFloatCount);
    writeOrbUniforms(values, 640, 480, 0, { style: "siri", ...stylePresets.siri });
    expect([values[0], values[1]]).toEqual([640, 480]);
    expect(values[3]).toBeCloseTo(stylePresets.siri.speed);
    expect(values[15]).toBe(styleFlowIndexes.siri);
  });

  it("idles slower and dimmer than it thinks, for every voice preset", () => {
    for (const style of ORB_STYLES) {
      const configuration = createPresetOrbStateConfiguration(style);
      const idle = resolveOrbStateParams(configuration, "idle");
      const active = resolveOrbStateParams(configuration, "thinking");
      expect(idle.speed).toBeLessThan(active.speed);
      expect(idle.exposure).toBeLessThan(active.exposure);
    }
  });

  it("modulates audio-reactive presets only, never beyond their ceilings", () => {
    const base = new Float32Array(orbUniformFloatCount);
    writeOrbUniforms(base, 100, 100, 0, { style: "voiceWave", ...stylePresets.voiceWave });
    const silent = base.slice();
    applyAudioUniforms(silent, { low: 0, mid: 0, high: 0, all: 0 });
    expect(silent).toEqual(base);
    const loud = base.slice();
    applyAudioUniforms(loud, { low: 1, mid: 1, high: 1, all: 1 });
    expect(loud[3]).toBeGreaterThan(base[3]);
    expect(loud[3]).toBeLessThanOrEqual(5);
    expect(loud[21]).toBeLessThanOrEqual(1);

    const chrome = new Float32Array(orbUniformFloatCount);
    writeOrbUniforms(chrome, 100, 100, 0, { style: "chrome", ...stylePresets.chrome });
    const untouched = chrome.slice();
    applyAudioUniforms(untouched, { low: 1, mid: 1, high: 1, all: 1 });
    expect(untouched).toEqual(chrome);
  });
});

describe("useSmoothText", () => {
  let now = 0;
  let queue: Array<FrameRequestCallback> = [];
  beforeEach(() => {
    now = 0;
    queue = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => queue.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const advance = (ms: number) =>
    act(() => {
      for (let t = 0; t < ms; t += 16) {
        now += 16;
        const due = queue;
        queue = [];
        due.forEach((callback) => callback(now));
      }
    });

  it("reveals a stream steadily, on word boundaries, and catches up", () => {
    const text = "Photosynthesis turns light into chemical energy stored in glucose.";
    const { result } = renderHook(({ value, streaming }) => useSmoothText(value, streaming), {
      initialProps: { value: text, streaming: true },
    });
    expect(result.current).toBe("");
    advance(200);
    const partial = result.current;
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan(text.length);
    expect(text.startsWith(partial)).toBe(true);
    expect(text[partial.length] === " " || partial.length === text.length).toBe(true);
    advance(1200);
    expect(result.current).toBe(text);
  });

  it("continues from a handed-off position instead of restarting", () => {
    rememberReveal("msg_1", 20);
    const from = takeReveal("msg_1");
    expect(takeReveal("msg_1")).toBeUndefined();
    const text = "Photosynthesis turns light into chemical energy stored in glucose.";
    const { result } = renderHook(() => useSmoothText(text, false, true, from));
    expect(result.current).toBe(text.slice(0, 20));
    advance(400);
    expect(result.current).toBe(text);
  });
});

describe("fx components", () => {
  it("render accessible names", () => {
    render(
      <>
        <BotAvatar type="star" state="working" size={32} />
        <ThinkingOrb state="searching" size={20} />
        <ImageMosaic src="https://example.org/a.jpg" alt="A red panda" />
      </>,
    );
    expect(screen.getByRole("img", { name: "Star tutor, working" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Searching…" })).toBeInTheDocument();
    expect(screen.getByAltText("A red panda")).toBeInTheDocument();
  });

  it("maps status labels to orb activities", () => {
    expect(orbStateFor("Searching the web")).toBe("searching");
    expect(orbStateFor("Drawing a diagram")).toBe("shaping");
    expect(orbStateFor("Making a quiz")).toBe("solving");
    expect(orbStateFor(null, true)).toBe("breathing");
    expect(orbStateFor("Working")).toBe("working");
  });
});
