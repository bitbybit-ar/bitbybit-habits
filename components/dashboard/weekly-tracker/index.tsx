"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./weekly-tracker.module.scss";

interface CompletionEntry {
  id: string;
  habit_id: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

interface WeeklyTrackerProps {
  habitId: string;
  completions: CompletionEntry[];
  scheduleDays?: number[] | null;
  scheduleType?: string;
  onApprove?: (completionId: string) => void;
}

type CellStatus = "completed" | "missed" | "pending_today" | "pending_approval" | "not_assigned";

function getLast7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isDayAssigned(
  date: Date,
  scheduleType?: string,
  scheduleDays?: number[] | null,
): boolean {
  if (!scheduleType || scheduleType === "daily" || scheduleType === "times_per_week") {
    return true;
  }
  if (scheduleType === "specific_days" && scheduleDays) {
    return scheduleDays.includes(date.getDay());
  }
  return true;
}

export function WeeklyTracker({
  habitId,
  completions,
  scheduleDays,
  scheduleType,
  onApprove,
}: WeeklyTrackerProps) {
  const t = useTranslations();
  const days = getLast7Days();

  const dayAbbreviations = [
    t("weeklyTracker.sun"),
    t("weeklyTracker.mon"),
    t("weeklyTracker.tue"),
    t("weeklyTracker.wed"),
    t("weeklyTracker.thu"),
    t("weeklyTracker.fri"),
    t("weeklyTracker.sat"),
  ];

  const habitCompletions = completions.filter((c) => c.habit_id === habitId);

  function getCellData(date: Date): { status: CellStatus; completionId?: string } {
    const dateStr = formatDateStr(date);
    const completion = habitCompletions.find((c) => c.date === dateStr);
    const assigned = isDayAssigned(date, scheduleType, scheduleDays);

    if (!assigned) {
      return { status: "not_assigned" };
    }

    if (completion) {
      if (completion.status === "approved") {
        return { status: "completed", completionId: completion.id };
      }
      if (completion.status === "pending") {
        return { status: "pending_approval", completionId: completion.id };
      }
      // rejected — treat as missed
      return { status: "missed" };
    }

    if (isToday(date)) {
      return { status: "pending_today" };
    }

    // Past day, no completion
    return { status: "missed" };
  }

  return (
    <div className={styles.tracker}>
      {days.map((date) => {
        const { status, completionId } = getCellData(date);
        const dayAbbr = dayAbbreviations[date.getDay()];
        const today = isToday(date);

        return (
          <div key={formatDateStr(date)} className={styles.column}>
            <span className={cn(styles.dayLabel, today && styles.dayLabelToday)}>
              {dayAbbr}
            </span>
            <div
              className={cn(
                styles.cell,
                status === "completed" && styles.cellCompleted,
                status === "missed" && styles.cellMissed,
                status === "pending_today" && styles.cellPendingToday,
                status === "pending_approval" && styles.cellPendingApproval,
                status === "not_assigned" && styles.cellNotAssigned,
              )}
            >
              {status === "completed" && <CheckIcon size={14} color="white" />}
              {status === "missed" && <span className={styles.missedIcon}>✕</span>}
              {status === "pending_today" && <ClockIcon size={14} />}
              {status === "pending_approval" && <CheckIcon size={14} />}
              {status === "not_assigned" && <span className={styles.dot}>·</span>}
            </div>
            {status === "pending_approval" && onApprove && completionId && (
              <button
                type="button"
                className={styles.approveBtn}
                onClick={() => onApprove(completionId)}
                title={t("habits.approve")}
              >
                {t("weeklyTracker.approve")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WeeklyTracker;
