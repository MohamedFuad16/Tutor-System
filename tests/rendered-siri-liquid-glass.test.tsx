import { act, fireEvent, render, screen } from "@testing-library/react";
import { gsap } from "gsap";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiriLiquidGlass } from "../src/components/SiriLiquidGlass";
import { useStore } from "../src/store";

type SiriLiquidGlassProps = ComponentProps<typeof SiriLiquidGlass>;
type TweenCall = [unknown, Record<string, unknown>];
type OneArgCall = [unknown];
type MutableMediaQueryList = MediaQueryList & {
  emitChange: (matches: boolean) => void;
};

const mediaQueryText = "(prefers-reduced-motion: reduce)";

const getTweenCalls = () =>
  (gsap.to as unknown as { mock: { calls: TweenCall[] } }).mock.calls;

const getSetCalls = () =>
  (gsap.set as unknown as { mock: { calls: TweenCall[] } }).mock.calls;

const getKillCalls = () =>
  (gsap.killTweensOf as unknown as { mock: { calls: OneArgCall[] } }).mock
    .calls;

const clearGsapMocks = () => {
  vi.mocked(gsap.killTweensOf).mockClear();
  vi.mocked(gsap.set).mockClear();
  vi.mocked(gsap.to).mockClear();
};

const installMatchMedia = (initialMatches = false): MutableMediaQueryList => {
  let matches = initialMatches;
  const listeners = new Set<EventListenerOrEventListenerObject>();

  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: mediaQueryText,
    onchange: null,
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (event === "change") listeners.add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: EventListener) => {
      if (event === "change") listeners.delete(listener);
    }),
    addListener: vi.fn((listener: EventListener) => listeners.add(listener)),
    removeListener: vi.fn((listener: EventListener) =>
      listeners.delete(listener),
    ),
    dispatchEvent: vi.fn(() => true),
    emitChange: (nextMatches: boolean) => {
      matches = nextMatches;
      const event = {
        matches,
        media: mediaQueryText,
      } as MediaQueryListEvent;

      for (const listener of Array.from(listeners)) {
        if (typeof listener === "function") {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      }
    },
  } as MutableMediaQueryList;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQueryList),
  });

  return mediaQueryList;
};

const renderGlass = (props: SiriLiquidGlassProps = {}) =>
  render(<SiriLiquidGlass {...props} />);

const getGlass = (container: HTMLElement) =>
  container.firstElementChild as HTMLDivElement;

const getRotor = (container: HTMLElement) =>
  getGlass(container).firstElementChild as HTMLDivElement;

const getOrbs = (container: HTMLElement) =>
  Array.from(getRotor(container).children) as HTMLDivElement[];

const getOrbTween = (orb: HTMLDivElement) =>
  getTweenCalls().find(([target]) => target === orb)?.[1];

const hasKillCallForOrbs = (orbs: HTMLDivElement[]) =>
  getKillCalls().some(([target]) => {
    if (!Array.isArray(target) || target.length !== orbs.length) return false;
    return target.every((node, index) => node === orbs[index]);
  });

const expectResetCalls = (rotor: HTMLDivElement, orbs: HTMLDivElement[]) => {
  expect(gsap.set).toHaveBeenCalledWith(rotor, { rotate: 0 });
  expect(
    getSetCalls().some(([target, vars]) => {
      if (!Array.isArray(target) || target.length !== orbs.length) return false;
      return (
        target.every((node, index) => node === orbs[index]) &&
        vars.scale === 1 &&
        vars.x === 0 &&
        vars.y === 0
      );
    }),
  ).toBe(true);
};

beforeEach(() => {
  useStore.setState({
    animationsEnabled: true,
  });
  installMatchMedia(false);
});

