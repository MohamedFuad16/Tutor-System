import { act, fireEvent, render, screen } from "@testing-library/react";
import { gsap } from "gsap";
import { createRef, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnimatedScrollText } from "../src/components/AnimatedScrollText";

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  observer: IntersectionObserver;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const observers: ObserverRecord[] = [];

const makeRect = ({
  top = 0,
  height = 20,
}: {
  top?: number;
  height?: number;
} = {}): DOMRect =>
  ({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 100,
    bottom: top + height,
    width: 100,
    height,
    toJSON: () => ({}),
  }) as DOMRect;

const createObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): IntersectionObserver => {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  const observer = {
    root: options?.root ?? null,
    rootMargin: options?.rootMargin ?? "0px",
    thresholds: Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0],
    observe,
    unobserve,
    disconnect,
    takeRecords: vi.fn(() => []),
  } as IntersectionObserver;

  observers.push({
    callback,
    observer,
    options,
    observe,
    unobserve,
    disconnect,
  });

  return observer;
};

const triggerObserver = (
  record: ObserverRecord,
  target: Element,
  {
    isIntersecting,
    top = 80,
    height = 20,
  }: {
    isIntersecting: boolean;
    top?: number;
    height?: number;
  },
) => {
  const boundingClientRect = makeRect({ top, height });
  const entry = {
    boundingClientRect,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: isIntersecting ? boundingClientRect : makeRect(),
    isIntersecting,
    rootBounds: makeRect({ height: 100 }),
    target,
    time: 0,
  } as IntersectionObserverEntry;

  act(() => {
    record.callback([entry], record.observer);
  });
};

const setClientHeight = (element: HTMLElement, value: number) => {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value,
  });
};

const setScrollTop = (element: HTMLElement, value: number) => {
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    value,
    writable: true,
  });
};

const createScrollContainer = ({
  clientHeight = 100,
  scrollTop = 0,
}: {
  clientHeight?: number;
  scrollTop?: number;
} = {}) => {
  const element = document.createElement("section");
  setClientHeight(element, clientHeight);
  setScrollTop(element, scrollTop);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    makeRect({ top: 0, height: clientHeight }),
  );

  const ref = createRef<HTMLElement>();
  ref.current = element;

  return { element, ref };
};

const getWords = () => screen.getAllByText(/^(alpha|beta|gamma)$/);

const getWrapper = (container: HTMLElement) =>
  container.firstElementChild as HTMLDivElement;

const getWordElements = (container: HTMLElement) =>
  Array.from(getWrapper(container).querySelectorAll(":scope > span"));

