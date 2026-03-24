"use client";

import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  end: number;
  duration?: number;
  delay?: number;
  enabled?: boolean;
  easing?: "easeOut" | "easeInOut";
}

export function useCountUp({
  end,
  duration = 1200,
  delay = 0,
  enabled = true,
  easing = "easeOut",
}: UseCountUpOptions): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !enabled) {
      setValue(end);
      return;
    }

    const delayTimer = setTimeout(() => {
      const easingFn =
        easing === "easeOut"
          ? (t: number) => 1 - Math.pow(1 - t, 3)
          : (t: number) =>
              t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFn(progress);

        setValue(Math.round(easedProgress * end));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration, delay, enabled, easing]);

  return value;
}
