import { useReducedMotion } from "motion/react";
import { useStore } from "../store";

export function useMotionPreference() {
  const animationsEnabled = useStore((state) => state.animationsEnabled);
  const prefersReducedMotion = useReducedMotion();
  return animationsEnabled && !prefersReducedMotion;
}
