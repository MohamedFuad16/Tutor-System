import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gsap } from "gsap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingSkillsMenu } from "../src/components/FloatingSkillsMenu";
import { useStore } from "../src/store";

type RenderMenuOptions = {
  animationsEnabled?: boolean;
  isOpen?: boolean;
  omitSelectSkill?: boolean;
  onClose?: () => void;
  onSelectSkill?: (skill: string) => void;
};

type MatchMediaController = {
  addEventListener: ReturnType<typeof vi.fn>;
  listeners: Set<() => void>;
  matchMedia: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  setReducedMotion: (matches: boolean) => void;
};

const resetMenuStore = () => {
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    animationsEnabled: false,
    language: "en",
    learnerName: "Learner",
  });
};

const renderMenu = ({
  animationsEnabled = false,
  isOpen = true,
  omitSelectSkill = false,
  onClose = vi.fn(),
  onSelectSkill = vi.fn(),
}: RenderMenuOptions = {}) => {
  useStore.setState({ animationsEnabled });

  const result = render(
    <FloatingSkillsMenu
      isOpen={isOpen}
      onClose={onClose}
      {...(omitSelectSkill ? {} : { onSelectSkill })}
    />,
  );

  return { ...result, onClose, onSelectSkill };
};

const advanceSkillsLoad = (ms = 400) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const renderLoadedMenu = (options: RenderMenuOptions = {}) => {
  vi.useFakeTimers();
  const result = renderMenu(options);
  advanceSkillsLoad();
  vi.useRealTimers();
  return result;
};

const heading = () => screen.getByRole("heading", { name: "Skills" });

const header = () => heading().closest("div") as HTMLDivElement;

const shell = () => header().parentElement as HTMLDivElement;

const listArea = () => header().nextElementSibling as HTMLDivElement;

const listRoot = () => listArea().firstElementChild as HTMLDivElement;

const closeButton = () =>
  screen.getByRole("button", { name: "Close skills menu" });

const searchButton = () => screen.getByRole("button", { name: "Search" });

const pulseNodes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".animate-pulse"));

const fromToCalls = () =>
  vi.mocked(gsap.fromTo).mock.calls as unknown as Array<
    [unknown, Record<string, unknown>, Record<string, unknown>]
  >;

const lastTweenCall = (ease: string) => {
  const call = [...fromToCalls()]
    .reverse()
    .find(([, , vars]) => vars.ease === ease);
  expect(call).toBeDefined();
  return call as [unknown, Record<string, unknown>, Record<string, unknown>];
};

const lastTweenFrom = (ease: string) => lastTweenCall(ease)[1];

const lastTweenTo = (ease: string) => lastTweenCall(ease)[2];

const installMatchMedia = ({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
} = {}): MatchMediaController => {
  const listeners = new Set<() => void>();
  let reduced = reducedMotion;
  const addEventListener = vi.fn((event: string, listener: () => void) => {
    if (event === "change") listeners.add(listener);
  });
  const removeEventListener = vi.fn((event: string, listener: () => void) => {
    if (event === "change") listeners.delete(listener);
  });
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query.includes("prefers-reduced-motion") ? reduced : false;
    },
    media: query,
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    addEventListener,
    listeners,
    matchMedia,
    removeEventListener,
    setReducedMotion: (matches: boolean) => {
      reduced = matches;
      for (const listener of Array.from(listeners)) listener();
    },
  };
};

