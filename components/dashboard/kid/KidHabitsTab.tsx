"use client";

import { useTranslations } from "next-intl";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HabitList } from "@/components/dashboard/habit-list";
import type { Habit, Completion } from "@/lib/types";

interface KidHabitsTabProps {
  habits: Habit[];
  completions: Completion[];
  onComplete: (habitId: string) => void;
}

export function KidHabitsTab({ habits, completions, onComplete }: KidHabitsTabProps) {
  const t = useTranslations();

  return (
    <DashboardSection title={t("dashboard.myHabits")}>
      {habits.length === 0 ? (
        <EmptyState
          icon={<>&#x26A1;</>}
          title={t("emptyState.noHabitsTitle")}
          description={t("emptyState.kidNoHabitsDesc")}
        />
      ) : (
        <HabitList habits={habits} completions={completions} onComplete={onComplete} />
      )}
    </DashboardSection>
  );
}
