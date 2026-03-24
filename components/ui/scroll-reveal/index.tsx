"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "stagger" | "scale";
  threshold?: number;
}

export function ScrollReveal({
  children,
  className,
  variant = "default",
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useScrollReveal<HTMLDivElement>({ threshold });

  const variantClass = {
    default: "scroll-reveal",
    stagger: "scroll-reveal-stagger",
    scale: "scroll-reveal-scale",
  }[variant];

  return (
    <div ref={ref} className={cn(variantClass, className)}>
      {children}
    </div>
  );
}

export default ScrollReveal;
