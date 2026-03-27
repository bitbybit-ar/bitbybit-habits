"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, StarIcon, SatCoinIcon } from "@/components/icons";
import HabitCard from "@/components/dashboard/habit-card";
import type { Habit, Completion } from "@/lib/types";
import styles from "./phone-mockup.module.scss";

interface CelebrationState {
  habit: Habit;
  key: number;
}

const MOCK_HABIT_BASES = [
  { id: "h1", nameKey: "habit1" as const, sat_reward: 50, color: "#4CAF7D" },
  { id: "h2", nameKey: "habit2" as const, sat_reward: 100, color: "#F7A825" },
  { id: "h3", nameKey: "habit3" as const, sat_reward: 75, color: "#4DB6AC" },
];

const STREAK_MAP: Record<string, number> = { h1: 5, h2: 3, h3: 4 };
const COMPLETION_COUNTS: Record<string, number> = { h1: 5, h2: 3, h3: 4 };
const TOTAL_SATS = MOCK_HABIT_BASES.reduce(
  (sum, h) => sum + (COMPLETION_COUNTS[h.id] ?? 0) * h.sat_reward,
  0,
);

function buildMockCompletions(): Completion[] {
  const today = new Date();
  const completions: Completion[] = [];

  for (const [habitId, count] of Object.entries(COMPLETION_COUNTS)) {
    for (let i = 1; i <= count; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      completions.push({
        id: `c-${habitId}-${i}`,
        habit_id: habitId,
        user_id: "kid1",
        date: d.toISOString().split("T")[0],
        status: "approved",
        completed_at: "",
        reviewed_by: "sponsor1",
        reviewed_at: "",
      });
    }
  }

  return completions;
}

export const PhoneMockup: React.FC = () => {
  const t = useTranslations("landing.phoneMockup");
  const tSats = useTranslations("sats");
  // Build completions only on the client to avoid server/client Date mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const completions = useMemo(() => (mounted ? buildMockCompletions() : []), [mounted]);

  const mockHabits: Habit[] = useMemo(() => MOCK_HABIT_BASES.map((base) => ({
    id: base.id,
    family_id: "f1",
    name: t(base.nameKey),
    sat_reward: base.sat_reward,
    schedule_type: "daily" as const,
    verification_type: "sponsor_approval" as const,
    color: base.color,
    created_by: "sponsor1",
    assigned_to: "kid1",
    active: true,
    created_at: "",
    updated_at: "",
  })), [t]);

  // Celebration overlay state
  const [celebrating, setCelebrating] = useState<CelebrationState | null>(null);
  const celebrationKeyRef = useRef(0);

  const handleHabitClick = useCallback((habitId: string) => {
    const habit = mockHabits.find((h) => h.id === habitId);
    if (!habit) return;
    celebrationKeyRef.current += 1;
    setCelebrating({ habit, key: celebrationKeyRef.current });
  }, [mockHabits]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(null), 2000);
    return () => clearTimeout(timer);
  }, [celebrating]);

  return (
    <div className={styles.phoneWrapper}>
      <div className={styles.phone}>
        <div className={styles.bezel}>
          <div className={styles.notch} />
          <div className={styles.screenContainer}>
            <div className={styles.screenContent}>
              {/* Habit cards — only render after mount to avoid Date hydration mismatch */}
              {mounted && (
                <div className={styles.habitList}>
                  {mockHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className={styles.clickableCard}
                      onClick={() => handleHabitClick(habit.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleHabitClick(habit.id);
                      }}
                    >
                      <HabitCard
                        habit={habit}
                        completions={completions}
                        onComplete={() => {}}
                        hideAction
                        streak={STREAK_MAP[habit.id]}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Celebration */}
              <div className={styles.celebration}>
                <div className={styles.celebrationIcons}>
                  <StarIcon size={16} color="#F7A825" />
                  <BoltIcon size={24} color="#F7A825" />
                  <StarIcon size={16} color="#F7A825" />
                </div>
                <div className={styles.satsAmount}>
                  +{TOTAL_SATS.toLocaleString()} {tSats("sats")}
                </div>
              </div>
            </div>

            {/* Celebration overlay */}
            {celebrating && (
              <div
                key={celebrating.key}
                className={styles.celebrationOverlay}
                style={{ "--celebration-color": celebrating.habit.color || "#F7A825" } as React.CSSProperties}
              >
                <div className={styles.celebrationBurst}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={styles.burstParticle}
                      style={{ "--angle": `${(360 / 10) * i}deg`, "--delay": `${i * 0.02}s` } as React.CSSProperties}
                    />
                  ))}
                </div>
                <div className={styles.celebrationContent}>
                  <div className={styles.celebrationIcon}>
                    <BoltIcon size={28} color={celebrating.habit.color || "#F7A825"} />
                  </div>
                  <span className={styles.celebrationHabitName}>{celebrating.habit.name}</span>
                  <span className={styles.celebrationSats}>+{celebrating.habit.sat_reward} {tSats("sats")}</span>
                </div>
              </div>
            )}
          </div>
          <div className={styles.homeIndicator} />
          <div className={styles.glassReflection} />
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className={styles.floatingCoin} aria-hidden="true">
        <SatCoinIcon size={40} color="#F7A825" />
      </div>
      <div className={styles.floatingBolt} aria-hidden="true">
        <BoltIcon size={32} color="#4DB6AC" />
      </div>
    </div>
  );
};

export default PhoneMockup;
