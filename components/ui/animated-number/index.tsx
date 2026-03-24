"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCountUp } from "@/lib/use-count-up";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1200,
  delay = 0,
  className,
}: AnimatedNumberProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animatedValue = useCountUp({
    end: value,
    duration,
    delay,
    enabled: isVisible,
  });

  return (
    <span ref={ref} className={className}>
      {animatedValue.toLocaleString()}
    </span>
  );
}

export default AnimatedNumber;
