import React, { useRef, useEffect, useState } from "react";

interface AnimatedScrollTextProps {
  text: string;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  fullRevealDistance?: number;
  initialBlur?: number;
  initialOpacity?: number;
  onRevealComplete?: (isComplete: boolean) => void;
}

export function AnimatedScrollText({
  text = "",
  className = "",
  scrollContainerRef,
  fullRevealDistance = 600,
  initialBlur = 3,
  initialOpacity = 0.1,
  onRevealComplete,
}: AnimatedScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const words = text.split(" ");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const scroller = scrollContainerRef?.current;
    const container = containerRef.current;
    if (!scroller || !container) return;

    let startPosition = 0;
    let containerHeight = 0;
    let visible = false;

    const updateProgress = () => {
      if (!visible || !containerRef.current) return;
      const currentScroll = scroller.scrollTop;
      const elementTop = startPosition - currentScroll;
      const visibleHeight = scroller.clientHeight - elementTop;
      const revealDistance = Math.max(1, fullRevealDistance - containerHeight);

      const progress = (visibleHeight - containerHeight) / revealDistance;
      const clampedProgress = Math.max(0, Math.min(1, progress));
      setScrollProgress(clampedProgress);
      onRevealComplete?.(clampedProgress >= 1);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) return;

        const rect = entry.boundingClientRect;
        const scrollerRect = scroller.getBoundingClientRect();
        startPosition = scroller.scrollTop + (rect.top - scrollerRect.top);
        containerHeight = rect.height;
        updateProgress();
      },
      { threshold: [0], root: scroller },
    );

    observer.observe(container);
    scroller.addEventListener("scroll", updateProgress, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", updateProgress);
      observer.unobserve(container);
    };
  }, [scrollContainerRef, fullRevealDistance, onRevealComplete]);

  return (
    <div ref={containerRef} className={`flex flex-wrap ${className}`}>
      {words.map((word, index) => {
        const wordProgress =
          (scrollProgress - index / words.length) * words.length;
        const progress = Math.max(0, Math.min(1, wordProgress));
        const blurAmount = initialBlur * (1 - progress);
        const opacity = initialOpacity + (1 - initialOpacity) * progress;

        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              filter: `blur(${blurAmount}px)`,
              opacity: opacity,
              transition: "filter 0.2s ease-out, opacity 0.2s ease-out",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
