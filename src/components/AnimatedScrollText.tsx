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
  const onRevealCompleteRef = useRef(onRevealComplete);
  const normalizedText = text.trim();
  const words = normalizedText ? normalizedText.split(/\s+/) : [];
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    onRevealCompleteRef.current = onRevealComplete;
  }, [onRevealComplete]);

  useEffect(() => {
    const scroller = scrollContainerRef?.current;
    const container = containerRef.current;
    if (!scroller || !container) return;

    let startPosition = 0;
    let containerHeight = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          const rect = entry.boundingClientRect;
          const scrollerRect = scroller.getBoundingClientRect();

          startPosition = scroller.scrollTop + (rect.top - scrollerRect.top);
          containerHeight = rect.height;
          handleScroll();
        } else {
          setIsVisible(false);
        }
      },
      { threshold: [0], root: scroller },
    );

    observer.observe(container);

    const handleScroll = () => {
      if (!isVisible || !containerRef.current) return;
      const currentScroll = scroller.scrollTop;
      const elementTop = startPosition - currentScroll;
      const visibleHeight = scroller.clientHeight - elementTop;

      const revealRange = Math.max(1, fullRevealDistance - containerHeight);
      const progress = (visibleHeight - containerHeight) / revealRange;
      const clampedProgress = Math.max(0, Math.min(1, progress));
      setScrollProgress(clampedProgress);

      onRevealCompleteRef.current?.(clampedProgress >= 1);
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      observer.unobserve(container);
    };
  }, [scrollContainerRef, fullRevealDistance, isVisible]);

  return (
    <div ref={containerRef} className={`flex flex-wrap ${className}`}>
      {words.map((word, index) => {
        const wordProgress =
          (scrollProgress - index / words.length) * words.length;
        const progress = Math.max(0, Math.min(1, wordProgress));
        const blurAmount = initialBlur * (1 - progress);
        const opacity = initialOpacity + (1 - initialOpacity) * progress;

        return (
          <React.Fragment key={index}>
            <span
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
            {index < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
