/**
 * Floating navigation pill. The active highlight is a libraries.dev
 * liquid-gooey surface ("move" effect): when the view changes it runs to the
 * new tab like a drop of liquid, stretching with a trailing droplet.
 */
import { Liquid } from "liquid-gooey";
import { BarChart3, BookOpen, Settings, Sparkles } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { IconButton, cx } from "@/components/ui";
import { useApp, useMotion, type View } from "@/store/app";

const ITEMS: Array<{ view: View; label: string; icon: typeof BookOpen }> = [
  { view: "study", label: "Study", icon: BookOpen },
  { view: "revision", label: "Revision", icon: Sparkles },
  { view: "analytics", label: "Analytics", icon: BarChart3 },
];

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function Navigation() {
  const view = useApp((state) => state.view);
  const setView = useApp((state) => state.setView);
  const set = useApp((state) => state.set);
  const motionOn = useMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);

  // Place the highlight under the active tab (and keep it there on resize).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const tab = list.querySelector<HTMLElement>(`[data-tab="${view}"]`);
      if (!tab) return;
      const listBox = list.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      setPill({ x: tabBox.left - listBox.left, width: tabBox.width });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [view]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-3 pt-3 sm:px-5">
      <div className="pointer-events-auto flex items-center gap-2 pl-1">
        <span
          className="grid size-8 grid-cols-2 gap-[3px] rounded-xl bg-white/5 p-[7px] ring-1 ring-white/8"
          aria-hidden
        >
          <span className="rounded-full bg-signal" />
          <span className="rounded-full bg-white" />
          <span className="rounded-full bg-white" />
          <span className="rounded-full ring-1 ring-white" />
        </span>
        <span className="hidden font-display text-sm tracking-tight text-fog-200 sm:inline">Tutor</span>
      </div>
      <nav className="glass pointer-events-auto rounded-full p-1 shadow-[var(--shadow-float)]" aria-label="Main">
        <Liquid
          ref={listRef}
          fill="#2a2a30"
          shadow="inset 0 0 0 1px rgba(255,255,255,0.09)"
          className="relative flex items-center gap-1"
        >
          {pill && (
            // Liquid.Item renders `display: contents`: position the moving element itself.
            <Liquid.Item effect="move" move={{ springiness: 0.55, wobble: 0.45, stretch: 0.4, trail: 0.55 }}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: pill.width,
                  transform: `translateX(${pill.x}px)`,
                  transition: motionOn ? `transform 460ms ${EASE}, width 460ms ${EASE}` : "none",
                }}
              />
            </Liquid.Item>
          )}
          {ITEMS.map(({ view: item, label, icon: Icon }) => {
            const active = view === item;
            return (
              <button
                key={item}
                data-tab={item}
                onClick={() => setView(item)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors sm:px-4",
                  active ? "text-white" : "text-fog-400 hover:text-fog-50",
                )}
              >
                <Icon className={cx("relative size-3.5", active && "text-signal")} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </Liquid>
      </nav>
      <div className="pointer-events-auto">
        <IconButton label="Settings" tone="glass" onClick={() => set({ settingsOpen: true })}>
          <Settings className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}
