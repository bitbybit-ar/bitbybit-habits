"use client";

import { useTranslations } from "next-intl";
import { HabitCard } from "@/components/dashboard/habit-card";
import type { Habit, Completion } from "@/lib/types";
import styles from "./habit-list.module.scss";

interface HabitListProps {
  habits: Habit[];
  completions: Completion[];
  onComplete: (habitId: string) => void;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function HabitList({ habits, completions, onComplete }: HabitListProps) {
  const t = useTranslations();

  if (habits.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>{t("kidDashboard.noHabits")}</p>
      </div>
    );
  }

  const todayStr = formatDateStr(new Date());

  const completedToday = habits.filter((habit) =>
    completions.some(
      (c) =>
        c.habit_id === habit.id &&
        c.date === todayStr &&
        (c.status === "approved" || c.status === "pending"),
    ),
  );

  const pendingToday = habits.filter(
    (habit) => !completedToday.find((h) => h.id === habit.id),
  );

  return (
    <div className={styles.list}>
      {pendingToday.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{t("dashboard.today")}</h3>
          {pendingToday.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completions={completions}
              onComplete={onComplete}
            />
          ))}
        </>
      )}

      {completedToday.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{t("dashboard.completed")}</h3>
          {completedToday.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completions={completions}
              onComplete={onComplete}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default HabitList;
