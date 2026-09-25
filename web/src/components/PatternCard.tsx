/**
 * The Tutor signature: tall cards with a dot-matrix glyph and a soft bloom.
 * Three themes — ink (black), ember (orange), paper (warm grey) — used for
 * the intro fan, notebook covers and built-in books.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cx, softSpring } from "./ui";

export type CardTheme = "ink" | "ember" | "paper";

const THEMES: Record<
  CardTheme,
  { bg: string; text: string; dot: string; bloom: string; bloomOpacity: number; sub: string }
> = {
  ink: {
    bg: "#0a0a0a",
    text: "#fefefe",
    dot: "#fefefe",
    bloom: "255,255,255",
    bloomOpacity: 0.1,
    sub: "rgba(254,254,254,0.62)",
  },
  ember: {
    bg: "#ff6e00",
    text: "#fefefe",
    dot: "#fefefe",
    bloom: "255,190,130",
    bloomOpacity: 0.55,
    sub: "rgba(255,255,255,0.8)",
  },
  paper: {
    bg: "#ecebe9",
    text: "#1f1f1f",
    dot: "#ff6e00",
    bloom: "255,110,0",
    bloomOpacity: 0.16,
    sub: "rgba(31,31,31,0.62)",
  },
};

/**
 * Dot patterns on a 5×7 grid. Values: 0 empty, (0,1] filled dot scale,
 * negative = ring of that scale.
 */
const PATTERNS: number[][][] = [
  [
    [0, 0, 1, 0, 0],
    [0, 0.9, 1, 0.8, -1],
    [0.35, 1, 1, -0.9, 0.35],
    [0, 1, 0.3, -1, 1],
    [0, 0, -1, 0, 0],
    [0.2, 0, 0, 0.2, 0.2],
    [0, 0, 0.2, 0, 0],
  ],
  [
    [0.2, -0.8, 0, 0, 0],
    [0.1, 0.9, 1, 0, 0],
    [0, 1, 1, -1, 0],
    [0.7, 0, 0.3, -1, 1],
    [0.2, 0, 0, 0.85, 1],
    [0, 0, 0, 0.2, 0.2],
    [0, 0, 0, 0, 0],
  ],
  [
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0.35, 1, 1, -1, 0.35],
    [0, 0, 0.3, 0, 0],
    [0, 0, -1, 0, 0],
    [1, 0.8, 0, 0.55, 1],
    [0, 0, 0.4, 0, 0],
  ],
];

export function DotMatrix({
  pattern = 0,
  color,
  size = 110,
  animate = true,
}: {
  pattern?: number;
  color: string;
  size?: number;
  animate?: boolean;
}) {
  const grid = PATTERNS[pattern % PATTERNS.length];
  const cell = size / 5;
  const r = cell * 0.43;
  return (
    <svg
      width={size}
      height={cell * grid.length}
      viewBox={`0 0 ${size} ${cell * grid.length}`}
      aria-hidden
      className="overflow-visible"
    >
      {grid.flatMap((row, y) =>
        row.map((value, x) => {
          if (!value) return null;
          const cxp = x * cell + cell / 2;
          const cyp = y * cell + cell / 2;
          const faded = y >= 5;
          const common = { cx: cxp, cy: cyp, opacity: faded ? 0.22 : 1 };
          const delay = (x + y) * 0.04;
          return value > 0 ? (
            <motion.circle
              key={`${x}-${y}`}
              {...common}
              fill={color}
              initial={animate ? { r: 0 } : false}
              animate={{ r: r * value }}
              transition={{ ...softSpring, delay }}
            />
          ) : (
            <motion.circle
              key={`${x}-${y}`}
              {...common}
              fill="none"
              stroke={color}
              strokeWidth={cell * 0.05}
              initial={animate ? { r: 0 } : false}
              animate={{ r: r * -value * 0.94 }}
              transition={{ ...softSpring, delay }}
            />
          );
        }),
      )}
    </svg>
  );
}

export function PatternCard({
  theme,
  pattern = 0,
  title,
  subtitle,
  icon,
  footer,
  onClick,
  className,
  children,
  compact,
}: {
  theme: CardTheme;
  pattern?: number;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const t = THEMES[theme];
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      onClick={onClick}
      whileHover={onClick ? { y: -4, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={softSpring}
      style={{ background: t.bg, color: t.text }}
      className={cx(
        "group relative flex flex-col overflow-hidden text-left",
        compact ? "rounded-[1.5rem] p-5" : "rounded-[2rem] p-7",
        theme === "ink" && "ring-1 ring-white/10",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[140%] rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, rgba(${t.bloom},${t.bloomOpacity}) 0%, transparent 60%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <div className="relative">
        <DotMatrix pattern={pattern} color={t.dot} size={compact ? 70 : 100} />
      </div>
      <div className="relative mt-auto pt-6">
        {icon && (
          <div
            className="mb-4 flex size-10 items-center justify-center rounded-full"
            style={{ background: theme === "paper" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.14)" }}
          >
            {icon}
          </div>
        )}
        <h3 className={cx("leading-[1.05]", compact ? "text-xl" : "text-[1.7rem]")}>{title}</h3>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: t.sub }}>
            {subtitle}
          </p>
        )}
        {children}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </Tag>
  );
}
