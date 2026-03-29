"use client";

/**
 * BlockLoader — Animated glass-block stacking loader.
 * Blocks drop one at a time, stack up, then fade out and restart.
 * Each block uses a different theme color with a glassmorphism style.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { BoltIcon } from "@/components/icons";
import styles from "./block-loader.module.scss";

interface BlockLoaderProps {
  label?: string;
  maxBlocks?: number;
  visible?: boolean;
}

const COLOR_KEYS = ["gold", "teal", "purple", "coral", "green"] as const;

function shuffleColors(count: number, lastColor?: string): string[] {
  const available = COLOR_KEYS.filter((c) => c !== lastColor);
  const result: string[] = [];
  const pool = [...available];

  for (let i = 0; i < count; i++) {
    if (pool.length === 0) {
      pool.push(...COLOR_KEYS.filter((c) => c !== result[result.length - 1]));
    }
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

export function BlockLoader({ label, maxBlocks = 4, visible = true }: BlockLoaderProps) {
  const [blocks, setBlocks] = useState<string[]>([]);
  const [fading, setFading] = useState(false);
  const colorsRef = useRef<string[]>(shuffleColors(maxBlocks));
  const lastColorRef = useRef<string | undefined>(undefined);

  const resetCycle = useCallback(() => {
    setFading(false);
    const lastColor = colorsRef.current[colorsRef.current.length - 1];
    lastColorRef.current = lastColor;
    colorsRef.current = shuffleColors(maxBlocks, lastColor);
    setBlocks([]);
  }, [maxBlocks]);

  useEffect(() => {
    if (!visible) return;

    if (fading) {
      const timer = setTimeout(resetCycle, 400);
      return () => clearTimeout(timer);
    }

    if (blocks.length >= maxBlocks) {
      const timer = setTimeout(() => setFading(true), 700);
      return () => clearTimeout(timer);
    }

    const delay = blocks.length === 0 ? 100 : 350;
    const timer = setTimeout(() => {
      setBlocks((prev) => [...prev, colorsRef.current[prev.length]]);
    }, delay);

    return () => clearTimeout(timer);
  }, [blocks.length, maxBlocks, fading, visible, resetCycle]);

  if (!visible) return null;

  const displayLabel = label ?? "Loading";
  const currentColor = blocks.length > 0 ? blocks[blocks.length - 1] : "gold";

  return (
    <div className={styles.stage}>
      <div className={`${styles.tower} ${fading ? styles.towerFade : ""}`}>
        {blocks.map((color, i) => (
          <div
            key={`${color}-${i}`}
            className={`${styles.block} ${styles[color]}`}
            style={{ animationDelay: "0ms" }}
          >
            <div className={styles.glassHighlight} />
            <BoltIcon size={22} className={styles.icon} />
          </div>
        ))}
      </div>
      <div className={`${styles.glow} ${styles[`glow_${currentColor}`]}`} />
      <p className={styles.label}>
        {displayLabel}
        <span className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      </p>
    </div>
  );
}

export default BlockLoader;
