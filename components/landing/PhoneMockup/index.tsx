"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, StarIcon, SatCoinIcon } from "@/components/icons";
import HabitCard from "@/components/dashboard/habit-card";
import type { Habit, Completion } from "@/lib/types";
import styles from "./phone-mockup.module.scss";

const MOCK_HABITS: Habit[] = [
  {
    id: "h1",
    family_id: "f1",
    name: "Tender la cama",
    sat_reward: 50,
    schedule_type: "daily",
    verification_type: "sponsor_approval",
    color: "#4CAF7D",
    created_by: "sponsor1",
    assigned_to: "kid1",
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "h2",
    family_id: "f1",
    name: "Leer 20 minutos",
    sat_reward: 100,
    schedule_type: "daily",
    verification_type: "sponsor_approval",
    color: "#F7A825",
    created_by: "sponsor1",
    assigned_to: "kid1",
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "h3",
    family_id: "f1",
    name: "Pasear al perro",
    sat_reward: 75,
    schedule_type: "daily",
    verification_type: "sponsor_approval",
    color: "#4DB6AC",
    created_by: "sponsor1",
    assigned_to: "kid1",
    active: true,
    created_at: "",
    updated_at: "",
  },
];

const STREAK_MAP: Record<string, number> = { h1: 5, h2: 3, h3: 4 };
// Pre-compute completion counts so totalSats is stable
const COMPLETION_COUNTS: Record<string, number> = { h1: 5, h2: 3, h3: 4 };
const TOTAL_SATS = MOCK_HABITS.reduce(
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
  const t = useTranslations();
  // Build completions only on the client to avoid server/client Date mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const completions = useMemo(() => (mounted ? buildMockCompletions() : []), [mounted]);

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
                  {MOCK_HABITS.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      completions={completions}
                      onComplete={() => {}}
                      hideAction
                      streak={STREAK_MAP[habit.id]}
                      compact
                    />
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
                  +{TOTAL_SATS.toLocaleString()} {t("sats.sats")}
                </div>
              </div>
            </div>
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