beforeEach(() => {
  resetMenuStore();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FloatingSkillsMenu rendered visibility and structure", () => {
  it("keeps the menu UI out of the document when closed", () => {
    renderMenu({ isOpen: false });

    expect(screen.queryByRole("heading", { name: "Skills" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Close skills menu" }),
    ).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("does not start GSAP menu or list animations while closed", () => {
    renderMenu({ isOpen: false });

    expect(gsap.fromTo).not.toHaveBeenCalled();
    expect(gsap.killTweensOf).not.toHaveBeenCalled();
  });

  it("renders exactly one floating shell when open", () => {
    const { container } = renderMenu();

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(shell());
  });

  it("renders the Skills title as a compact heading", () => {
    renderMenu();

    expect(heading().tagName).toBe("H3");
    expect(heading()).toHaveClass("text-sm", "font-bold", "tracking-tight");
  });

  it("renders the close control with an explicit accessible label", () => {
    renderMenu();

    expect(closeButton()).toHaveAccessibleName("Close skills menu");
    expect(closeButton()).toBeInTheDocument();
  });

  it("keeps the close control as a non-submit icon button", () => {
    renderMenu();

    expect(closeButton().tagName).toBe("BUTTON");
    expect(closeButton()).toHaveAttribute("type", "button");
    expect(closeButton()).toHaveClass(
      "p-1",
      "hover:bg-black/5",
      "dark:hover:bg-white/10",
      "rounded-full",
      "transition-colors",
      "text-zinc-400",
    );
  });

  it("keeps the close icon visible without leaking label text into layout", () => {
    renderMenu();

    expect(closeButton().querySelector("svg")).toBeInTheDocument();
    expect(closeButton()).not.toHaveTextContent("Close skills menu");
    expect(closeButton()).toHaveAccessibleName("Close skills menu");
  });

  it("does not render links or anchors after skills load", () => {
    vi.useFakeTimers();
    const { container } = renderMenu();

    advanceSkillsLoad();

    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("keeps the floating positioning classes stable", () => {
    renderMenu();

    expect(shell()).toHaveClass(
      "absolute",
      "bottom-full",
      "mb-4",
      "left-0",
      "origin-bottom-left",
    );
  });

  it("keeps the responsive width and viewport cap classes stable", () => {
    renderMenu();

    expect(shell()).toHaveClass(
      "w-[280px]",
      "sm:w-[320px]",
      "max-w-[calc(100vw-32px)]",
    );
  });

  it("keeps the light and dark surface theme classes stable", () => {
    renderMenu();

    expect(shell()).toHaveClass(
      "bg-[#fdfdfd]",
      "text-[#050505]",
      "dark:bg-[#121214]",
      "dark:text-zinc-100",
    );
  });

  it("keeps the shell depth, clipping, and stacking classes stable", () => {
    renderMenu();

    expect(shell()).toHaveClass(
      "rounded-3xl",
      "p-5",
      "shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
      "dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)]",
      "border",
      "border-black/5",
      "dark:border-white/10",
      "overflow-hidden",
      "z-50",
    );
  });

  it("keeps the header on the compact split layout", () => {
    renderMenu();

    expect(header()).toHaveClass(
      "flex",
      "items-center",
      "justify-between",
      "mb-4",
    );
  });

  it("reserves the list area's rendered height during loading", () => {
    renderMenu();

    expect(listArea()).toHaveClass("relative", "min-h-[160px]");
  });

  it("removes the rendered menu when rerendered closed", () => {
    const onClose = vi.fn();
    const onSelectSkill = vi.fn();
    const { rerender } = render(
      <FloatingSkillsMenu
        isOpen
        onClose={onClose}
        onSelectSkill={onSelectSkill}
      />,
    );

    expect(heading()).toBeInTheDocument();

    rerender(
      <FloatingSkillsMenu
        isOpen={false}
        onClose={onClose}
        onSelectSkill={onSelectSkill}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Skills" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });
});

describe("FloatingSkillsMenu rendered loading and skill data", () => {
  it("starts with the skeleton list container", () => {
    renderMenu();

    expect(listRoot()).toHaveClass("flex", "flex-col", "gap-3", "pt-2");
  });

  it("renders four skeleton rows while fetching", () => {
    renderMenu();

    expect(listRoot().children).toHaveLength(4);
  });

  it("renders each skeleton row with dot and text placeholders", () => {
    renderMenu();

    for (const row of Array.from(listRoot().children)) {
      expect(row).toHaveClass("flex", "items-center", "gap-3");
      expect(row.children[0]).toHaveClass(
        "w-3",
        "h-3",
        "rounded-full",
        "bg-black/5",
        "dark:bg-white/5",
        "animate-pulse",
      );
      expect(row.children[1]).toHaveClass(
        "h-3",
        "bg-black/5",
        "dark:bg-white/5",
        "rounded-full",
        "w-3/4",
        "animate-pulse",
      );
    }
  });

  it("stagger-delays the skeleton text bars", () => {
    renderMenu();

    expect(
      Array.from(listRoot().children).map((row) => row.children[1]),
    ).toEqual([
      expect.objectContaining({ style: expect.any(CSSStyleDeclaration) }),
      expect.objectContaining({ style: expect.any(CSSStyleDeclaration) }),
      expect.objectContaining({ style: expect.any(CSSStyleDeclaration) }),
      expect.objectContaining({ style: expect.any(CSSStyleDeclaration) }),
    ]);
    expect(listRoot().children[0].children[1]).toHaveStyle({
      animationDelay: "100ms",
    });
    expect(listRoot().children[1].children[1]).toHaveStyle({
      animationDelay: "200ms",
    });
    expect(listRoot().children[2].children[1]).toHaveStyle({
      animationDelay: "300ms",
    });
    expect(listRoot().children[3].children[1]).toHaveStyle({
      animationDelay: "400ms",
    });
  });

  it("keeps Search hidden through the first 399ms of fetching", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad(399);

    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });

  it("reveals Search after the 400ms skill fetch delay", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(searchButton()).toBeInTheDocument();
  });

  it("removes all pulse placeholders once the skill data renders", () => {
    vi.useFakeTimers();
    const { container } = renderMenu();

    advanceSkillsLoad();

    expect(pulseNodes(container)).toHaveLength(0);
  });

  it("switches to the compact content list after loading", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(listRoot()).toHaveClass("flex", "flex-col", "gap-1");
    expect(listRoot()).not.toHaveClass("gap-3", "pt-2");
  });

  it("renders Search as the only loaded skill item", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(
      screen
        .getAllByRole("button")
        .filter((button) => button.textContent === "Search")
        .map((button) => button.textContent),
    ).toEqual(["Search"]);
  });

  it("keeps the loaded button set to close plus one skill", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("renders Search as a native non-submit button", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(searchButton().tagName).toBe("BUTTON");
    expect(searchButton()).toHaveAttribute("type", "button");
  });

  it("keeps the Search skill button interaction classes stable", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(searchButton()).toHaveClass(
      "flex",
      "items-center",
      "gap-3",
      "text-left",
      "p-2",
      "rounded-xl",
      "hover:bg-black/5",
      "dark:hover:bg-white/5",
      "transition-colors",
      "group",
    );
  });

  it("keeps the Search icon and label styling stable", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    const iconWrap = searchButton().querySelector("div");
    const label = within(searchButton()).getByText("Search");

    expect(iconWrap).toHaveClass(
      "text-zinc-400",
      "group-hover:text-zinc-600",
      "dark:group-hover:text-zinc-300",
      "transition-colors",
    );
    expect(iconWrap?.querySelector("svg")).toBeInTheDocument();
    expect(label).toHaveClass(
      "text-[13px]",
      "font-medium",
      "text-zinc-600",
      "dark:text-zinc-400",
      "group-hover:text-zinc-900",
      "dark:group-hover:text-zinc-100",
      "transition-colors",
    );
  });

  it("derives the Search accessible name from the visible skill label", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(searchButton()).toHaveAccessibleName("Search");
    expect(searchButton()).toHaveTextContent("Search");
  });

  it("does not render show-more controls for the single skill item", () => {
    vi.useFakeTimers();
    renderMenu();

    advanceSkillsLoad();

    expect(screen.queryByRole("button", { name: /show/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /more/i })).toBeNull();
  });
});

describe("FloatingSkillsMenu rendered interactions", () => {
  it("calls onClose from the close button without selecting a skill", async () => {
    const user = userEvent.setup();
    const { onClose, onSelectSkill } = renderMenu();

    await user.click(closeButton());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectSkill).not.toHaveBeenCalled();
  });

  it("activates the close button with Enter", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    closeButton().focus();
    await user.keyboard("{Enter}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("activates the close button with Space", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    closeButton().focus();
    await user.keyboard(" ");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("selects Search and closes the menu on click", async () => {
    const user = userEvent.setup();
    const { onClose, onSelectSkill } = renderLoadedMenu();

    await user.click(searchButton());

    expect(onSelectSkill).toHaveBeenCalledWith("Search");
    expect(onSelectSkill).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still closes Search safely when the optional select handler is omitted", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { onClose } = renderLoadedMenu({ omitSelectSkill: true });

    await user.click(searchButton());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("selects Search and closes the menu with Enter", async () => {
    const user = userEvent.setup();
    const { onClose, onSelectSkill } = renderLoadedMenu();

    searchButton().focus();
    await user.keyboard("{Enter}");

    expect(onSelectSkill).toHaveBeenCalledWith("Search");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("selects Search and closes the menu with Space", async () => {
    const user = userEvent.setup();
    const { onClose, onSelectSkill } = renderLoadedMenu();

    searchButton().focus();
    await user.keyboard(" ");

    expect(onSelectSkill).toHaveBeenCalledWith("Search");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tabs from the close control to the loaded Search skill", async () => {
    const user = userEvent.setup();
    renderLoadedMenu();

    await user.tab();
    expect(closeButton()).toHaveFocus();
    await user.tab();
    expect(searchButton()).toHaveFocus();
  });

  it("shift-tabs from Search back to the close control", async () => {
    const user = userEvent.setup();
    renderLoadedMenu();

    searchButton().focus();
    await user.tab({ shift: true });

    expect(closeButton()).toHaveFocus();
  });

  it("does not fire actions from hovering the Search skill", async () => {
    const user = userEvent.setup();
    const { onClose, onSelectSkill } = renderLoadedMenu();

    await user.hover(searchButton());
    await user.unhover(searchButton());

    expect(onClose).not.toHaveBeenCalled();
    expect(onSelectSkill).not.toHaveBeenCalled();
  });

  it("does not close from hovering the close control", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.hover(closeButton());
    await user.unhover(closeButton());

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("FloatingSkillsMenu rendered motion and cleanup", () => {
  it("uses zero-duration menu entrance animation when app animations are disabled", () => {
    renderMenu({ animationsEnabled: false });

    expect(lastTweenTo("power3.out")).toEqual(
      expect.objectContaining({
        autoAlpha: 1,
        duration: 0,
        ease: "power3.out",
        scale: 1,
        y: 0,
      }),
    );
  });

  it("uses the animated menu entrance duration when app animations are enabled", () => {
    renderMenu({ animationsEnabled: true });

    expect(lastTweenTo("power3.out")).toEqual(
      expect.objectContaining({
        autoAlpha: 1,
        duration: 0.36,
        ease: "power3.out",
        scale: 1,
        y: 0,
      }),
    );
  });

  it("uses zero-duration skeleton list animation when app animations are disabled", () => {
    renderMenu({ animationsEnabled: false });

    expect(lastTweenFrom("power2.out")).toEqual(
      expect.objectContaining({ autoAlpha: 0, x: 0 }),
    );
    expect(lastTweenTo("power2.out")).toEqual(
      expect.objectContaining({
        autoAlpha: 1,
        duration: 0,
        ease: "power2.out",
        stagger: 0,
        x: 0,
      }),
    );
  });

  it("animates loaded skill rows when app animations are enabled", () => {
    vi.useFakeTimers();
    renderMenu({ animationsEnabled: true });
    vi.mocked(gsap.fromTo).mockClear();

    advanceSkillsLoad();

    expect(lastTweenFrom("power2.out")).toEqual(
      expect.objectContaining({ autoAlpha: 0, x: -10 }),
    );
    expect(lastTweenTo("power2.out")).toEqual(
      expect.objectContaining({
        autoAlpha: 1,
        duration: 0.22,
        ease: "power2.out",
        stagger: 0.05,
        x: 0,
      }),
    );
  });

  it("forces menu motion to zero when reduced-motion media is active", () => {
    installMatchMedia({ reducedMotion: true });

    renderMenu({ animationsEnabled: true });

    expect(lastTweenTo("power3.out")).toEqual(
      expect.objectContaining({ duration: 0 }),
    );
  });

  it("reacts to reduced-motion changes after mount", () => {
    vi.useFakeTimers();
    const media = installMatchMedia({ reducedMotion: false });
    renderMenu({ animationsEnabled: true });
    expect(lastTweenTo("power3.out")).toEqual(
      expect.objectContaining({ duration: 0.36 }),
    );
    vi.mocked(gsap.fromTo).mockClear();

    act(() => {
      media.setReducedMotion(true);
    });

    expect(lastTweenTo("power3.out")).toEqual(
      expect.objectContaining({ duration: 0 }),
    );
  });

  it("registers and removes the reduced-motion media listener", () => {
    const media = installMatchMedia();
    const { unmount } = renderMenu();

    expect(media.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
    expect(media.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("cleans up the pending skill load on unmount without console errors", () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { unmount } = renderMenu();

    unmount();
    advanceSkillsLoad();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("unmounts cleanly after skills load without console warnings", () => {
    vi.useFakeTimers();
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { unmount } = renderMenu();

    advanceSkillsLoad();
    unmount();

    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });
});
