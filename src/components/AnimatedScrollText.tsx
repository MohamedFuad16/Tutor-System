import React, { useRef, useEffect, useState } from 'react';

interface AnimatedScrollTextProps {
  text: string;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  fullRevealDistance?: number;
  initialBlur?: number;
  initialOpacity?: number;
}

export function AnimatedScrollText({ 
  text = "", 
  className = "", 
  scrollContainerRef,
  fullRevealDistance = 600,
  initialBlur = 3,
  initialOpacity = 0.1
}: AnimatedScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const words = text.split(" ");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scroller = scrollContainerRef?.current;
    if (!scroller || !containerRef.current) return;

    let startPosition = 0;
    let containerHeight = 0;

    const observer = new IntersectionObserver(([entry]) => {
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
    }, { threshold: [0], root: scroller });

    observer.observe(containerRef.current);

    const handleScroll = () => {
      if (!isVisible || !containerRef.current) return;
      const currentScroll = scroller.scrollTop;
      const elementTop = startPosition - currentScroll;
      const visibleHeight = scroller.clientHeight - elementTop;
      
      const progress = (visibleHeight - containerHeight) / (fullRevealDistance - containerHeight);
      setScrollProgress(Math.max(0, Math.min(1, progress)));
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [scrollContainerRef, fullRevealDistance, isVisible]);

  return (
    <div ref={containerRef} className={`flex flex-wrap ${className}`}>
      {words.map((word, index) => {
        const wordProgress = (scrollProgress - index / words.length) * words.length;
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
              transition: "filter 0.2s ease-out, opacity 0.2s ease-out"
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
