import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface AnimatedScrollTextProps {
  text: string;
  className?: string;
}

export function AnimatedScrollText({ text, className = "" }: AnimatedScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // We track the scroll progress of the container relative to the viewport.
  // "start 80%" means animation starts when the top of container hits 80% of viewport height
  // "end 40%" means animation ends when the bottom of container hits 40% of viewport height
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 40%"]
  });

  const words = text.split(" ");

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, i) => {
        // Calculate the threshold for this specific word based on its index
        const start = i / words.length;
        const end = start + (1 / words.length);
        
        // Map the scroll progress to this word's opacity and blur
        // Wait, hook rules: we cannot call useTransform conditionally or in a loop like this IF the array size changes. 
        // But since `text` is static, `words.length` is static. It's technically safe in React if `text` never changes, 
        // but it's better to create a separate Word component to strictly follow hook rules.
        return (
          <Word 
            key={i} 
            word={word} 
            progress={scrollYProgress} 
            start={start} 
            end={end} 
          />
        );
      })}
    </div>
  );
}

function Word({ word, progress, start, end }: { word: string, progress: any, start: number, end: number }) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const filter = useTransform(progress, [start, end], ["blur(12px)", "blur(0px)"]);
  const y = useTransform(progress, [start, end], [10, 0]);

  return (
    <motion.span 
      style={{ opacity, filter, y }} 
      className="mr-[0.25em] inline-block last:mr-0"
    >
      {word}
    </motion.span>
  );
}
