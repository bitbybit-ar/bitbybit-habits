"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, UserIcon, PencilIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WeeklyTracker } from "@/components/dashboard/weekly-tracker";
import { EditHabitModal } from "@/components/dashboard/edit-habit-modal";
import type { Habit } from "@/lib/types";
import type { FamilyWithMembers } from "@/lib/hooks/useFamilies";
import type { FamilyCompletion } from "@/lib/hooks/useFamilyData";
import styles from "../../../app/[locale]/(dashboard)/sponsor/sponsor.module.scss";

interface KidMember {
  user_id: string;
  display_name: string;
}

interface SponsorHabitsTabProps {
  habits: Habit[];
  families: FamilyWithMembers[];
  familyCompletions: FamilyCompletion[];
  onApprove: (completionId: string) => Promise<void>;
  onCreateHabit: () => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  currentUserId?: string;
  kids?: KidMember[];
}

export function SponsorHabitsTab({ habits, families, familyCompletions, onApprove, onCreateHabit, onEdit, onDelete, currentUserId, kids }: SponsorHabitsTabProps) {
  const t = useTranslations();
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const byHabitGroups = useMemo(() => {
    const groups: Record<string, { habitId: string; habitName: string; satReward: number; kids: Record<string, { userId: string; displayName: string }> }> = {};

    for (const habit of habits) {
      groups[habit.id] = { habitId: habit.id, habitName: habit.name, satReward: habit.sat_reward, kids: {} };
    }

    for (const c of familyCompletions) {
      if (!groups[c.habit_id]) {
        groups[c.habit_id] = { habitId: c.habit_id, habitName: c.habit_name, satReward: c.sat_reward, kids: {} };
      }
      groups[c.habit_id].kids[c.kid_user_id] = { userId: c.kid_user_id, displayName: c.kid_display_name };
    }

    // MVP: Single-family mode — show all assigned kids (from assigned_to + habitAssignments)
    const members = families[0]?.members ?? [];
    for (const habit of habits) {
      if (groups[habit.id]) {
        const assignedIds = habit.assigned_members ?? [habit.assigned_to];
        for (const userId of assignedIds) {
          const kid = members.find((m) => m.user_id === userId);
          if (kid && kid.role === "kid") {
            groups[habit.id].kids[kid.user_id] = { userId: kid.user_id, displayName: kid.display_name || kid.username };
          }
        }
      }
    }

    return Object.values(groups);
  }, [habits, familyCompletions, families]);

  return (
    <DashboardSection title={t("sponsorDashboard.byHabit")}>
      {byHabitGroups.length === 0 ? (
        <EmptyState
          icon={<BoltIcon size={48} />}
          title={t("emptyState.noHabitsTitle")}
          description={t("emptyState.sponsorNoHabitsDesc")}
          action={
            <button className={styles.emptyCtaButton} onClick={onCreateHabit}>
              {t("emptyState.createFirstHabit")}
            </button>
          }
        />
      ) : (
        <div className={styles.habitGrid}>
          {byHabitGroups.map((group) => {
            const kidList = Object.values(group.kids);
            const habit = habits.find((h) => h.id === group.habitId);
            return (
              <div key={group.habitId} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.colorDot} style={{ backgroundColor: habit?.color ?? "var(--color-primary)" }} />
                  <div className={styles.groupInfo}>
                    <span className={styles.groupName}>{group.habitName}</span>
                    {habit?.description && <span className={styles.groupDescription}>{habit.description}</span>}
                  </div>
                  <div className={styles.satBadge}>
                    <BoltIcon size={12} />
                    {group.satReward} {t("sats.sats")}
                  </div>
                  {currentUserId && habit?.created_by === currentUserId && onEdit && onDelete && (
                    <div className={styles.habitActions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => { if (habit) setEditingHabit(habit); }}
                        title={t("common.edit")}
                      >
                        <PencilIcon size={14} />
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => {
                          if (confirm(t("habits.confirmDelete"))) onDelete(group.habitId);
                        }}
                        title={t("common.delete")}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {kidList.length === 0 ? (
                  <p className={styles.noKidsText}>{t("sponsorDashboard.noKidsAssigned")}</p>
                ) : (
                  <div className={styles.kidRows}>
                    {kidList.map((kid) => (
                      <div key={kid.userId} className={styles.kidRow}>
                        <div className={styles.kidAvatar}>{kid.displayName.charAt(0).toUpperCase()}</div>
                        <span className={styles.kidName}>{kid.displayName}</span>
                        <div className={styles.trackerWrapper}>
                          <WeeklyTracker
                            habitId={group.habitId}
                            completions={familyCompletions
                              .filter((c) => c.kid_user_id === kid.userId)
                              .map((c) => ({ id: c.id, habit_id: c.habit_id, date: c.date, status: c.status }))}
                            scheduleType={habit?.schedule_type}
                            scheduleDays={habit?.schedule_days}
                            onApprove={onApprove}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          kids={kids}
          onSave={(updated) => {
            setEditingHabit(null);
            if (onEdit) onEdit(updated);
          }}
          onClose={() => setEditingHabit(null)}
        />
      )}
    </DashboardSection>
  );
}

// ── By Kid Tab ────────────────────────────────────────────

interface SponsorByKidTabProps {
  habits: Habit[];
  families: FamilyWithMembers[];
  familyCompletions: FamilyCompletion[];
  onApprove: (completionId: string) => Promise<void>;
}

export function SponsorByKidTab({ habits, families, familyCompletions, onApprove }: SponsorByKidTabProps) {
  const t = useTranslations();

  const byKidGroups = useMemo(() => {
    const groups: Record<string, { userId: string; displayName: string; avatarUrl: string | null; habits: Record<string, { habitId: string; habitName: string; satReward: number }> }> = {};

    // MVP: Single-family mode
    const family = families[0];
    if (family) {
      for (const member of family.members) {
        if (member.role === "kid" && !groups[member.user_id]) {
          groups[member.user_id] = { userId: member.user_id, displayName: member.display_name || member.username, avatarUrl: member.avatar_url, habits: {} };
        }
      }
    }
    // ROADMAP: Multi-family support (commented for MVP single-family mode)
    // for (const family of families) {
    //   for (const member of family.members) {
    //     if (member.role === "kid" && !groups[member.user_id]) {
    //       groups[member.user_id] = { userId: member.user_id, displayName: member.display_name || member.username, avatarUrl: member.avatar_url, habits: {} };
    //     }
    //   }
    // }

    for (const c of familyCompletions) {
      if (!groups[c.kid_user_id]) {
        groups[c.kid_user_id] = { userId: c.kid_user_id, displayName: c.kid_display_name, avatarUrl: null, habits: {} };
      }
      groups[c.kid_user_id].habits[c.habit_id] = { habitId: c.habit_id, habitName: c.habit_name, satReward: c.sat_reward };
    }

    for (const habit of habits) {
      const assignedIds = habit.assigned_members ?? [habit.assigned_to];
      for (const userId of assignedIds) {
        if (groups[userId]) {
          groups[userId].habits[habit.id] = { habitId: habit.id, habitName: habit.name, satReward: habit.sat_reward };
        }
      }
    }

    return Object.values(groups);
  }, [families, familyCompletions, habits]);

  return (
    <DashboardSection title={t("sponsorDashboard.byKid")}>
      {byKidGroups.length === 0 ? (
        <EmptyState
          icon={<UserIcon size={48} />}
          title={t("sponsorDashboard.noKids")}
          description={t("sponsorDashboard.noKidsDesc")}
        />
      ) : (
        <div className={styles.habitGrid}>
          {byKidGroups.map((kid) => {
            const kidHabits = Object.values(kid.habits);
            return (
              <div key={kid.userId} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.kidAvatarLg}>{kid.displayName.charAt(0).toUpperCase()}</div>
                  <div className={styles.groupInfo}>
                    <span className={styles.groupName}>{kid.displayName}</span>
                    <span className={styles.groupDescription}>
                      {kidHabits.length} {t("sponsorDashboard.habitsAssigned")}
                    </span>
                  </div>
                </div>
                {kidHabits.length === 0 ? (
                  <p className={styles.noKidsText}>{t("sponsorDashboard.noHabitsForKid")}</p>
                ) : (
                  <div className={styles.kidRows}>
                    {kidHabits.map((h) => {
                      const habit = habits.find((hab) => hab.id === h.habitId);
                      return (
                        <div key={h.habitId} className={styles.kidRow}>
                          <div className={styles.colorDot} style={{ backgroundColor: habit?.color ?? "var(--color-primary)" }} />
                          <div className={styles.habitRowInfo}>
                            <span className={styles.kidName}>{h.habitName}</span>
                            <span className={styles.habitRowSats}><BoltIcon size={10} /> {h.satReward}</span>
                          </div>
                          <div className={styles.trackerWrapper}>
                            <WeeklyTracker
                              habitId={h.habitId}
                              completions={familyCompletions
                                .filter((c) => c.kid_user_id === kid.userId)
                                .map((c) => ({ id: c.id, habit_id: c.habit_id, date: c.date, status: c.status }))}
                              scheduleType={habit?.schedule_type}
                              scheduleDays={habit?.schedule_days}
                              onApprove={onApprove}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
}
