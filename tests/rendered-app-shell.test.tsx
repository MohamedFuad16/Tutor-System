import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shellMocks = vi.hoisted(() => {
  let resolveAnalytics!: () => void;
  const analyticsGate = new Promise<void>((resolve) => {
    resolveAnalytics = resolve;
  });
  const tweens: Array<{ kill: () => void }> = [];
  const fromTo = vi.fn(
    (
      _target: Element,
      _from: Record<string, unknown>,
      _to: Record<string, unknown>,
    ) => {
      const tween = { kill: vi.fn() };
      tweens.push(tween);
      return tween;
    },
  );

  return {
    analyticsGate,
    fromTo,
    getProperty: vi.fn(() => 1),
    resolveAnalytics,
    set: vi.fn(),
    tweens,
  };
});

vi.mock("gsap", () => ({
  gsap: {
    fromTo: shellMocks.fromTo,
    getProperty: shellMocks.getProperty,
    set: shellMocks.set,
  },
}));

vi.mock("../src/components/Navigation", () => ({
  Navigation: () => <nav data-testid="navigation">Navigation mock</nav>,
}));

vi.mock("../src/components/SettingsModal", () => ({
  SettingsButton: () => <button type="button">Settings mock</button>,
}));

vi.mock("../src/views/StudyView", () => ({
  StudyView: () => (
    <section>
      <h1>Study mock</h1>
      <input aria-label="Study input" />
      <textarea aria-label="Study notes" />
      <div
        data-testid="study-editor"
        contentEditable
        suppressContentEditableWarning
      >
        Study editor
      </div>
    </section>
  ),
}));

vi.mock("../src/views/AnalyticsView", async () => {
  await shellMocks.analyticsGate;
  return {
    AnalyticsView: () => <h1>Analytics mock</h1>,
  };
});

vi.mock("../src/views/RevisionView", () => ({
  RevisionView: () => <h1>Revision mock</h1>,
}));

vi.mock("../src/views/AdminView", () => ({
  AdminView: () => <h1>Admin mock</h1>,
}));

import App from "../src/App";
import { useStore, type ViewState } from "../src/store";

type MotionHarness = {
  mediaQuery: MediaQueryList;
  setMatches: (matches: boolean) => void;
};

const installMatchMedia = (initialMatches = false): MotionHarness => {
  let matches = initialMatches;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(
      (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener);
      },
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQuery),
  });

  return {
    mediaQuery,
    setMatches: (nextMatches: boolean) => {
      matches = nextMatches;
      const event = new Event("change");
      listeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    },
  };
};

const resetShellStore = () => {
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    animationsEnabled: true,
  });
};

const latestGsapTo = () =>
  shellMocks.fromTo.mock.calls.at(-1)?.[2] as
    | Record<string, unknown>
    | undefined;

beforeEach(() => {
  resetShellStore();
  installMatchMedia();
  shellMocks.fromTo.mockClear();
  shellMocks.getProperty.mockClear();
  shellMocks.getProperty.mockReturnValue(1);
  shellMocks.set.mockClear();
  shellMocks.tweens.splice(0);
});

