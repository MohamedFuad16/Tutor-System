import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gsap } from "gsap";

import { PatternCard, themes } from "../src/components/PatternCard";
import { useStore } from "../src/store";

const installMatchMedia = (matches = false) => {
  const listeners = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: listeners.addEventListener,
      removeEventListener: listeners.removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  return listeners;
};

const resetUiStore = () => {
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    animationsEnabled: false,
    language: "en",
    learnerName: "Learner",
  });
};

const renderPatternCard = (
  props: Partial<ComponentProps<typeof PatternCard>> = {},
  child: React.ReactNode = <span>Open study card</span>,
) => {
  const theme = themes[0];

  return render(
    <PatternCard
      bgClass={theme.bg}
      bloomColor={theme.bloom}
      bloomOpacity={theme.bloomOpacity}
      SvgComponent={theme.SvgComponent}
      {...props}
    >
      {child}
    </PatternCard>,
  );
};

beforeEach(() => {
  installMatchMedia(false);
  resetUiStore();
  vi.clearAllMocks();
});

describe("PatternCard theme contracts", () => {
  it("exports the three rendered card themes used by StudyView", () => {
    expect(themes).toHaveLength(3);
  });

  it.each(themes)("theme %# provides renderable visual primitives", (theme) => {
    expect(theme.bg).toMatch(/^bg-\[/);
    expect(theme.text).toMatch(/^text-\[/);
    expect(theme.SvgComponent).toEqual(expect.any(Function));
    expect(theme.bloom).toMatch(/^rgb\(/);
  });

  it("keeps the theme backgrounds distinct", () => {
    expect(new Set(themes.map((theme) => theme.bg)).size).toBe(themes.length);
  });
});

describe("PatternCard rendered structure", () => {
  it("renders its children inside the card surface", () => {
    renderPatternCard();

    expect(screen.getByText("Open study card")).toBeInTheDocument();
  });

  it("defaults to an accessible button surface", () => {
    renderPatternCard();

    expect(screen.getByRole("button", { name: "Open study card" })).toBe(
      screen.getByText("Open study card").closest("div"),
    );
  });

  it("derives its accessible name from nested child text", () => {
    renderPatternCard(
      {},
      <span>
        Open <strong>chapter map</strong>
      </span>,
    );

    expect(
      screen.getByRole("button", { name: "Open chapter map" }),
    ).toBeInTheDocument();
  });

  it("is tabbable when interactive", () => {
    renderPatternCard();

    expect(
      screen.getByRole("button", { name: "Open study card" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("stores the optional layout id as a data attribute", () => {
    renderPatternCard({ layoutId: "chapter-card-1" });

    expect(
      screen.getByRole("button", { name: "Open study card" }),
    ).toHaveAttribute("data-layout-id", "chapter-card-1");
  });

  it("omits the layout id attribute when no layout id is provided", () => {
    renderPatternCard();

    expect(
      screen.getByRole("button", { name: "Open study card" }),
    ).not.toHaveAttribute("data-layout-id");
  });

  it("removes button semantics when interactive is false", () => {
    renderPatternCard({ interactive: false });

    expect(
      screen.queryByRole("button", { name: "Open study card" }),
    ).toBeNull();
  });

  it("removes keyboard tab stops when interactive is false", () => {
    renderPatternCard({ interactive: false });

    expect(
      screen.getByText("Open study card").closest("div"),
    ).not.toHaveAttribute("tabindex");
  });

  it("applies the requested theme background class", () => {
    renderPatternCard({ bgClass: themes[1].bg });

    expect(screen.getByRole("button", { name: "Open study card" })).toHaveClass(
      themes[1].bg,
    );
  });

  it("adds drag affordance classes while dragging", () => {
    renderPatternCard({ isDragging: true });

    expect(screen.getByRole("button", { name: "Open study card" })).toHaveClass(
      "ring-4",
      "ring-blue-500/50",
      "scale-[1.02]",
    );
  });

  it("does not add drag affordance classes while idle", () => {
    renderPatternCard({ isDragging: false });

    expect(
      screen.getByRole("button", { name: "Open study card" }),
    ).not.toHaveClass("ring-4", "scale-[1.02]");
  });

  it("keeps a stable responsive frame class contract", () => {
    renderPatternCard();

    expect(screen.getByRole("button", { name: "Open study card" })).toHaveClass(
      "w-[min(324px,calc(100vw-2rem))]",
      "min-h-[366px]",
      "origin-top",
    );
  });

  it("renders the selected pattern SVG inside the surface", () => {
    const { container } = renderPatternCard();

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the bloom layer with the requested color and opacity", () => {
    const { container } = renderPatternCard({
      bloomColor: "rgb(12, 34, 56)",
      bloomOpacity: 0.42,
    });

    const bloomLayer = container.querySelector(".absolute.pointer-events-none");
    expect(bloomLayer).toHaveStyle({ opacity: "0.42" });
    expect(bloomLayer?.getAttribute("style")).toContain("rgb(12, 34, 56)");
  });
});

describe("PatternCard interaction behavior", () => {
  it("calls onClick from pointer activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderPatternCard({ onClick });

    await user.click(screen.getByRole("button", { name: "Open study card" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the default onClick safe for pointer activation", async () => {
    const user = userEvent.setup();
    renderPatternCard();

    await expect(
      user.click(screen.getByRole("button", { name: "Open study card" })),
    ).resolves.toBeUndefined();
  });

  it("calls onClick from Enter when focused", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderPatternCard({ onClick });
    const card = screen.getByRole("button", { name: "Open study card" });

    card.focus();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick from Space when focused", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderPatternCard({ onClick });
    const card = screen.getByRole("button", { name: "Open study card" });

    card.focus();
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated keyboard keys", () => {
    const onClick = vi.fn();
    renderPatternCard({ onClick });

    fireEvent.keyDown(screen.getByRole("button", { name: "Open study card" }), {
      key: "Escape",
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it("prevents native scrolling behavior for Enter activation", () => {
    const onClick = vi.fn();
    renderPatternCard({ onClick });
    const card = screen.getByRole("button", { name: "Open study card" });
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });

    card.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prevents native scrolling behavior for Space activation", () => {
    const onClick = vi.fn();
    renderPatternCard({ onClick });
    const card = screen.getByRole("button", { name: "Open study card" });
    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });

    card.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("receives focus through normal tab navigation", async () => {
    const user = userEvent.setup();
    renderPatternCard();

    await user.tab();

    expect(
      screen.getByRole("button", { name: "Open study card" }),
    ).toHaveFocus();
  });

  it("does not call onClick from pointer activation when noninteractive", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderPatternCard({ interactive: false, onClick });

    await user.click(screen.getByText("Open study card"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not call onClick from keyboard activation when noninteractive", () => {
    const onClick = vi.fn();
    renderPatternCard({ interactive: false, onClick });

    fireEvent.keyDown(screen.getByText("Open study card").closest("div")!, {
      key: "Enter",
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it("updates pointer CSS variables from mouse movement", () => {
    renderPatternCard();
    const card = screen.getByRole("button", { name: "Open study card" });

    fireEvent.mouseMove(card, { clientX: 24, clientY: 37 });

    expect(card).toHaveStyle({ "--mouse-x": "24px", "--mouse-y": "37px" });
  });

  it("subtracts the card bounds when recording pointer CSS variables", () => {
    renderPatternCard();
    const card = screen.getByRole("button", { name: "Open study card" });
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      bottom: 220,
      height: 200,
      left: 10,
      right: 310,
      top: 20,
      width: 300,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(card, { clientX: 34, clientY: 65 });

    expect(card).toHaveStyle({ "--mouse-x": "24px", "--mouse-y": "45px" });
  });

  it("passes dragOver events to the supplied handler", () => {
    const onDragOver = vi.fn();
    renderPatternCard({ onDragOver });

    fireEvent.dragOver(screen.getByRole("button", { name: "Open study card" }));

    expect(onDragOver).toHaveBeenCalledTimes(1);
  });

  it("passes dragLeave events to the supplied handler", () => {
    const onDragLeave = vi.fn();
    renderPatternCard({ onDragLeave });

    fireEvent.dragLeave(
      screen.getByRole("button", { name: "Open study card" }),
    );

    expect(onDragLeave).toHaveBeenCalledTimes(1);
  });

  it("passes drop events to the supplied handler", () => {
    const onDrop = vi.fn();
    renderPatternCard({ onDrop });

    fireEvent.drop(screen.getByRole("button", { name: "Open study card" }));

    expect(onDrop).toHaveBeenCalledTimes(1);
  });
});

describe("PatternCard motion behavior", () => {
  it("suppresses hover scale tweens when animations are disabled", () => {
    renderPatternCard({ animateDots: false });

    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Open study card" }),
    );

    expect(gsap.to).not.toHaveBeenCalled();
  });

  it("scales up on mouse enter when motion is enabled", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: false });
    const card = screen.getByRole("button", { name: "Open study card" });

    fireEvent.mouseEnter(card);

    expect(gsap.to).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ duration: 0.28, scale: 1.02 }),
    );
  });

  it("returns to normal scale on mouse leave when motion is enabled", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: false });
    const card = screen.getByRole("button", { name: "Open study card" });

    fireEvent.mouseLeave(card);

    expect(gsap.to).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ duration: 0.28, scale: 1 }),
    );
  });

  it("compresses quickly on mouse down when motion is enabled", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: false });
    const card = screen.getByRole("button", { name: "Open study card" });

    fireEvent.mouseDown(card);

    expect(gsap.to).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ duration: 0.14, scale: 0.98 }),
    );
  });

  it("recovers on mouse up when motion is enabled", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: false });
    const card = screen.getByRole("button", { name: "Open study card" });

    fireEvent.mouseUp(card);

    expect(gsap.to).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ duration: 0.28, scale: 1.02 }),
    );
  });

  it("suppresses hover scale tweens when reduced motion is preferred", () => {
    installMatchMedia(true);
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: false });

    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Open study card" }),
    );

    expect(gsap.to).not.toHaveBeenCalled();
  });

  it("sets all press dots before deciding whether to animate them", () => {
    renderPatternCard({ animateDots: true });

    expect(gsap.set).toHaveBeenCalledTimes(16);
  });

  it("animates all press dots when motion is enabled", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: true });

    expect(gsap.to).toHaveBeenCalledTimes(16);
  });
});

