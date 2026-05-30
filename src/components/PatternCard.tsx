import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SvgDark, SvgOrange, SvgBeige } from "./PatternSVGs";
import { useMotionPreference } from "../hooks/useMotionPreference";

export const themes = [
  {
    bg: "bg-[#0a0a0a]",
    text: "text-[#fefefe]",
    SvgComponent: SvgDark,
    bloom: "rgb(255, 255, 255)",
    bloomOpacity: 0.12,
  },
  {
    bg: "bg-[#ff6e00]",
    text: "text-[#fefefe]",
    SvgComponent: SvgOrange,
    bloom: "rgb(255, 176, 102)",
    bloomOpacity: 0.55,
  },
  {
    bg: "bg-[#ecebe9]",
    text: "text-[#1f1f1f]",
    SvgComponent: SvgBeige,
    bloom: "rgb(255, 110, 0)",
    bloomOpacity: 0.18,
  },
];

const pressDots = [
  { x: 63.5, y: 12.7, s: 1 },
  { x: 38.1, y: 38.1, s: 0.9 },
  { x: 63.5, y: 38.1, s: 1 },
  { x: 88.9, y: 38.1, s: 0.82 },
  { x: 114.3, y: 38.1, ring: true },
  { x: 12.7, y: 63.5, ring: true, s: 0.52 },
  { x: 38.1, y: 63.5, s: 1 },
  { x: 63.5, y: 63.5, s: 1 },
  { x: 88.9, y: 63.5, ring: true },
  { x: 114.3, y: 63.5, ring: true, s: 0.55 },
  { x: 38.1, y: 88.9, s: 1 },
  { x: 63.5, y: 88.9, ring: true, s: 0.48 },
  { x: 88.9, y: 88.9, ring: true },
  { x: 114.3, y: 88.9, s: 1 },
  { x: 12.7, y: 117.9, s: 0.55 },
  { x: 63.5, y: 114.3, ring: true },
];

export const PatternCard = ({
  children,
  bgClass,
  SvgComponent,
  bloomColor,
  bloomOpacity,
  onClick = () => {},
  layoutId,
  isDragging = false,
  isPressing = false,
  animateDots = true,
  pressDotColor,
  pressRingColor,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  children: React.ReactNode;
  bgClass: string;
  SvgComponent: React.ElementType;
  bloomColor: string;
  bloomOpacity: number;
  onClick?: () => void;
  layoutId?: string;
  isDragging?: boolean;
  isPressing?: boolean;
  animateDots?: boolean;
  pressDotColor?: string;
  pressRingColor?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<HTMLSpanElement[]>([]);
  const motionEnabled = useMotionPreference();
  const resolvedDotColor =
    pressDotColor || (bgClass.includes("ecebe9") ? "#ff6e00" : "#fefefe");
  const resolvedRingColor =
    pressRingColor ||
    (bgClass.includes("ecebe9")
      ? "rgba(255,110,0,0.58)"
      : "rgba(254,254,254,0.55)");

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const animateCardScale = (scale: number) => {
    if (!motionEnabled || !cardRef.current) return;
    gsap.to(cardRef.current, {
      scale,
      duration: scale < 1 ? 0.14 : 0.28,
      ease: "power3.out",
    });
  };

  useEffect(() => {
    const dots = dotRefs.current.filter(Boolean);
    if (!dots.length) return;
    gsap.killTweensOf(dots);

    dots.forEach((dotNode, index) => {
      const dot = pressDots[index];
      const baseScale = dot?.s ?? 1;
      const active = isPressing || isDragging;
      const targetOpacity = dot?.ring
        ? active
          ? 0.95
          : 0.52
        : active
          ? 1
          : 0.76;
      const baseOpacity = dot?.ring ? 0.28 : 0.42;

      gsap.set(dotNode, {
        scale: baseScale,
        opacity: animateDots ? baseOpacity : 0,
        y: 0,
      });

      if (!motionEnabled || !animateDots) return;
      gsap.to(dotNode, {
        scale: baseScale * (active ? 1.36 : 1.12),
        opacity: targetOpacity,
        y: active ? -2.5 : -1.1,
        duration: active ? 0.82 : 2.8 + (index % 4) * 0.18,
        delay: index * 0.045,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => {
      gsap.killTweensOf(dots);
    };
  }, [animateDots, isDragging, isPressing, motionEnabled, pressDots]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => animateCardScale(1.02)}
      onMouseLeave={() => animateCardScale(1)}
      onMouseDown={() => animateCardScale(0.98)}
      onMouseUp={() => animateCardScale(1.02)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group cursor-pointer shrink-0 w-[min(324px,calc(100vw-2rem))] h-[min(414px,calc((100vw-2rem)*1.2778))] min-h-[366px] mx-auto transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-400 ease-[cubic-bezier(0.22,0.61,0.36,1)] relative overflow-hidden rounded-[36px] sm:rounded-[44.875px] origin-top ${bgClass} ${isDragging ? "ring-4 ring-blue-500/50 scale-[1.02]" : ""}`}
      data-layout-id={layoutId}
    >
      {/* Background Bloom Layer from reference */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "-24.3px",
          top: "117px",
          width: "469.8px",
          height: "469.8px",
          background: `radial-gradient(circle, ${bloomColor} 0%, ${bloomColor} 18%, transparent 65%)`,
          opacity: bloomOpacity,
          filter: "blur(8px)",
        }}
      />

      {/* Exact SVG Wrapper from reference */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: "38px",
          left: "38px",
          transform: "scale(0.66)",
          transformOrigin: "left top",
          perspective: "520px",
        }}
      >
        <SvgComponent />
      </div>

      {animateDots && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            top: "38px",
            left: "38px",
            width: 127,
            height: 170,
            transform: "scale(0.66)",
            transformOrigin: "left top",
          }}
        >
          {pressDots.map((dot, index) => (
            <span
              key={`${dot.x}-${dot.y}`}
              ref={(node) => {
                if (node) dotRefs.current[index] = node;
              }}
              className="absolute rounded-full"
              style={{
                left: dot.x - 10.9,
                top: dot.y - 10.9,
                width: 21.8,
                height: 21.8,
                background: dot.ring ? "transparent" : resolvedDotColor,
                border: dot.ring ? `1.4px solid ${resolvedRingColor}` : "0",
                boxShadow: dot.ring
                  ? `0 0 14px ${resolvedRingColor}`
                  : `0 0 18px ${resolvedDotColor}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Sweeping Sheen Hover Effect from reference */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-10"
        style={{ borderRadius: "44.875px" }}
      >
        <div
          className="absolute opacity-0 group-hover:opacity-100 group-hover:translate-x-[50%] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[800ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          style={{
            left: 0,
            top: "-50%",
            height: "200%",
            width: "162%",
            background:
              "linear-gradient(90deg, transparent 0%, color-mix(in srgb, rgb(255, 255, 255) 8%, transparent) 20%, color-mix(in srgb, rgb(255, 255, 255) 35%, transparent) 38%, color-mix(in srgb, rgb(255, 255, 255) 85%, transparent) 50%, color-mix(in srgb, rgb(255, 255, 255) 35%, transparent) 62%, color-mix(in srgb, rgb(255, 255, 255) 8%, transparent) 80%, transparent 100%)",
            filter: "blur(60px)",
            mixBlendMode: "screen",
            transform: "translateX(-200%) skewX(-38deg)",
          }}
        />
      </div>

      {/* Content Layer */}
      {children}
    </div>
  );
};
