/**
 * Floating navigation pill; the active highlight moves between tabs like a
 * drop of liquid.
 */
import { BarChart3, BookOpen, Settings, Sparkles } from "lucide-react";
import { LiquidIndicator } from "@/components/fx/LiquidIndicator";
import { IconButton, cx } from "@/components/ui";
import { useApp, type View } from "@/store/app";

const ITEMS: Array<{ view: View; label: string; icon: typeof BookOpen }> = [
  { view: "study", label: "Study", icon: BookOpen },
  { view: "revision", label: "Revision", icon: Sparkles },
  { view: "analytics", label: "Analytics", icon: BarChart3 },
];

export function Navigation() {
  const view = useApp((state) => state.view);
  const setView = useApp((state) => state.setView);
  const set = useApp((state) => state.set);
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
      <nav
        className="glass pointer-events-auto relative flex items-center gap-1 rounded-full p-1 shadow-[var(--shadow-float)]"
        aria-label="Main"
      >
        <LiquidIndicator active={view} />
        {ITEMS.map(({ view: item, label, icon: Icon }) => {
          const active = view === item;
          return (
            <button
              key={item}
              data-liquid-key={item}
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
      </nav>
      <div className="pointer-events-auto">
        <IconButton label="Settings" tone="glass" onClick={() => set({ settingsOpen: true })}>
          <Settings className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}
