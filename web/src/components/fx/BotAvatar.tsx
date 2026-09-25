/**
 * Animated tutor avatar: a glossy body with a living face. Idle, it glances
 * corner to corner, blinks, and now and then hops with a full turn; working,
 * it hops continuously, spins every third hop and smiles. Its eyes follow a
 * nearby pointer, and a click makes it hop.
 *
 * First-party component with the libraries.dev "Bot avatars" API
 * (`type`, `state`, `size`, `paused`), so the `bot-avatars` package can
 * replace it without touching call sites once it's approved for install.
 */
import { motion, useAnimate, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

export type BotAvatarType = "clover" | "flower" | "star" | "ghost" | "mech" | "circle" | "hexagon" | "square";
export type BotAvatarState = "default" | "working";

export const BOT_TYPES: readonly BotAvatarType[] = [
  "clover",
  "flower",
  "star",
  "ghost",
  "mech",
  "circle",
  "hexagon",
  "square",
];

export const BOT_LABELS: Record<BotAvatarType, string> = {
  clover: "Clover",
  flower: "Flower",
  star: "Star",
  ghost: "Ghost",
  mech: "Mech",
  circle: "Orbit",
  hexagon: "Hex",
  square: "Block",
};

/** Body colour per type: [highlight, base, shadow]. */
const COLORS: Record<BotAvatarType, [string, string, string]> = {
  clover: ["#d8ccff", "#8b5cf6", "#4c1d95"],
  flower: ["#ffd3ec", "#f472b6", "#9d174d"],
  star: ["#fff1b8", "#fbbf24", "#b45309"],
  ghost: ["#e0f5ff", "#7dd3fc", "#0369a1"],
  mech: ["#eef2f7", "#94a3b8", "#334155"],
  circle: ["#ffd6b3", "#ff7a1a", "#9a3412"],
  hexagon: ["#c9f7e4", "#34d399", "#047857"],
  square: ["#d6e6ff", "#60a5fa", "#1d4ed8"],
};

const star = (() => {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 17 : 33;
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(1)},${(56 + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
})();

const hexagon = Array.from({ length: 6 }, (_, i) => {
  const angle = Math.PI / 6 + (i * Math.PI) / 3;
  return `${(50 + 31 * Math.cos(angle)).toFixed(1)},${(54 + 31 * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

/** Body silhouette. Every piece shares one user-space gradient so unions read as one surface. */
function Body({ type, fill }: { type: BotAvatarType; fill: string }) {
  const round = { stroke: fill, strokeLinejoin: "round" as const };
  switch (type) {
    case "circle":
      return <circle cx="50" cy="54" r="32" fill={fill} />;
    case "square":
      return <rect x="19" y="23" width="62" height="62" rx="19" fill={fill} />;
    case "hexagon":
      return <polygon points={hexagon} fill={fill} {...round} strokeWidth="10" />;
    case "star":
      return <polygon points={star} fill={fill} {...round} strokeWidth="11" />;
    case "clover":
      return (
        <g fill={fill}>
          <circle cx="36" cy="40" r="17" />
          <circle cx="64" cy="40" r="17" />
          <circle cx="36" cy="68" r="17" />
          <circle cx="64" cy="68" r="17" />
          <circle cx="50" cy="54" r="20" />
        </g>
      );
    case "flower":
      return (
        <g fill={fill}>
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * Math.PI) / 3 - Math.PI / 2;
            return <circle key={i} cx={50 + 19 * Math.cos(angle)} cy={54 + 19 * Math.sin(angle)} r="14.5" />;
          })}
          <circle cx="50" cy="54" r="21" />
        </g>
      );
    case "ghost":
      return (
        <path
          fill={fill}
          d="M19 56a31 31 0 0 1 62 0v24c-3.4 5-7 5-10.3 0s-6.9-5-10.3 0-6.9 5-10.4 0-6.9-5-10.3 0-6.9 5-10.4 0-6.9-5-10.3 0z"
        />
      );
    case "mech":
      return (
        <g fill={fill}>
          <rect x="47" y="12" width="6" height="14" rx="3" />
          <circle cx="50" cy="12" r="6" />
          <rect x="12" y="46" width="10" height="18" rx="5" />
          <rect x="78" y="46" width="10" height="18" rx="5" />
          <rect x="19" y="25" width="62" height="58" rx="17" />
        </g>
      );
  }
}

const LOOKS = [
  [0, 0],
  [-4.5, -2.5],
  [4.5, -2.5],
  [-4.5, 2.5],
  [4.5, 2.5],
  [0, 0],
] as const;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function BotAvatar({
  type = "clover",
  state = "default",
  size = 64,
  paused = false,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: {
  type?: BotAvatarType;
  state?: BotAvatarState;
  size?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const motionOn = useMotion();
  const live = motionOn && !paused;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [visible, setVisible] = useState(true);
  const [blink, setBlink] = useState(false);
  const [happy, setHappy] = useState(false);
  const lookX = useMotionValue(0);
  const lookY = useMotionValue(0);
  const eyeX = useSpring(lookX, { stiffness: 260, damping: 22 });
  const eyeY = useSpring(lookY, { stiffness: 260, damping: 22 });
  const pointerNear = useRef(false);
  const busy = useRef(false);
  const working = state === "working";
  const [light, base, shadow] = COLORS[type];

  // Pause everything while scrolled away.
  useEffect(() => {
    const node = scope.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "64px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [scope]);
  const active = live && visible;

  const hop = useCallback(
    async (spin: boolean, height = 0.16) => {
      if (!scope.current || busy.current) return;
      busy.current = true;
      const lift = -size * height;
      try {
        await animate(scope.current, { scaleY: 0.86, scaleX: 1.1, y: 0 }, { duration: 0.09, ease: "easeOut" });
        await animate(
          scope.current,
          { y: lift, scaleY: 1.06, scaleX: 0.95, rotate: spin ? 180 : 0 },
          { duration: 0.2, ease: [0.2, 0.9, 0.3, 1] },
        );
        await animate(
          scope.current,
          { y: 0, scaleY: 1, scaleX: 1, rotate: spin ? 360 : 0 },
          { duration: 0.22, ease: [0.5, 0, 0.8, 0.6] },
        );
        await animate(scope.current, { scaleY: 0.92, scaleX: 1.06 }, { duration: 0.06 });
        await animate(scope.current, { scaleY: 1, scaleX: 1, rotate: 0 }, { duration: 0.12, ease: "easeOut" });
      } finally {
        busy.current = false;
      }
    },
    [animate, scope, size],
  );

  // Blinking (both states).
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(
        () => {
          setBlink(true);
          window.setTimeout(() => setBlink(false), 130);
          next();
        },
        rand(2200, 5200),
      );
    };
    next();
    return () => window.clearTimeout(timer);
  }, [active]);

  // Idle: glance around, with an occasional hop-and-turn.
  useEffect(() => {
    if (!active || working) return;
    setHappy(false);
    let timer = 0;
    let count = 0;
    const next = () => {
      timer = window.setTimeout(
        () => {
          count += 1;
          if (!pointerNear.current) {
            const [x, y] = LOOKS[Math.floor(Math.random() * LOOKS.length)];
            lookX.set(x);
            lookY.set(y);
          }
          if (count % 5 === 0) void hop(true, 0.12);
          next();
        },
        rand(1600, 3000),
      );
    };
    next();
    return () => window.clearTimeout(timer);
  }, [active, working, hop, lookX, lookY]);

  // Working: continuous hops, a spin every third, a grin now and then.
  useEffect(() => {
    if (!active || !working) return;
    let alive = true;
    let hops = 0;
    lookX.set(0);
    lookY.set(-1.5);
    const run = async () => {
      while (alive) {
        hops += 1;
        setHappy(hops % 4 !== 1);
        await hop(hops % 3 === 0, 0.14);
        await new Promise((resolve) => window.setTimeout(resolve, 140));
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [active, working, hop, lookX, lookY]);

  // Eyes follow a nearby pointer.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const node = scope.current;
        if (!node) return;
        const box = node.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy);
        pointerNear.current = distance < Math.max(160, size * 3);
        if (!pointerNear.current) return;
        const reach = Math.min(1, distance / (size * 1.5));
        lookX.set((dx / (distance || 1)) * 5 * reach);
        lookY.set((dy / (distance || 1)) * 3.5 * reach);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [active, lookX, lookY, scope, size]);

  const overscan = size * 0.5;
  const label = ariaLabel ?? `${BOT_LABELS[type]} tutor, ${working ? "working" : "idle"}`;
  const eyeHeight = blink ? 1.2 : happy ? 0 : 11;
  const faceY = type === "ghost" ? 2 : type === "star" ? 3 : 0;

  return (
    <span
      className={cx("relative inline-block shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      role={ariaHidden ? undefined : "img"}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden || undefined}
      onClick={() => live && void hop(true, 0.2)}
    >
      <div
        ref={scope}
        className="absolute"
        style={{
          inset: -overscan,
          width: size + overscan * 2,
          height: size + overscan * 2,
          padding: overscan,
          transformOrigin: "50% 58%",
        }}
      >
        <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden>
          <defs>
            <radialGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" cx="36" cy="32" r="70">
              <stop offset="0" stopColor={light} />
              <stop offset="0.45" stopColor={base} />
              <stop offset="1" stopColor={shadow} />
            </radialGradient>
            <radialGradient id={`${id}-shine`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#000" stopOpacity="0.28" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="93" rx="24" ry="4" fill={`url(#${id}-shadow)`} />
          <Body type={type} fill={`url(#${id}-body)`} />
          {/* Rim light and specular highlight give the glossy, 3D read. */}
          <ellipse cx="37" cy="34" rx="13" ry="8" fill={`url(#${id}-shine)`} transform="rotate(-24 37 34)" />
          <ellipse cx="63" cy="80" rx="15" ry="3.5" fill="#fff" opacity="0.14" />
          <motion.g style={{ x: eyeX, y: eyeY }}>
            <g transform={`translate(0 ${faceY})`}>
              <ellipse cx="38" cy="66" rx="5" ry="3" fill="#ff5c8a" opacity="0.28" />
              <ellipse cx="62" cy="66" rx="5" ry="3" fill="#ff5c8a" opacity="0.28" />
              {happy && !blink ? (
                <g fill="none" stroke="#1c1530" strokeWidth="3.2" strokeLinecap="round">
                  <path d="M37 57q4-6 8 0" />
                  <path d="M55 57q4-6 8 0" />
                </g>
              ) : (
                <g fill="#1c1530">
                  <rect x="37" y={56 - eyeHeight / 2} width="8" height={Math.max(eyeHeight, 1.2)} rx="4" />
                  <rect x="55" y={56 - eyeHeight / 2} width="8" height={Math.max(eyeHeight, 1.2)} rx="4" />
                  {!blink && (
                    <>
                      <circle cx="42.6" cy="53" r="1.5" fill="#fff" />
                      <circle cx="60.6" cy="53" r="1.5" fill="#fff" />
                    </>
                  )}
                </g>
              )}
              <path
                d={working ? "M44 66q6 6.5 12 0" : "M46 67q4 2.2 8 0"}
                fill={working && happy ? "#1c1530" : "none"}
                stroke="#1c1530"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>
          </motion.g>
        </svg>
      </div>
    </span>
  );
}