describe("SiriLiquidGlass rendered default shell", () => {
  it("renders a single decorative root hidden from assistive tech", () => {
    const { container } = renderGlass();
    const glass = getGlass(container);

    expect(glass).toHaveAttribute("aria-hidden", "true");
    expect(glass).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses inactive and valid data attributes by default", () => {
    const { container } = renderGlass();

    expect(getGlass(container)).toHaveAttribute("data-active", "false");
    expect(getGlass(container)).toHaveAttribute("data-valid", "true");
  });

  it("keeps the stable absolute liquid-glass root classes", () => {
    const { container } = renderGlass();

    expect(getGlass(container)).toHaveClass(
      "absolute",
      "inset-0",
      "overflow-hidden",
      "mix-blend-screen",
      "blur-[4px]",
    );
  });

  it("renders the oversized rotor as the only direct child", () => {
    const { container } = renderGlass();
    const glass = getGlass(container);
    const rotor = getRotor(container);

    expect(glass.children).toHaveLength(1);
    expect(rotor).toHaveClass(
      "absolute",
      "w-[200%]",
      "h-[200%]",
      "top-[-50%]",
      "left-[-50%]",
    );
  });

  it("renders exactly four orb layers inside the rotor", () => {
    const { container } = renderGlass();

    expect(getOrbs(container)).toHaveLength(4);
    expect(container.querySelectorAll(".rounded-full")).toHaveLength(4);
  });

  it("renders the blue orb in its expected footprint", () => {
    const { container } = renderGlass();
    const [blueOrb] = getOrbs(container);

    expect(blueOrb).toHaveClass(
      "absolute",
      "top-[10%]",
      "right-[30%]",
      "w-[40%]",
      "h-[40%]",
      "bg-[#0a84ff]",
      "rounded-full",
      "mix-blend-screen",
    );
  });

  it("renders the purple orb in its expected footprint", () => {
    const { container } = renderGlass();
    const [, purpleOrb] = getOrbs(container);

    expect(purpleOrb).toHaveClass(
      "absolute",
      "bottom-[30%]",
      "right-[10%]",
      "w-[45%]",
      "h-[45%]",
      "bg-[#bf5af2]",
      "rounded-full",
      "mix-blend-screen",
    );
  });

  it("renders the pink orb in its expected footprint", () => {
    const { container } = renderGlass();
    const [, , pinkOrb] = getOrbs(container);

    expect(pinkOrb).toHaveClass(
      "absolute",
      "bottom-[10%]",
      "left-[30%]",
      "w-[50%]",
      "h-[50%]",
      "bg-[#ff375f]",
      "rounded-full",
      "mix-blend-screen",
    );
  });

  it("renders the cyan orb in its expected footprint", () => {
    const { container } = renderGlass();
    const [, , , cyanOrb] = getOrbs(container);

    expect(cyanOrb).toHaveClass(
      "absolute",
      "top-[30%]",
      "left-[10%]",
      "w-[40%]",
      "h-[40%]",
      "bg-[#64d2ff]",
      "rounded-full",
      "mix-blend-screen",
    );
  });

  it("does not render text, titles, labels, or status copy", () => {
    const { container } = renderGlass();

    expect(getGlass(container)).toHaveTextContent("");
    expect(container.querySelector("title")).toBeNull();
    expect(screen.queryByText(/active|valid|status|siri/i)).toBeNull();
  });

  it("does not render image, svg, video, canvas, or audio media nodes", () => {
    const { container } = renderGlass();

    expect(container.querySelector("img,svg,video,canvas,audio")).toBeNull();
  });

  it("does not expose button, link, form, or textbox semantics", () => {
    renderGlass();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("does not create focusable descendants", () => {
    const { container } = renderGlass();

    expect(
      container.querySelectorAll("a,button,input,select,textarea,[tabindex]"),
    ).toHaveLength(0);
  });
});

describe("SiriLiquidGlass state props", () => {
  it("marks active state with data-active=true", () => {
    const { container } = renderGlass({ isActive: true });

    expect(getGlass(container)).toHaveAttribute("data-active", "true");
  });

  it("marks invalid state with data-valid=false", () => {
    const { container } = renderGlass({ isValid: false });

    expect(getGlass(container)).toHaveAttribute("data-valid", "false");
  });

  it("keeps all-false boolean props rendered as stable decorative media", () => {
    const { container } = renderGlass({
      animated: false,
      isActive: false,
      isHovered: false,
      isValid: false,
    });

    expect(getGlass(container)).toHaveAttribute("aria-hidden", "true");
    expect(getGlass(container)).toHaveAttribute("data-active", "false");
    expect(getGlass(container)).toHaveAttribute("data-valid", "false");
    expect(getOrbs(container)).toHaveLength(4);
  });

  it("does not add hover state to the DOM as exposed content", () => {
    const { container } = renderGlass({ isHovered: true });
    const glass = getGlass(container);

    expect(glass).not.toHaveAttribute("data-hovered");
    expect(glass).toHaveTextContent("");
  });
});

describe("SiriLiquidGlass animation calls", () => {
  it("starts one rotor tween and four orb tweens by default", () => {
    renderGlass();

    expect(gsap.to).toHaveBeenCalledTimes(5);
  });

  it("spins the inactive rotor slowly by default", () => {
    const { container } = renderGlass();
    const rotor = getRotor(container);

    expect(gsap.to).toHaveBeenCalledWith(
      rotor,
      expect.objectContaining({
        duration: 10,
        ease: "none",
        repeat: -1,
        rotate: 360,
      }),
    );
  });

  it("kills previous rotor and orb tweens before starting new animation", () => {
    const { container } = renderGlass();

    expect(gsap.killTweensOf).toHaveBeenCalledWith(getRotor(container));
    expect(hasKillCallForOrbs(getOrbs(container))).toBe(true);
  });

  it("does not reset transforms when default animation is allowed", () => {
    renderGlass();

    expect(gsap.set).not.toHaveBeenCalled();
  });

  it("uses the inactive default orb motion values", () => {
    const { container } = renderGlass();
    const [blueOrb, purpleOrb, pinkOrb, cyanOrb] = getOrbs(container);

    expect(getOrbTween(blueOrb)).toEqual(
      expect.objectContaining({
        duration: 2,
        ease: "sine.inOut",
        repeat: -1,
        scale: 1.2,
        x: 0,
        y: 0,
        yoyo: true,
      }),
    );
    expect(getOrbTween(purpleOrb)).toEqual(
      expect.objectContaining({ duration: 2.5, scale: 1.2, x: 0, y: 0 }),
    );
    expect(getOrbTween(pinkOrb)).toEqual(
      expect.objectContaining({ duration: 3, scale: 1.25, x: 0, y: 0 }),
    );
    expect(getOrbTween(cyanOrb)).toEqual(
      expect.objectContaining({ duration: 2.2, scale: 1.15, x: 0, y: 0 }),
    );
  });

  it("spins active state faster than inactive state", () => {
    const { container } = renderGlass({ isActive: true });
    const rotor = getRotor(container);

    expect(gsap.to).toHaveBeenCalledWith(
      rotor,
      expect.objectContaining({
        duration: 3,
        repeat: -1,
        rotate: 360,
      }),
    );
  });

  it("moves the blue orb diagonally while active", () => {
    const { container } = renderGlass({ isActive: true });
    const [blueOrb] = getOrbs(container);

    expect(getOrbTween(blueOrb)).toEqual(
      expect.objectContaining({ x: 10, y: 10 }),
    );
  });

  it("moves the purple orb left while active", () => {
    const { container } = renderGlass({ isActive: true });
    const [, purpleOrb] = getOrbs(container);

    expect(getOrbTween(purpleOrb)).toEqual(
      expect.objectContaining({ x: -10, y: 0 }),
    );
  });

  it("moves the pink orb upward while active", () => {
    const { container } = renderGlass({ isActive: true });
    const [, , pinkOrb] = getOrbs(container);

    expect(getOrbTween(pinkOrb)).toEqual(
      expect.objectContaining({ x: 0, y: -15 }),
    );
  });

  it("keeps the cyan orb centered while active", () => {
    const { container } = renderGlass({ isActive: true });
    const [, , , cyanOrb] = getOrbs(container);

    expect(getOrbTween(cyanOrb)).toEqual(
      expect.objectContaining({ x: 0, y: 0 }),
    );
  });

  it("uses hover pulse values for the blue orb", () => {
    const { container } = renderGlass({ isHovered: true });
    const [blueOrb] = getOrbs(container);

    expect(getOrbTween(blueOrb)).toEqual(
      expect.objectContaining({
        duration: 0.8,
        repeat: 0,
        scale: 1.3,
        yoyo: false,
      }),
    );
  });

  it("uses hover pulse values for the purple orb", () => {
    const { container } = renderGlass({ isHovered: true });
    const [, purpleOrb] = getOrbs(container);

    expect(getOrbTween(purpleOrb)).toEqual(
      expect.objectContaining({
        duration: 0.8,
        repeat: 0,
        scale: 1.2,
        yoyo: false,
      }),
    );
  });

  it("uses hover pulse values for the pink orb", () => {
    const { container } = renderGlass({ isHovered: true });
    const [, , pinkOrb] = getOrbs(container);

    expect(getOrbTween(pinkOrb)).toEqual(
      expect.objectContaining({
        duration: 0.8,
        repeat: 0,
        scale: 1.4,
        yoyo: false,
      }),
    );
  });

  it("uses hover pulse values for the cyan orb", () => {
    const { container } = renderGlass({ isHovered: true });
    const [, , , cyanOrb] = getOrbs(container);

    expect(getOrbTween(cyanOrb)).toEqual(
      expect.objectContaining({
        duration: 0.8,
        repeat: 0,
        scale: 1.2,
        yoyo: false,
      }),
    );
  });

  it("combines active offsets with hover pulse timing", () => {
    const { container } = renderGlass({ isActive: true, isHovered: true });
    const [blueOrb, purpleOrb, pinkOrb] = getOrbs(container);

    expect(getOrbTween(blueOrb)).toEqual(
      expect.objectContaining({ duration: 0.8, x: 10, y: 10 }),
    );
    expect(getOrbTween(purpleOrb)).toEqual(
      expect.objectContaining({ duration: 0.8, x: -10, y: 0 }),
    );
    expect(getOrbTween(pinkOrb)).toEqual(
      expect.objectContaining({ duration: 0.8, x: 0, y: -15 }),
    );
  });
});

describe("SiriLiquidGlass reduced-motion and disabled-animation behavior", () => {
  it("resets transforms and skips tweens when animated=false", () => {
    const { container } = renderGlass({ animated: false });
    const rotor = getRotor(container);
    const orbs = getOrbs(container);

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });

  it("still renders state attributes when animated=false", () => {
    const { container } = renderGlass({
      animated: false,
      isActive: true,
      isValid: false,
    });

    expect(getGlass(container)).toHaveAttribute("data-active", "true");
    expect(getGlass(container)).toHaveAttribute("data-valid", "false");
  });

  it("resets transforms when the app animation setting is disabled", () => {
    useStore.setState({ animationsEnabled: false });
    const { container } = renderGlass();
    const rotor = getRotor(container);
    const orbs = getOrbs(container);

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });

  it("resets transforms when the OS prefers reduced motion", () => {
    installMatchMedia(true);
    const { container } = renderGlass();
    const rotor = getRotor(container);
    const orbs = getOrbs(container);

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });

  it("animates when matchMedia is unavailable and app animations are enabled", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    renderGlass();

    expect(gsap.to).toHaveBeenCalledTimes(5);
    expect(gsap.set).not.toHaveBeenCalled();
  });

  it("resets active animations when a reduced-motion media change arrives", () => {
    const mediaQueryList = installMatchMedia(false);
    const { container } = renderGlass({ isActive: true });
    const rotor = getRotor(container);
    const orbs = getOrbs(container);
    clearGsapMocks();

    act(() => {
      mediaQueryList.emitChange(true);
    });

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });

  it("starts animation again when reduced-motion preference turns off", () => {
    const mediaQueryList = installMatchMedia(true);
    const { container } = renderGlass({ isActive: true });
    const rotor = getRotor(container);
    clearGsapMocks();

    act(() => {
      mediaQueryList.emitChange(false);
    });

    expect(gsap.set).not.toHaveBeenCalled();
    expect(gsap.to).toHaveBeenCalledWith(
      rotor,
      expect.objectContaining({ duration: 3, rotate: 360 }),
    );
  });

  it("responds to store animation preference changes after mount", () => {
    const { container } = renderGlass();
    const rotor = getRotor(container);
    const orbs = getOrbs(container);
    clearGsapMocks();

    act(() => {
      useStore.setState({ animationsEnabled: false });
    });

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });
});

describe("SiriLiquidGlass rerender, cleanup, and interaction behavior", () => {
  it("updates data-active when rerendered from inactive to active", () => {
    const { container, rerender } = renderGlass({ isActive: false });

    expect(getGlass(container)).toHaveAttribute("data-active", "false");
    rerender(<SiriLiquidGlass isActive />);
    expect(getGlass(container)).toHaveAttribute("data-active", "true");
  });

  it("starts the faster active rotor tween after active rerender", () => {
    const { container, rerender } = renderGlass({ isActive: false });
    const rotor = getRotor(container);
    clearGsapMocks();

    rerender(<SiriLiquidGlass isActive />);

    expect(gsap.to).toHaveBeenCalledWith(
      rotor,
      expect.objectContaining({ duration: 3, rotate: 360 }),
    );
  });

  it("updates data-valid when rerendered from invalid to valid", () => {
    const { container, rerender } = renderGlass({ isValid: false });

    expect(getGlass(container)).toHaveAttribute("data-valid", "false");
    rerender(<SiriLiquidGlass isValid />);
    expect(getGlass(container)).toHaveAttribute("data-valid", "true");
  });

  it("resets transforms after rerendering animated from true to false", () => {
    const { container, rerender } = renderGlass({ animated: true });
    const rotor = getRotor(container);
    const orbs = getOrbs(container);
    clearGsapMocks();

    rerender(<SiriLiquidGlass animated={false} />);

    expect(gsap.to).not.toHaveBeenCalled();
    expectResetCalls(rotor, orbs);
  });

  it("kills rotor tweens when unmounted", () => {
    const { container, unmount } = renderGlass();
    const rotor = getRotor(container);
    clearGsapMocks();

    unmount();

    expect(gsap.killTweensOf).toHaveBeenCalledWith(rotor);
  });

  it("kills orb tweens when unmounted", () => {
    const { container, unmount } = renderGlass();
    const orbs = getOrbs(container);
    clearGsapMocks();

    unmount();

    expect(hasKillCallForOrbs(orbs)).toBe(true);
  });

  it("removes the decorative DOM on cleanup", () => {
    const { container, unmount } = renderGlass();

    expect(container.firstElementChild).not.toBeNull();
    unmount();
    expect(container.firstElementChild).toBeNull();
  });

  it("renders multiple instances with independent data states", () => {
    const { container } = render(
      <>
        <SiriLiquidGlass isActive />
        <SiriLiquidGlass isValid={false} />
      </>,
    );
    const glasses = Array.from(container.children);

    expect(glasses).toHaveLength(2);
    expect(glasses[0]).toHaveAttribute("data-active", "true");
    expect(glasses[0]).toHaveAttribute("data-valid", "true");
    expect(glasses[1]).toHaveAttribute("data-active", "false");
    expect(glasses[1]).toHaveAttribute("data-valid", "false");
  });

  it("ignores click interaction because the layer is decorative only", () => {
    const { container } = renderGlass({ isActive: false, isValid: true });
    const glass = getGlass(container);

    fireEvent.click(glass);

    expect(glass).toHaveAttribute("data-active", "false");
    expect(glass).toHaveAttribute("data-valid", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ignores keyboard interaction because the layer is decorative only", () => {
    const { container } = renderGlass({ isActive: false });
    const glass = getGlass(container);

    fireEvent.keyDown(glass, { key: "Enter" });
    fireEvent.keyDown(glass, { key: " " });

    expect(glass).toHaveAttribute("data-active", "false");
    expect(document.activeElement).not.toBe(glass);
  });
});
