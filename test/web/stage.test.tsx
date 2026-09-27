/**
 * Voice stage views: the board's graph geometry (ranges, asymptotes, ticks),
 * the magic-pen board (lines, answer ring, narration-driven reveal), the
 * single-photo view (best first, next, broken photos skipped) and the
 * "being made" placeholders.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Board } from "@shared/voice";
import { ImageGallery } from "@/features/chat/parts";
import StageBoard from "@/features/voice/stage/StageBoard";
import { StageImage } from "@/features/voice/stage/StageImage";
import { StagePending } from "@/features/voice/stage/StagePending";
import { bounds, locate } from "@/features/voice/stage/pageText";
import { niceStep, plotGeometry } from "@/features/voice/stage/plot";
import { useApp } from "@/store/app";

describe("plot geometry", () => {
  it("frames a parabola with its roots and the x axis in view", () => {
    const geometry = plotGeometry(
      {
        fns: ["x^2 - 5*x + 6"],
        xMin: -1,
        xMax: 6,
        points: [
          { x: 2, y: 0, label: "x = 2" },
          { x: 3, y: 0 },
        ],
      },
      500,
      250,
    );
    expect(geometry.paths[0]).toMatch(/^M/);
    expect(geometry.xAxis).not.toBeNull();
    expect(geometry.yAxis).not.toBeNull();
    expect(geometry.points).toHaveLength(2);
    expect(geometry.yMin).toBeLessThan(0);
  });

  it("breaks the curve at an asymptote instead of drawing a wall", () => {
    const geometry = plotGeometry({ fns: ["1/x"], xMin: -5, xMax: 5 }, 400, 240);
    expect(geometry.paths[0].match(/M/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("uses round tick steps", () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(7, 6)).toBe(2);
    expect(niceStep(0.9, 6)).toBe(0.2);
  });
});

const board: Board = {
  title: "Solving a quadratic",
  items: [
    { id: "L1", kind: "math", latex: "x^2 - 5x + 6 = 0", note: "start" },
    { id: "L2", kind: "text", text: "Two numbers: product 6, sum -5" },
    { id: "L3", kind: "math", latex: "x = 2 \\text{ or } x = 3", box: true },
  ],
};

describe("magic pen board", () => {
  it("shows every line, the margin note and the ring around the answer", () => {
    useApp.setState({ motion: false });
    const { container } = render(<StageBoard board={board} focus={null} instant />);
    expect(screen.getByText("Solving a quadratic")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-line]")).toHaveLength(3);
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("start")).toBeInTheDocument();
    expect(container.querySelector('[data-line="L3"] path')).not.toBeNull();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("writes lines as the narration reaches them", () => {
    useApp.setState({ motion: true });
    const { container, rerender } = render(<StageBoard board={board} focus={null} instant={false} />);
    expect(container.querySelectorAll("[data-line]")).toHaveLength(0);
    rerender(<StageBoard board={board} focus="L2" instant={false} />);
    expect(container.querySelectorAll("[data-line]")).toHaveLength(2);
    // Narration over: everything is on the board.
    rerender(<StageBoard board={board} focus={null} instant={false} />);
    expect(container.querySelectorAll("[data-line]")).toHaveLength(3);
    useApp.setState({ motion: false });
  });
});

describe("single photo", () => {
  const images = ["one", "two", "three"].map((name) => ({
    title: `Photo ${name}`,
    imageUrl: `https://example.com/${name}.jpg`,
    thumbnailUrl: `https://example.com/${name}-t.jpg`,
    sourceUrl: `https://example.com/${name}`,
    domain: "example.com",
  }));

  it("shows the best photo, steps through the rest and skips broken ones", () => {
    useApp.setState({ motion: false });
    render(<StageImage images={images} query="test" view={null} />);
    expect(screen.getByAltText("Photo one")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByAltText("Photo two")).toBeInTheDocument();
    act(() => {
      fireEvent.error(screen.getByAltText("Photo two"));
    });
    expect(screen.getByAltText("Photo three")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("follows voice commands", () => {
    useApp.setState({ motion: false });
    const { rerender } = render(<StageImage images={images} query="test" view={null} />);
    rerender(<StageImage images={images} query="test" view={{ view: "next", nonce: 1 }} />);
    expect(screen.getByAltText("Photo two")).toBeInTheDocument();
    rerender(<StageImage images={images} query="test" view={{ view: "previous", nonce: 2 }} />);
    expect(screen.getByAltText("Photo one")).toBeInTheDocument();
  });
});

describe("placeholders", () => {
  it("says what is on its way", () => {
    render(<StagePending kind="images" title="Tokyo" />);
    expect(screen.getByRole("status", { name: "Finding the best photo: Tokyo" })).toBeInTheDocument();
    render(<StagePending kind="build" title="solar system" />);
    expect(screen.getByRole("status", { name: "Building it: solar system" })).toBeInTheDocument();
  });
});

describe("document page text layer", () => {
  // Two lines of a page as pdf.js reports them: runs with positions.
  const runs = [
    {
      str: "Water molecules are split in a process called photolysis, releasing oxygen as a by-product. The energy of the excited",
      x: 40,
      y: 100,
      width: 520,
      height: 12,
    },
    { str: "electrons is used to make ATP and NADPH.", x: 40, y: 116, width: 190, height: 12 },
  ];

  it("finds a quote across a line break, one rectangle per line", () => {
    const rects = locate(runs, "The energy of the excited electrons is used to make ATP and NADPH.");
    expect(rects).toHaveLength(2);
    expect(rects[0].y).toBe(100);
    expect(rects[0].x).toBeGreaterThan(300);
    expect(rects[1]).toMatchObject({ x: 40, y: 116 });
    expect(bounds(rects)).toMatchObject({ y: 100, height: 28 });
  });

  it("ignores punctuation and case, and gives up cleanly when the words aren't there", () => {
    expect(locate(runs, "water molecules are split in a process called photolysis")).toHaveLength(1);
    expect(locate(runs, "the French revolution")).toEqual([]);
  });
});

describe("chat photos", () => {
  // jsdom has no image decoding; the reveal effect waits on it.
  HTMLImageElement.prototype.decode ??= () => Promise.resolve();

  const photo = (name: string) => ({
    title: `Photo ${name}`,
    imageUrl: `https://example.com/${name}.jpg`,
    thumbnailUrl: `https://example.com/${name}-t.jpg`,
    sourceUrl: `https://example.com/${name}`,
    domain: "example.com",
    width: 1600,
    height: 1000,
  });

  it("shows a single picture large, with its title and source", () => {
    useApp.setState({ motion: false });
    render(<ImageGallery images={[photo("one")]} query="iPhone 15 Pro" effect={false} />);
    expect(screen.getByText("Photo · iPhone 15 Pro")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open image/ })).toHaveLength(1);
    expect(screen.getByText("Photo one")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /example\.com/ })).toHaveAttribute("href", "https://example.com/one");
  });

  it("keeps the grid when several were asked for", () => {
    useApp.setState({ motion: false });
    render(<ImageGallery images={[photo("one"), photo("two"), photo("three")]} query="phones" effect={false} />);
    expect(screen.getByText("Images · phones")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open image/ })).toHaveLength(3);
  });
});