const enterViewport = (
  target: Element,
  options: { top?: number; height?: number } = {},
) => {
  const observerCount = observers.length;
  triggerObserver(observers[observers.length - 1]!, target, {
    isIntersecting: true,
    ...options,
  });

  if (observers.length > observerCount) {
    triggerObserver(observers[observers.length - 1]!, target, {
      isIntersecting: true,
      ...options,
    });
  }
};

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(
      (
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) => createObserver(callback, options),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnimatedScrollText rendered behavior", () => {
  it("renders every word as stable inline layout children", () => {
    const { container } = render(
      <AnimatedScrollText text="alpha beta gamma" />,
    );

    const wrapper = container.firstElementChild;
    const words = getWords();

    expect(wrapper).toHaveClass("flex", "flex-wrap");
    expect(wrapper?.children).toHaveLength(3);
    expect(words.map((word) => word.textContent)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    for (const word of words) {
      expect(word).toHaveStyle({
        display: "inline-block",
        marginRight: "0.25em",
        transition: "filter 0.2s ease-out, opacity 0.2s ease-out",
      });
    }
  });

  it("merges className without replacing stable flex layout classes", () => {
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        className="items-center text-lg"
      />,
    );

    expect(container.firstElementChild).toHaveClass(
      "flex",
      "flex-wrap",
      "items-center",
      "text-lg",
    );
  });

  it("applies default initial blur and opacity before a reveal", () => {
    render(<AnimatedScrollText text="alpha beta gamma" />);

    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }
  });

  it("applies custom initial blur and opacity before a reveal", () => {
    render(
      <AnimatedScrollText
        text="alpha beta gamma"
        initialBlur={8}
        initialOpacity={0.35}
      />,
    );

    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(8px)", opacity: "0.35" });
    }
  });

  it("stays inert without a supplied scroll container", () => {
    const onRevealComplete = vi.fn();

    render(
      <AnimatedScrollText
        text="alpha beta gamma"
        onRevealComplete={onRevealComplete}
      />,
    );

    expect(observers).toHaveLength(0);
    expect(onRevealComplete).not.toHaveBeenCalled();
  });

  it("roots its observer in the supplied scroll container", () => {
    const { element, ref } = createScrollContainer();
    const addEventListener = vi.spyOn(element, "addEventListener");
    const { container } = render(
      <AnimatedScrollText text="alpha beta gamma" scrollContainerRef={ref} />,
    );

    expect(observers).toHaveLength(1);
    expect(observers[0]?.options).toEqual({
      root: element,
      threshold: [0],
    });
    expect(observers[0]?.observe).toHaveBeenCalledWith(
      container.firstElementChild,
    );
    expect(addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true },
    );
  });

  it("keeps initial styles while the text is outside the viewport", () => {
    const { ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        scrollContainerRef={ref}
        onRevealComplete={onRevealComplete}
      />,
    );

    triggerObserver(observers[0]!, container.firstElementChild!, {
      isIntersecting: false,
    });

    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }
    expect(onRevealComplete).not.toHaveBeenCalled();
  });

  it("reveals words progressively and reports incomplete then complete state", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={onRevealComplete}
      />,
    );
    const wrapper = container.firstElementChild!;

    triggerObserver(observers[0]!, wrapper, {
      isIntersecting: true,
      top: 80,
      height: 20,
    });
    triggerObserver(observers[1]!, wrapper, {
      isIntersecting: true,
      top: 80,
      height: 20,
    });

    expect(onRevealComplete).toHaveBeenLastCalledWith(false);
    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }

    setScrollTop(element, 200);
    fireEvent.scroll(element);

    expect(onRevealComplete).toHaveBeenLastCalledWith(true);
    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("clamps reveal progress above one during deep scrolling", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const wrapper = container.firstElementChild!;

    triggerObserver(observers[0]!, wrapper, { isIntersecting: true });
    triggerObserver(observers[1]!, wrapper, { isIntersecting: true });
    setScrollTop(element, 10_000);
    fireEvent.scroll(element);

    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("clamps reveal progress below zero before the text reaches the viewport", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const wrapper = container.firstElementChild!;

    triggerObserver(observers[0]!, wrapper, {
      isIntersecting: true,
      top: 400,
    });
    triggerObserver(observers[1]!, wrapper, {
      isIntersecting: true,
      top: 400,
    });
    setScrollTop(element, -500);
    fireEvent.scroll(element);

    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }
  });

  it("recalculates from the resized viewport on the next scroll without shifting layout", () => {
    const { element, ref } = createScrollContainer({ clientHeight: 100 });
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const wrapper = container.firstElementChild!;
    const originalWords = getWords();

    triggerObserver(observers[0]!, wrapper, {
      isIntersecting: true,
      top: 80,
      height: 20,
    });
    triggerObserver(observers[1]!, wrapper, {
      isIntersecting: true,
      top: 80,
      height: 20,
    });

    setClientHeight(element, 300);
    fireEvent.resize(window);
    fireEvent.scroll(element);

    expect(container.firstElementChild).toBe(wrapper);
    expect(getWords()).toEqual(originalWords);
    for (const word of getWords()) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("updates text and classes through rerender while preserving one wrapper", () => {
    const { container, rerender } = render(
      <AnimatedScrollText text="alpha beta" className="first-class" />,
    );
    const wrapper = container.firstElementChild;

    rerender(<AnimatedScrollText text="gamma" className="second-class" />);

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(wrapper);
    expect(container.firstElementChild).toHaveClass(
      "flex",
      "flex-wrap",
      "second-class",
    );
    expect(container.firstElementChild).not.toHaveClass("first-class");
    expect(screen.getByText("gamma")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).toBeNull();
  });

  it("removes scroll listeners and unobserves the wrapper on unmount", () => {
    const { element, ref } = createScrollContainer();
    const removeEventListener = vi.spyOn(element, "removeEventListener");
    const { container, unmount } = render(
      <AnimatedScrollText text="alpha beta gamma" scrollContainerRef={ref} />,
    );
    const wrapper = container.firstElementChild;
    const firstObserver = observers[0]!;

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    expect(firstObserver.unobserve).toHaveBeenCalledWith(wrapper);
  });

  it("does not start GSAP work or reduced-motion listeners for its CSS scroll animation", () => {
    const { ref } = createScrollContainer();
    const matchMedia = vi.spyOn(window, "matchMedia");

    const { unmount } = render(
      <AnimatedScrollText text="alpha beta gamma" scrollContainerRef={ref} />,
    );
    unmount();

    expect(gsap.context).not.toHaveBeenCalled();
    expect(gsap.fromTo).not.toHaveBeenCalled();
    expect(gsap.to).not.toHaveBeenCalled();
    expect(gsap.killTweensOf).not.toHaveBeenCalled();
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("accepts a readonly-compatible scroll-container ref contract", () => {
    const { element } = createScrollContainer();
    const ref: RefObject<HTMLElement> = { current: element };

    render(
      <AnimatedScrollText text="alpha beta gamma" scrollContainerRef={ref} />,
    );

    expect(observers).toHaveLength(1);
  });

  it.each([
    ["an empty string", "", []],
    ["a single space", " ", []],
    ["multiple spaces", "   ", []],
    ["leading and trailing spaces", " alpha beta ", ["alpha", "beta"]],
    ["repeated inner spaces", "alpha   beta", ["alpha", "beta"]],
    ["a tab separator", "alpha\tbeta", ["alpha", "beta"]],
    ["a newline separator", "alpha\nbeta", ["alpha", "beta"]],
    ["mixed whitespace", " alpha\tbeta\n gamma ", ["alpha", "beta", "gamma"]],
    ["punctuation", "hello, world!", ["hello,", "world!"]],
    ["code-like symbols", "C++ a/b <tag>", ["C++", "a/b", "<tag>"]],
  ])("tokenizes %s without empty animation spans", (_label, text, expected) => {
    const { container } = render(<AnimatedScrollText text={text} />);
    const words = getWordElements(container);

    expect(words.map((word) => word.textContent)).toEqual(expected);
    expect(getWrapper(container)).toHaveTextContent(expected.join(" "));
  });

  it.each([
    ["zero blur", 0, 0.2, "blur(0px)", "0.2"],
    ["fractional blur", 1.5, 0.2, "blur(1.5px)", "0.2"],
    ["fully transparent", 3, 0, "blur(3px)", "0"],
    ["fully opaque", 3, 1, "blur(3px)", "1"],
  ])(
    "supports %s as a valid initial style",
    (_label, initialBlur, initialOpacity, filter, opacity) => {
      const { container } = render(
        <AnimatedScrollText
          text="alpha beta"
          initialBlur={initialBlur}
          initialOpacity={initialOpacity}
        />,
      );

      for (const word of getWordElements(container)) {
        expect(word).toHaveStyle({ filter, opacity });
      }
    },
  );

  it("renders deterministic partial progress across individual words", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma delta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const wrapper = getWrapper(container);

    enterViewport(wrapper, { top: 80, height: 20 });
    setScrollTop(element, 100);
    fireEvent.scroll(element);

    const words = getWordElements(container);
    expect(words[0]).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    expect(words[1]).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    expect(words[2]).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    expect(words[3]).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
  });

  it("calculates progress from both the scroller offset and initial scrollTop", () => {
    const { element, ref } = createScrollContainer({ scrollTop: 30 });
    vi.mocked(element.getBoundingClientRect).mockReturnValue(
      makeRect({ top: 50, height: 100 }),
    );
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta gamma delta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );

    enterViewport(getWrapper(container), { top: 130, height: 20 });
    setScrollTop(element, 130);
    fireEvent.scroll(element);

    const words = getWordElements(container);
    expect(words[0]).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    expect(words[1]).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    expect(words[2]).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    expect(words[3]).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
  });

  it("ignores scroll events before the observer reports visibility", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        onRevealComplete={onRevealComplete}
      />,
    );

    setScrollTop(element, 10_000);
    fireEvent.scroll(element);

    expect(onRevealComplete).not.toHaveBeenCalled();
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }
  });

  it("stops updating when the observer reports that text left the viewport", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={onRevealComplete}
      />,
    );
    const wrapper = getWrapper(container);

    enterViewport(wrapper, { top: 80, height: 20 });
    triggerObserver(observers[observers.length - 1]!, wrapper, {
      isIntersecting: false,
    });
    onRevealComplete.mockClear();
    setScrollTop(element, 10_000);
    fireEvent.scroll(element);

    expect(onRevealComplete).not.toHaveBeenCalled();
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }
  });

  it("resumes progress after leaving and re-entering the viewport", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={onRevealComplete}
      />,
    );
    const wrapper = getWrapper(container);

    enterViewport(wrapper, { top: 80, height: 20 });
    triggerObserver(observers[observers.length - 1]!, wrapper, {
      isIntersecting: false,
    });
    enterViewport(wrapper, { top: 80, height: 20 });
    setScrollTop(element, 250);
    fireEvent.scroll(element);

    expect(onRevealComplete).toHaveBeenLastCalledWith(true);
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("keeps progress finite when reveal distance equals element height", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={20}
      />,
    );

    enterViewport(getWrapper(container), { top: 80, height: 20 });
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(3px)", opacity: "0.1" });
    }

    setScrollTop(element, 1);
    fireEvent.scroll(element);
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("keeps progress monotonic when reveal distance is below element height", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={10}
        onRevealComplete={onRevealComplete}
      />,
    );

    enterViewport(getWrapper(container), { top: 80, height: 20 });
    setScrollTop(element, 1);
    fireEvent.scroll(element);

    expect(onRevealComplete).toHaveBeenLastCalledWith(true);
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("interpolates custom blur and opacity at partial progress", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        initialBlur={4}
        initialOpacity={0.2}
      />,
    );

    enterViewport(getWrapper(container), { top: 80, height: 20 });
    setScrollTop(element, 50);
    fireEvent.scroll(element);

    const words = getWordElements(container);
    expect(words[0]).toHaveStyle({ filter: "blur(2px)" });
    expect(Number((words[0] as HTMLElement).style.opacity)).toBeCloseTo(0.6);
    expect(words[1]).toHaveStyle({ filter: "blur(4px)", opacity: "0.2" });
  });

  it("uses the latest reveal callback after a callback-only rerender", () => {
    const { element, ref } = createScrollContainer();
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const { container, rerender } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={firstCallback}
      />,
    );
    const wrapper = getWrapper(container);

    enterViewport(wrapper, { top: 80, height: 20 });
    firstCallback.mockClear();
    rerender(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={secondCallback}
      />,
    );
    setScrollTop(element, 250);
    fireEvent.scroll(element);

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenLastCalledWith(true);
  });

  it("moves observation and scroll handling when the ref object changes", () => {
    const first = createScrollContainer();
    const second = createScrollContainer();
    const firstRemove = vi.spyOn(first.element, "removeEventListener");
    const secondAdd = vi.spyOn(second.element, "addEventListener");
    const { container, rerender } = render(
      <AnimatedScrollText text="alpha beta" scrollContainerRef={first.ref} />,
    );
    const wrapper = getWrapper(container);
    const firstObserver = observers[0]!;

    rerender(
      <AnimatedScrollText text="alpha beta" scrollContainerRef={second.ref} />,
    );

    expect(firstRemove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(firstObserver.unobserve).toHaveBeenCalledWith(wrapper);
    expect(secondAdd).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    expect(observers[observers.length - 1]?.options?.root).toBe(second.element);
  });

  it("rebuilds observation when fullRevealDistance changes", () => {
    const { element, ref } = createScrollContainer();
    const removeEventListener = vi.spyOn(element, "removeEventListener");
    const { container, rerender } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const wrapper = getWrapper(container);
    const firstObserver = observers[0]!;

    rerender(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={440}
      />,
    );

    expect(firstObserver.unobserve).toHaveBeenCalledWith(wrapper);
    expect(removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    expect(observers).toHaveLength(2);
  });

  it("reveals safely when no completion callback is provided", () => {
    const { element, ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );

    enterViewport(getWrapper(container), { top: 80, height: 20 });
    setScrollTop(element, 250);

    expect(() => fireEvent.scroll(element)).not.toThrow();
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(0px)", opacity: "1" });
    }
  });

  it("does not call completion callbacks from scrolls after unmount", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container, unmount } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        onRevealComplete={onRevealComplete}
      />,
    );

    enterViewport(getWrapper(container));
    onRevealComplete.mockClear();
    unmount();
    fireEvent.scroll(element);

    expect(onRevealComplete).not.toHaveBeenCalled();
  });

  it("reports completion status for every visible scroll event", () => {
    const { element, ref } = createScrollContainer();
    const onRevealComplete = vi.fn();
    const { container } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
        onRevealComplete={onRevealComplete}
      />,
    );

    enterViewport(getWrapper(container), { top: 80, height: 20 });
    onRevealComplete.mockClear();
    setScrollTop(element, 50);
    fireEvent.scroll(element);
    setScrollTop(element, 250);
    fireEvent.scroll(element);

    expect(onRevealComplete).toHaveBeenNthCalledWith(1, false);
    expect(onRevealComplete).toHaveBeenNthCalledWith(2, true);
  });

  it("cleans each replaced observer before installing the next one", () => {
    const { ref } = createScrollContainer();
    const { rerender } = render(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={220}
      />,
    );
    const firstObserver = observers[0]!;

    rerender(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={300}
      />,
    );
    const secondObserver = observers[1]!;
    rerender(
      <AnimatedScrollText
        text="alpha beta"
        scrollContainerRef={ref}
        fullRevealDistance={400}
      />,
    );

    expect(firstObserver.unobserve).toHaveBeenCalledTimes(1);
    expect(secondObserver.unobserve).toHaveBeenCalledTimes(1);
    expect(observers).toHaveLength(3);
  });

  it("updates initial styles through rerender while progress remains zero", () => {
    const { container, rerender } = render(
      <AnimatedScrollText
        text="alpha beta"
        initialBlur={3}
        initialOpacity={0.1}
      />,
    );
    const wrapper = getWrapper(container);

    rerender(
      <AnimatedScrollText
        text="alpha beta"
        initialBlur={7}
        initialOpacity={0.4}
      />,
    );

    expect(getWrapper(container)).toBe(wrapper);
    for (const word of getWordElements(container)) {
      expect(word).toHaveStyle({ filter: "blur(7px)", opacity: "0.4" });
    }
  });

  it("preserves semantic spaces in the rendered text content", () => {
    const { container } = render(
      <AnimatedScrollText text="alpha beta gamma" />,
    );

    expect(getWrapper(container).textContent).toBe("alpha beta gamma");
  });

  it("keeps decorative animation spans outside the keyboard tab order", () => {
    const { container } = render(
      <AnimatedScrollText text="alpha beta gamma" />,
    );

    expect(
      getWrapper(container).querySelectorAll("button, a, input"),
    ).toHaveLength(0);
    for (const word of getWordElements(container)) {
      expect(word).not.toHaveAttribute("tabindex");
    }
  });

  it("preserves wrapper identity through visibility transitions", () => {
    const { ref } = createScrollContainer();
    const { container } = render(
      <AnimatedScrollText text="alpha beta" scrollContainerRef={ref} />,
    );
    const wrapper = getWrapper(container);

    enterViewport(wrapper);
    triggerObserver(observers[observers.length - 1]!, wrapper, {
      isIntersecting: false,
    });

    expect(getWrapper(container)).toBe(wrapper);
  });

  it("remains CSS-driven across observer, scroll, and rerender work", () => {
    const { element, ref } = createScrollContainer();
    const matchMedia = vi.spyOn(window, "matchMedia");
    const { container, rerender } = render(
      <AnimatedScrollText text="alpha beta" scrollContainerRef={ref} />,
    );

    enterViewport(getWrapper(container));
    setScrollTop(element, 250);
    fireEvent.scroll(element);
    rerender(
      <AnimatedScrollText text="alpha beta gamma" scrollContainerRef={ref} />,
    );

    expect(gsap.context).not.toHaveBeenCalled();
    expect(gsap.fromTo).not.toHaveBeenCalled();
    expect(gsap.to).not.toHaveBeenCalled();
    expect(gsap.killTweensOf).not.toHaveBeenCalled();
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("stays inert when a supplied ref currently points to null", () => {
    const ref: RefObject<HTMLElement> = { current: null };

    render(<AnimatedScrollText text="alpha beta" scrollContainerRef={ref} />);

    expect(observers).toHaveLength(0);
  });
});
