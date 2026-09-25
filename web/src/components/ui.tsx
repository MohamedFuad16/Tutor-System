/**
 * Small, shared UI primitives. Everything interactive gets a spring press and
 * an accessible label; surfaces come in three flavours: dark, glass, paper.
 */
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { X } from "lucide-react";
import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const spring = { type: "spring", stiffness: 420, damping: 30, mass: 0.7 } as const;
export const softSpring = { type: "spring", stiffness: 220, damping: 26 } as const;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost" | "dark" | "light" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "dark", size = "md", className, children, ...props },
  ref,
) {
  const styles = {
    primary: "bg-signal text-white hover:bg-signal-soft shadow-[0_8px_24px_-8px_rgba(255,110,0,0.6)]",
    dark: "bg-ink-700 text-fog-50 hover:bg-ink-600 border border-white/8",
    ghost: "text-fog-400 hover:text-fog-50 hover:bg-white/6",
    light: "bg-white text-ink-900 hover:bg-fog-50 border border-black/8 shadow-sm",
    danger: "bg-bad/15 text-bad hover:bg-bad/25 border border-bad/30",
  }[variant];
  const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-5 text-[0.95rem] gap-2" }[
    size
  ];
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={cx(
        "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-45",
        styles,
        sizes,
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

type IconButtonProps = HTMLMotionProps<"button"> & {
  label: string;
  tone?: "dark" | "light" | "glass";
  size?: number;
  active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "dark", size = 40, active, className, children, ...props },
  ref,
) {
  const styles = {
    dark: active ? "bg-white/12 text-white" : "text-fog-400 hover:text-white hover:bg-white/8",
    glass: active ? "glass text-white" : "glass text-fog-200 hover:text-white",
    light: active ? "bg-black/8 text-ink-900" : "text-stone-500 hover:text-ink-900 hover:bg-black/6",
  }[tone];
  return (
    <motion.button
      ref={ref}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      style={{ width: size, height: size }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mastery ring: -1 means "not assessed yet". */
export function MasteryRing({
  value,
  size = 28,
  stroke = 3,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const assessed = value >= 0;
  const color = !assessed ? "#9ca3af" : value >= 0.8 ? "#34d399" : value >= 0.4 ? "#fbbf24" : "#fb923c";
  return (
    <svg
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={assessed ? `Mastery ${Math.round(value * 100)}%` : "Not assessed yet"}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth={stroke}
      />
      {assessed && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0.02, value)) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
  tone = "dark",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  tone?: "dark" | "paper";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={softSpring}
            style={{ maxWidth: width }}
            className={cx(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem]",
              tone === "paper"
                ? "paper text-paper-ink"
                : "border border-white/8 bg-ink-850 text-fog-50 shadow-[var(--shadow-float)]",
            )}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-lg">{title}</h2>
              <IconButton label="Close" tone={tone === "paper" ? "light" : "dark"} size={34} onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type ToastItem = { id: number; text: string; tone: "info" | "error" };
let toastListener: ((toast: ToastItem) => void) | null = null;
let toastId = 0;

export function toast(text: string, tone: ToastItem["tone"] = "info") {
  toastListener?.({ id: ++toastId, text, tone });
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    toastListener = (item) => {
      setItems((list) => [...list.slice(-2), item]);
      window.setTimeout(() => setItems((list) => list.filter((entry) => entry.id !== item.id)), 4200);
    };
    return () => {
      toastListener = null;
    };
  }, [setItems]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className={cx(
              "pointer-events-auto glass max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-[var(--shadow-float)]",
              item.tone === "error" ? "text-red-200" : "text-fog-50",
            )}
            role="status"
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-white/6 text-fog-400">{icon}</div>
      <h3 className="text-base text-fog-50">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-fog-400">{body}</p>
      {action}
    </div>
  );
}

export function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 45_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
