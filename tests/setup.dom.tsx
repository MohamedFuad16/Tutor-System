import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("gsap", () => {
  const tween = { kill: vi.fn() };
  const gsap = {
    context: vi.fn((callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    }),
    fromTo: vi.fn(() => tween),
    getProperty: vi.fn(() => 1),
    killTweensOf: vi.fn(),
    set: vi.fn(),
    to: vi.fn(() => tween),
  };
  return { gsap };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null as ((event: MediaQueryListEvent) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverStub,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverStub,
});

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:learningai-test");
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorage.clear();
});
