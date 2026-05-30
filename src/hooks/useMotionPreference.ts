import { useEffect, useState } from "react";
import { useStore } from "../store";

export function useMotionPreference() {
  const animationsEnabled = useStore((state) => state.animationsEnabled);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return animationsEnabled && !prefersReducedMotion;
}
