"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, FlameIcon, BoltIcon, ClockIcon, PencilIcon } from "@/components/icons";
import { EditHabitModal } from "@/components/dashboard/edit-habit-modal";
import { cn } from "@/lib/utils";
import type { Habit, Completion } from "@/lib/types";
import styles from "./habit-card.module.scss";

interface HabitCardProps {
  habit: Habit;
  completions: Completion[];
  onComplete: (habitId: string) => void;
  hideAction?: boolean;
  currentUserId?: string;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
}

function getScheduleText(habit: Habit, t: ReturnType<typeof useTranslations>): string {
  if (habit.schedule_type === "daily") {
    return t("habits.daily");
  }
  if (habit.schedule_type === "specific_days" && habit.schedule_days) {
    const dayNames = [
      t("kidDashboard.daySun"),
      t("kidDashboard.dayMon"),
      t("kidDashboard.dayTue"),
      t("kidDashboard.dayWed"),
      t("kidDashboard.dayThu"),
      t("kidDashboard.dayFri"),
      t("kidDashboard.daySat"),
    ];
    return habit.schedule_days.map((d) => dayNames[d]).join("/");
  }
  if (habit.schedule_type === "times_per_week" && habit.schedule_times_per_week) {
    return `${habit.schedule_times_per_week}x/${t("kidDashboard.week")}`;
  }
  return t("habits.daily");
}

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

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function calculateCurrentStreak(habitId: string, completions: Completion[]): number {
  const approved = completions
    .filter((c) => c.habit_id === habitId && (c.status === "approved" || c.status === "pending"))
    .map((c) => c.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (approved.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(today);

  for (let i = 0; i < 90; i++) {
    const dateStr = formatDateStr(checkDate);
    if (approved.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

type TodayStatus = "incomplete" | "pending" | "completed";

function getTodayStatus(habitId: string, completions: Completion[]): TodayStatus {
  const todayStr = formatDateStr(new Date());
  const todayCompletion = completions.find(
    (c) => c.habit_id === habitId && c.date === todayStr,
  );

  if (!todayCompletion) return "incomplete";
  if (todayCompletion.status === "pending") return "pending";
  if (todayCompletion.status === "approved") return "completed";
  return "incomplete";
}

export function HabitCard({ habit, completions, onComplete, hideAction, currentUserId, onEdit, onDelete }: HabitCardProps) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const isCreator = currentUserId === habit.created_by;
  const last7Days = getLast7Days();
  const scheduleText = getScheduleText(habit, t);
  const currentStreak = calculateCurrentStreak(habit.id, completions);
  const todayStatus = getTodayStatus(habit.id, completions);

  const habitCompletionDates = completions
    .filter((c) => c.habit_id === habit.id && (c.status === "approved" || c.status === "pending"))
    .map((c) => c.date);

  return (
    <div className={styles.card}>
      {/* Header: name, description, sat badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.colorDot} style={{ backgroundColor: habit.color }} />
          <div className={styles.habitInfo}>
            <p className={styles.habitName}>{habit.name}</p>
            {habit.description && (
              <p className={styles.habitDescription}>{habit.description}</p>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.satBadge}>
            <BoltIcon size={12} />
            {habit.sat_reward} {t("sats.sats")}
          </div>
          {isCreator && onEdit && onDelete && (
            <div className={styles.habitActions}>
              <button
                className={styles.editBtn}
                onClick={() => setEditing(true)}
                title={t("common.edit")}
              >
                <PencilIcon size={14} />
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => {
                  if (confirm(t("habits.confirmDelete"))) onDelete(habit.id);
                }}
                title={t("common.delete")}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule and streak */}
      <div className={styles.meta}>
        <span className={styles.schedule}>{scheduleText}</span>
        <div className={cn(styles.streak, currentStreak > 0 ? styles.streakActive : styles.streakInactive)}>
          <FlameIcon size={14} />
          <span className={styles.streakCount}>{currentStreak}</span>
        </div>
      </div>

      {/* Last 7 days circles */}
      <div className={styles.dateCircles}>
        {last7Days.map((date) => {
          const dateStr = formatDateStr(date);
          const completed = habitCompletionDates.includes(dateStr);
          const today = isToday(date);
          const future = isFuture(date);

          const dayLabel = date.toLocaleDateString(undefined, { weekday: "narrow" });

          let circleClass = styles.circleMissed;
          if (completed) circleClass = styles.circleCompleted;
          else if (future) circleClass = styles.circleFuture;
          else if (today) circleClass = styles.circleToday;

          return (
            <div key={dateStr} className={styles.dateCircle}>
              <span className={cn(styles.dayLabel, today && styles.dayLabelToday)}>
                {dayLabel}
              </span>
              <div className={cn(styles.circle, circleClass)}>
                {completed && <CheckIcon size={14} color="white" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button */}
      {!hideAction && (
        <div className={styles.action}>
          {todayStatus === "incomplete" && (
            <button
              className={styles.completeButton}
              onClick={() => onComplete(habit.id)}
            >
              <CheckIcon size={16} />
              {t("habits.markComplete")}
            </button>
          )}
          {todayStatus === "pending" && (
            <div className={cn(styles.statusBadge, styles.statusPending)}>
              <ClockIcon size={16} />
              {t("dashboard.pendingApproval")}
            </div>
          )}
          {todayStatus === "completed" && (
            <div className={cn(styles.statusBadge, styles.statusCompleted)}>
              <CheckIcon size={16} />
              {t("dashboard.completed")}
            </div>
          )}
        </div>
      )}
      {editing && (
        <EditHabitModal
          habit={habit}
          onSave={(updated) => {
            setEditing(false);
            if (onEdit) onEdit(updated);
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default HabitCard;
