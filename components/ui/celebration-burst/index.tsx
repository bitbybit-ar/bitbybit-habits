"use client";

import React, { useEffect, useRef, useCallback } from "react";
import styles from "./celebration-burst.module.scss";

interface CelebrationBurstProps {
  satReward: number;
  onComplete?: () => void;
  color?: string;
}

export function CelebrationBurst({ satReward, onComplete, color = "#F7A825" }: CelebrationBurstProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createParticles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    const PARTICLE_COUNT = 20;
    const PARTICLE_COLORS = [
      color,
      "#F7A825",
      "#FBC96B",
      "#FFD700",
      "#4CAF7D",
      "#FFFFFF",
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      particle.className = styles.particle;

      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
      const velocity = 60 + Math.random() * 100;
      const size = 4 + Math.random() * 6;
      const duration = 0.6 + Math.random() * 0.5;
      const particleColor = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = particleColor;
      particle.style.setProperty("--dx", `${dx}px`);
      particle.style.setProperty("--dy", `${dy}px`);
      particle.style.animationDuration = `${duration}s`;

      if (Math.random() > 0.5) {
        particle.style.borderRadius = "50%";
      } else {
        particle.style.borderRadius = "2px";
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
      }

      container.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove());
    }
  }, [color, onComplete]);

  useEffect(() => {
    createParticles();

    const timer = setTimeout(() => {
      onComplete?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [createParticles, onComplete]);

  return (
    <div ref={containerRef} className={styles.burstContainer}>
      <div className={styles.satCoin}>
        <span className={styles.satIcon}>⚡</span>
        <span className={styles.satAmount}>+{satReward}</span>
      </div>
    </div>
  );
}

export default CelebrationBurst;