describe("rendered App shell", () => {
  it("renders the Study route with shared navigation and settings chrome", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Study mock" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settings mock" }),
    ).toBeInTheDocument();
  });

  it("shows the lazy-route fallback until Analytics finishes loading", async () => {
    useStore.setState({ activeView: "analytics" });
    render(<App />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Analytics mock" }),
    ).toBeNull();

    await act(async () => {
      shellMocks.resolveAnalytics();
      await shellMocks.analyticsGate;
    });

    expect(
      await screen.findByRole("heading", { name: "Analytics mock" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("guards an invalid route back to Study", async () => {
    useStore.setState({ activeView: "unknown" as ViewState });
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Study mock" }),
    ).toBeInTheDocument();
    expect(useStore.getState().activeView).toBe("study");
  });

  it("guards the Admin route when access mode is user", async () => {
    useStore.setState({ accessMode: "user", activeView: "admin" });
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Study mock" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Admin mock" })).toBeNull();
    expect(useStore.getState().activeView).toBe("study");
  });

  it("allows Admin access while hiding user navigation and settings chrome", async () => {
    useStore.setState({ accessMode: "admin", activeView: "admin" });
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Admin mock" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: "Settings mock" })).toBeNull();
  });

  it("routes between Study, Analytics, and Revision with numeric shortcuts", async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "2" });
    expect(
      await screen.findByRole("heading", { name: "Analytics mock" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "3" });
    expect(
      await screen.findByRole("heading", { name: "Revision mock" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "1" });
    expect(
      screen.getByRole("heading", { name: "Study mock" }),
    ).toBeInTheDocument();
  });

  it("gates the Admin shortcut until access mode changes to admin", async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "4" });
    expect(useStore.getState().activeView).toBe("study");

    act(() => {
      useStore.setState({ accessMode: "admin" });
    });
    fireEvent.keyDown(window, { key: "4" });

    expect(
      await screen.findByRole("heading", { name: "Admin mock" }),
    ).toBeInTheDocument();
    expect(useStore.getState().activeView).toBe("admin");
  });

  it("ignores shortcuts from editable controls and modified key presses", () => {
    render(<App />);
    const editor = screen.getByTestId("study-editor");
    Object.defineProperty(editor, "isContentEditable", {
      configurable: true,
      value: true,
    });

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Study input" }), {
      key: "2",
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Study notes" }), {
      key: "3",
    });
    fireEvent.keyDown(editor, { key: "4" });
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    fireEvent.keyDown(window, { key: "3", metaKey: true });
    fireEvent.keyDown(window, { key: "4", altKey: true });

    expect(useStore.getState().activeView).toBe("study");
  });

  it.each([
    ["study", "user", { autoAlpha: 0, x: 0, y: 10, scale: 0.985 }],
    ["analytics", "user", { autoAlpha: 0, x: 0, y: 0, scale: 0.96 }],
    ["revision", "user", { autoAlpha: 0, x: 20, y: 0, scale: 1 }],
    ["admin", "admin", { autoAlpha: 0, x: 0, y: 20, scale: 0.985 }],
  ] as const)(
    "uses the expected GSAP entry variant for %s",
    async (activeView, accessMode, expectedFrom) => {
      useStore.setState({ accessMode, activeView });
      render(<App />);

      await screen.findByRole("heading", {
        name: `${activeView[0].toUpperCase()}${activeView.slice(1)} mock`,
      });

      expect(shellMocks.fromTo).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expectedFrom,
        expect.objectContaining({
          autoAlpha: 1,
          duration: 0.3,
          ease: "power3.out",
          scale: 1,
          x: 0,
          y: 0,
        }),
      );
    },
  );

  it("switches the active route tween to zero duration for reduced motion", () => {
    const motion = installMatchMedia(false);
    render(<App />);
    const firstTween = shellMocks.tweens[0];

    expect(latestGsapTo()).toEqual(expect.objectContaining({ duration: 0.3 }));

    act(() => {
      motion.setMatches(true);
    });

    expect(firstTween.kill).toHaveBeenCalledTimes(1);
    expect(latestGsapTo()).toEqual(expect.objectContaining({ duration: 0 }));
  });

  it("uses a zero-duration tween when animations are disabled", () => {
    useStore.setState({ animationsEnabled: false });
    render(<App />);

    expect(latestGsapTo()).toEqual(expect.objectContaining({ duration: 0 }));
  });

  it("kills the previous route tween when a shortcut changes routes", async () => {
    render(<App />);
    const studyTween = shellMocks.tweens[0];

    fireEvent.keyDown(window, { key: "3" });
    await screen.findByRole("heading", { name: "Revision mock" });

    expect(studyTween.kill).toHaveBeenCalledTimes(1);
    expect(shellMocks.tweens).toHaveLength(2);
  });

  it("cleans up the GSAP tween, visibility timer, and motion listener on unmount", () => {
    vi.useFakeTimers();
    shellMocks.getProperty.mockReturnValue(0);
    const motion = installMatchMedia(false);
    const { unmount } = render(<App />);
    const tween = shellMocks.tweens[0];

    unmount();
    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(tween.kill).toHaveBeenCalledTimes(1);
    expect(shellMocks.set).not.toHaveBeenCalled();
    expect(motion.mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
