import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useMotionPreference } from "../hooks/useMotionPreference";

export function SiriLiquidGlass({
  isActive = false,
  isHovered = false,
  isValid = true,
  animated = true,
}: {
  isActive?: boolean;
  isHovered?: boolean;
  isValid?: boolean;
  animated?: boolean;
}) {
  const motionEnabled = useMotionPreference();
  const shouldAnimate = animated && motionEnabled;
  const rotorRef = useRef<HTMLDivElement | null>(null);
  const blueOrbRef = useRef<HTMLDivElement | null>(null);
  const purpleOrbRef = useRef<HTMLDivElement | null>(null);
  const pinkOrbRef = useRef<HTMLDivElement | null>(null);
  const cyanOrbRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rotor = rotorRef.current;
    const orbs = [
      blueOrbRef.current,
      purpleOrbRef.current,
      pinkOrbRef.current,
      cyanOrbRef.current,
    ].filter(Boolean) as HTMLDivElement[];

    if (rotor) gsap.killTweensOf(rotor);
    gsap.killTweensOf(orbs);

    if (!shouldAnimate) {
      if (rotor) gsap.set(rotor, { rotate: 0 });
      gsap.set(orbs, { scale: 1, x: 0, y: 0 });
      return;
    }

    if (rotor) {
      gsap.to(rotor, {
        rotate: 360,
        duration: isActive ? 3 : 10,
        repeat: -1,
        ease: "none",
      });
    }

    const orbTargets = [
      {
        node: blueOrbRef.current,
        scale: isHovered ? 1.3 : 1.2,
        x: isActive ? 10 : 0,
        y: isActive ? 10 : 0,
        duration: isHovered ? 0.8 : 2,
      },
      {
        node: purpleOrbRef.current,
        scale: isHovered ? 1.2 : 1.2,
        x: isActive ? -10 : 0,
        y: 0,
        duration: isHovered ? 0.8 : 2.5,
      },
      {
        node: pinkOrbRef.current,
        scale: isHovered ? 1.4 : 1.25,
        x: 0,
        y: isActive ? -15 : 0,
        duration: isHovered ? 0.8 : 3,
      },
      {
        node: cyanOrbRef.current,
        scale: isHovered ? 1.2 : 1.15,
        x: 0,
        y: 0,
        duration: isHovered ? 0.8 : 2.2,
      },
    ];

    orbTargets.forEach(({ node, scale, x, y, duration }) => {
      if (!node) return;
      gsap.to(node, {
        scale,
        x,
        y,
        duration,
        repeat: isHovered ? 0 : -1,
        yoyo: !isHovered,
        ease: "sine.inOut",
      });
    });

    return () => {
      if (rotor) gsap.killTweensOf(rotor);
      gsap.killTweensOf(orbs);
    };
  }, [isActive, isHovered, shouldAnimate]);

  return (
    <div className="absolute inset-0 overflow-hidden mix-blend-screen blur-[4px]">
      {/* Apple iOS Siri Orbs for Liquid Glass Effect */}
      <div
        ref={rotorRef}
        className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
      >
        {/* Blue Orb */}
        <div
          ref={blueOrbRef}
          className="absolute top-[10%] right-[30%] w-[40%] h-[40%] bg-[#0a84ff] rounded-full mix-blend-screen"
        />
        {/* Purple Orb */}
        <div
          ref={purpleOrbRef}
          className="absolute bottom-[30%] right-[10%] w-[45%] h-[45%] bg-[#bf5af2] rounded-full mix-blend-screen"
        />
        {/* Orange/Pink Orb */}
        <div
          ref={pinkOrbRef}
          className="absolute bottom-[10%] left-[30%] w-[50%] h-[50%] bg-[#ff375f] rounded-full mix-blend-screen"
        />
        {/* Cyan/Teal core for high contrast */}
        <div
          ref={cyanOrbRef}
          className="absolute top-[30%] left-[10%] w-[40%] h-[40%] bg-[#64d2ff] rounded-full mix-blend-screen"
        />
      </div>
    </div>
  );
}