describe("PatternCard press-dot rendering", () => {
  it("renders the full press-dot layer when enabled", () => {
    const { container } = renderPatternCard({ animateDots: true });

    expect(container.querySelectorAll(".z-30 span")).toHaveLength(16);
  });

  it("omits the press-dot layer when disabled", () => {
    const { container } = renderPatternCard({ animateDots: false });

    expect(container.querySelectorAll(".z-30 span")).toHaveLength(0);
  });

  it("uses dark-theme default dot and ring colors", () => {
    const { container } = renderPatternCard({
      animateDots: true,
      bgClass: themes[0].bg,
    });
    const dots = container.querySelectorAll(".z-30 span");

    expect(dots[0]).toHaveStyle({ background: "#fefefe" });
    expect(dots[4].getAttribute("style")).toContain("rgba(254,254,254,0.55)");
  });

  it("uses orange defaults for the beige theme dot system", () => {
    const { container } = renderPatternCard({
      animateDots: true,
      bgClass: themes[2].bg,
    });
    const dots = container.querySelectorAll(".z-30 span");

    expect(dots[0]).toHaveStyle({ background: "#ff6e00" });
    expect(dots[4].getAttribute("style")).toContain("rgba(255,110,0,0.58)");
  });

  it("allows custom press dot and ring colors", () => {
    const { container } = renderPatternCard({
      animateDots: true,
      pressDotColor: "#123456",
      pressRingColor: "rgba(1, 2, 3, 0.4)",
    });
    const dots = container.querySelectorAll(".z-30 span");

    expect(dots[0]).toHaveStyle({ background: "#123456" });
    expect(dots[4].getAttribute("style")).toContain("rgba(1, 2, 3, 0.4)");
  });

  it("uses active press-dot animation targets while pressing", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: true, isPressing: true });

    expect(gsap.to).toHaveBeenCalledWith(
      expect.any(HTMLSpanElement),
      expect.objectContaining({ duration: 0.82, y: -2.5 }),
    );
  });

  it("uses active press-dot animation targets while dragging", () => {
    useStore.setState({ animationsEnabled: true });
    renderPatternCard({ animateDots: true, isDragging: true });

    expect(gsap.to).toHaveBeenCalledWith(
      expect.any(HTMLSpanElement),
      expect.objectContaining({ duration: 0.82, y: -2.5 }),
    );
  });

  it("kills active press-dot tweens on unmount", () => {
    const { container, unmount } = renderPatternCard({ animateDots: true });
    const firstDot = container.querySelector(".z-30 span");
    const callsBeforeUnmount = vi.mocked(gsap.killTweensOf).mock.calls.length;

    unmount();

    expect(gsap.killTweensOf).toHaveBeenCalledTimes(callsBeforeUnmount + 1);
    expect(gsap.killTweensOf).toHaveBeenLastCalledWith(
      expect.arrayContaining([firstDot]),
    );
  });
});
