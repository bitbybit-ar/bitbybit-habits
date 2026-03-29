"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, FlameIcon, BoltIcon, ClockIcon, PencilIcon } from "@/components/icons";
import { EditHabitModal } from "@/components/dashboard/edit-habit-modal";
import CelebrationBurst from "@/components/ui/celebration-burst";
import { cn } from "@/lib/utils";
import type { Habit, Completion } from "@/lib/types";
import styles from "./habit-card.module.scss";

interface KidMember {
  user_id: string;
  display_name: string;
}

interface HabitCardProps {
  habit: Habit;
  completions: Completion[];
  onComplete: (habitId: string) => void;
  hideAction?: boolean;
  currentUserId?: string;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  streak?: number;
  kids?: KidMember[];
  compact?: boolean;
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

export function HabitCard({ habit, completions, onComplete, hideAction, currentUserId, onEdit, onDelete, streak, kids, compact }: HabitCardProps) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const isCreator = currentUserId === habit.created_by;
  const last7Days = getLast7Days();
  const scheduleText = getScheduleText(habit, t);
  const currentStreak = streak ?? calculateCurrentStreak(habit.id, completions);
  const todayStatus = getTodayStatus(habit.id, completions);

  const habitCompletionMap = new Map<string, "approved" | "pending">();
  completions
    .filter((c) => c.habit_id === habit.id && (c.status === "approved" || c.status === "pending"))
    .forEach((c) => habitCompletionMap.set(c.date, c.status as "approved" | "pending"));

  const handleComplete = (habitId: string) => {
    setJustCompleted(true);
    setShowBurst(true);
    onComplete(habitId);
    setTimeout(() => setJustCompleted(false), 1500);
    setTimeout(() => setShowBurst(false), 1600);
  };

  return (
    <div
      className={cn(styles.card, compact && styles.compact)}
      style={{
        "--habit-color": habit.color || "transparent",
        "--habit-tint": habit.color ? `${habit.color}0D` : "transparent",
      } as React.CSSProperties}
    >
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
          {currentStreak > 0 && (
            <div className={cn(styles.streakBadge, styles.streakActive)}>
              <FlameIcon size={14} />
              <span>{currentStreak}</span>
            </div>
          )}
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

      {/* Schedule */}
      <div className={styles.meta}>
        <span className={styles.schedule}>{scheduleText}</span>
      </div>

      {/* Last 7 days circles */}
      <div className={styles.dateCircles}>
        {last7Days.map((date) => {
          const dateStr = formatDateStr(date);
          const completionStatus = habitCompletionMap.get(dateStr);
          const completed = !!completionStatus;
          const isPending = completionStatus === "pending";
          const today = isToday(date);
          const future = isFuture(date);

          const dayLabel = date.toLocaleDateString(undefined, { weekday: "narrow" });

          let circleClass = styles.circleMissed;
          if (completed && isPending) circleClass = styles.circlePending;
          else if (completed) circleClass = styles.circleCompleted;
          else if (future) circleClass = styles.circleFuture;
          else if (today) circleClass = styles.circleToday;

          const canClickCircle = today && !completed && !hideAction && todayStatus === "incomplete";

          return (
            <div key={dateStr} className={styles.dateCircle}>
              <span className={cn(styles.dayLabel, today && styles.dayLabelToday)}>
                {dayLabel}
              </span>
              <div
                className={cn(styles.circle, circleClass, canClickCircle && styles.circleClickable)}
                onClick={canClickCircle ? () => handleComplete(habit.id) : undefined}
                role={canClickCircle ? "button" : undefined}
                tabIndex={canClickCircle ? 0 : undefined}
                onKeyDown={canClickCircle ? (e) => { if (e.key === "Enter" || e.key === " ") handleComplete(habit.id); } : undefined}
              >
                {completed && !isPending && <CheckIcon size={14} color="white" />}
                {completed && isPending && <ClockIcon size={14} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status feedback */}
      {!hideAction && (todayStatus !== "incomplete" || justCompleted) && (
        <div className={styles.action}>
          {justCompleted && (
            <div className={styles.completedFeedback}>
              +{t("dashboard.completed")}! ⚡
            </div>
          )}
          {!justCompleted && todayStatus === "pending" && (
            <div className={cn(styles.statusBadge, styles.statusPending)}>
              <ClockIcon size={16} />
              {t("dashboard.pendingApproval")}
            </div>
          )}
          {!justCompleted && todayStatus === "completed" && (
            <div className={cn(styles.statusBadge, styles.statusCompleted)}>
              <CheckIcon size={16} />
              {t("dashboard.completed")}
            </div>
          )}
        </div>
      )}
      {showBurst && !compact && (
        <CelebrationBurst
          satReward={habit.sat_reward}
          color={habit.color}
        />
      )}
      {editing && (
        <EditHabitModal
          habit={habit}
          kids={kids}
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
