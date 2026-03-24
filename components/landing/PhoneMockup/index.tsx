"use client";

import React from "react";
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
    name: "Leer 20 min",
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
];

function getMockCompletions(): Completion[] {
  const today = new Date();
  const completions: Completion[] = [];

  for (let i = 1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    completions.push({
      id: `c${i}a`,
      habit_id: "h1",
      user_id: "kid1",
      date: dateStr,
      status: "approved",
      completed_at: "",
      reviewed_by: "sponsor1",
      reviewed_at: "",
    });
  }

  for (let i = 1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    completions.push({
      id: `c${i}b`,
      habit_id: "h2",
      user_id: "kid1",
      date: dateStr,
      status: "approved",
      completed_at: "",
      reviewed_by: "sponsor1",
      reviewed_at: "",
    });
  }

  return completions;
}

const MOCK_COMPLETIONS = getMockCompletions();

export const PhoneMockup: React.FC = () => {
  const t = useTranslations();

  return (
    <div className={styles.phoneWrapper}>
      <div className={styles.phone}>
        <div className={styles.bezel}>
          <div className={styles.notch} />
          <div className={styles.screenContainer}>
            <div className={styles.screenContent}>
              {/* Habit cards */}
              <div className={styles.habitList}>
                {MOCK_HABITS.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    completions={MOCK_COMPLETIONS}
                    onComplete={() => {}}
                    hideAction
                    streak={habit.id === "h1" ? 5 : 3}
                    compact
                  />
                ))}
              </div>

              {/* Celebration */}
              <div className={styles.celebration}>
                <div className={styles.celebrationIcons}>
                  <StarIcon size={16} color="#F7A825" />
                  <BoltIcon size={24} color="#F7A825" />
                  <StarIcon size={16} color="#F7A825" />
                </div>
                <div className={styles.satsAmount}>+1,000 {t("sats.sats")}</div>
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
