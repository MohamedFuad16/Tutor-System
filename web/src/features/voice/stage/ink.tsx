/**
 * The magic pen's nib, shared by the whiteboard and the document highlighter:
 * a glowing tip with a comet tail and a few sparks (styles in styles.css).
 */
import { motion } from "motion/react";
import { cx } from "@/components/ui";

/** The nib: a glowing tip with a comet tail and a few sparks. */
export function Nib({
  className,
  style,
}: {
  className?: string;
  style?: React.ComponentProps<typeof motion.span>["style"];
}) {
  return (
    <motion.span aria-hidden className={cx("pen-nib", className)} style={style}>
      <svg className="pen-body" viewBox="0 0 24 64" width="14" height="38">
        <defs>
          <linearGradient id="pen-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#e9e4ff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d="M12 64 L5 44 L5 6 Q12 0 19 6 L19 44 Z" fill="url(#pen-grad)" opacity="0.92" />
        <path d="M12 64 L8.5 50 L15.5 50 Z" fill="#fff" />
      </svg>
      <span className="spark" style={{ ["--dx" as string]: "-14px", ["--dy" as string]: "-10px" }} />
      <span
        className="spark"
        style={{ ["--dx" as string]: "-22px", ["--dy" as string]: "8px", animationDelay: "0.18s" }}
      />
      <span
        className="spark"
        style={{ ["--dx" as string]: "-8px", ["--dy" as string]: "14px", animationDelay: "0.34s" }}
      />
    </motion.span>
  );
}
