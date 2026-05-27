import { motion } from "motion/react";
import React from "react";

export function SiriLiquidGlass({
  isActive = false,
  isHovered = false,
  isValid = true,
}: {
  isActive?: boolean;
  isHovered?: boolean;
  isValid?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden mix-blend-screen blur-[4px]">
      {/* Apple iOS Siri Orbs for Liquid Glass Effect */}
      <motion.div
        className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
        animate={{ rotate: isActive ? 360 : [0, 360] }}
        transition={{
          duration: isActive ? 3 : 10,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Blue Orb */}
        <motion.div
          className="absolute top-[10%] right-[30%] w-[40%] h-[40%] bg-[#0a84ff] rounded-full mix-blend-screen"
          animate={{
            scale: isHovered ? 1.3 : [1, 1.2, 1],
            x: isActive ? [0, 10, 0] : 0,
            y: isActive ? [0, 10, 0] : 0,
          }}
          transition={{
            duration: isHovered ? 0.8 : 2,
            repeat: isHovered ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Purple Orb */}
        <motion.div
          className="absolute bottom-[30%] right-[10%] w-[45%] h-[45%] bg-[#bf5af2] rounded-full mix-blend-screen"
          animate={{
            scale: isHovered ? 1.2 : [1, 1.2, 1],
            x: isActive ? [0, -10, 0] : 0,
          }}
          transition={{
            duration: isHovered ? 0.8 : 2.5,
            repeat: isHovered ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Orange/Pink Orb */}
        <motion.div
          className="absolute bottom-[10%] left-[30%] w-[50%] h-[50%] bg-[#ff375f] rounded-full mix-blend-screen"
          animate={{
            scale: isHovered ? 1.4 : [1, 1.25, 1],
            y: isActive ? [0, -15, 0] : 0,
          }}
          transition={{
            duration: isHovered ? 0.8 : 3,
            repeat: isHovered ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Cyan/Teal core for high contrast */}
        <motion.div
          className="absolute top-[30%] left-[10%] w-[40%] h-[40%] bg-[#64d2ff] rounded-full mix-blend-screen"
          animate={{ scale: isHovered ? 1.2 : [1, 1.15, 1] }}
          transition={{
            duration: isHovered ? 0.8 : 2.2,
            repeat: isHovered ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
