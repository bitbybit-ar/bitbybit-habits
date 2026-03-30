"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MemberPicker } from "@/components/dashboard/member-picker";
import { ModalLoader } from "@/components/ui/modal-loader";
import { FormInput, FormSelect, FormField, FormButton } from "@/components/ui/form";
import type { Habit } from "@/lib/types";
import styles from "./edit-habit-modal.module.scss";

interface KidMember {
  user_id: string;
  display_name: string;
}

interface EditHabitModalProps {
  habit: Habit;
  kids?: KidMember[];
  onSave: (updated: Habit) => void;
  onClose: () => void;
}

const COLORS = ["#F7A825", "#4CAF7D", "#FF6B6B", "#4DB6AC", "#FF9F43", "#EE5A5A", "#A5D6B7", "#FBC96B"];

const DAY_KEYS = [
  "kidDashboard.daySun", "kidDashboard.dayMon", "kidDashboard.dayTue",
  "kidDashboard.dayWed", "kidDashboard.dayThu", "kidDashboard.dayFri",
  "kidDashboard.daySat",
] as const;

export function EditHabitModal({ habit, kids, onSave, onClose }: EditHabitModalProps) {
  const t = useTranslations();
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? "");
  const [color, setColor] = useState(habit.color);
  const [satReward, setSatReward] = useState(habit.sat_reward);
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days" | "times_per_week">(habit.schedule_type);
  const [scheduleDays, setScheduleDays] = useState<number[]>(habit.schedule_days ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState(habit.schedule_times_per_week ?? 3);
  const [verificationType, setVerificationType] = useState<"sponsor_approval" | "self_verify">(
    habit.verification_type === "bot_verify" ? "sponsor_approval" : habit.verification_type as "sponsor_approval" | "self_verify"
  );
  const [assignedTo, setAssignedTo] = useState(habit.assigned_to);
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  const [initialAssignedMembers, setInitialAssignedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/habits/${habit.id}/assignments`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) {
            const members = data.data.map((a: { user_id: string }) => a.user_id);
            setAssignedMembers(members);
            setInitialAssignedMembers(members);
          } else {
            const fallback = habit.assigned_to ? [habit.assigned_to] : [];
            setAssignedMembers(fallback);
            setInitialAssignedMembers(fallback);
          }
        } else {
          const fallback = habit.assigned_to ? [habit.assigned_to] : [];
          setAssignedMembers(fallback);
          setInitialAssignedMembers(fallback);
        }
      } catch {
        const fallback = habit.assigned_to ? [habit.assigned_to] : [];
        setAssignedMembers(fallback);
        setInitialAssignedMembers(fallback);
      } finally {
        setLoadingAssignments(false);
      }
    }
    fetchAssignments();
  }, [habit.id, habit.assigned_to]);

  const hasChanges = useMemo(() => {
    const normalizedVerification = habit.verification_type === "bot_verify" ? "sponsor_approval" : habit.verification_type;
    return (
      name.trim() !== habit.name ||
      (description.trim() || null) !== (habit.description ?? null) ||
      color !== habit.color ||
      satReward !== habit.sat_reward ||
      scheduleType !== habit.schedule_type ||
      JSON.stringify(scheduleDays) !== JSON.stringify(habit.schedule_days ?? []) ||
      timesPerWeek !== (habit.schedule_times_per_week ?? 3) ||
      verificationType !== normalizedVerification ||
      JSON.stringify([...assignedMembers].sort()) !== JSON.stringify([...initialAssignedMembers].sort())
    );
  }, [name, description, color, satReward, scheduleType, scheduleDays, timesPerWeek, verificationType, assignedMembers, initialAssignedMembers, habit]);

  const handleDayToggle = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleMemberToggle = (userId: string) => {
    setAssignedMembers((prev) => {
      if (prev.includes(userId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
    setAssignedTo((prev) => {
      if (assignedMembers.includes(userId)) {
        const remaining = assignedMembers.filter((id) => id !== userId);
        return remaining.length > 0 ? remaining[0] : prev;
      }
      return assignedMembers.length === 0 ? userId : prev;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const primaryAssignee = assignedMembers.length > 0 ? assignedMembers[0] : assignedTo;
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          sat_reward: satReward,
          schedule_type: scheduleType,
          schedule_days: scheduleDays,
          schedule_times_per_week: timesPerWeek,
          verification_type: verificationType,
          assigned_to: primaryAssignee,
          assigned_members: assignedMembers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) onSave(data.data);
      }
    } catch {
      // Silently handle
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t("habits.editHabit")}</h3>

        <FormInput
          id="edit-habit-name"
          label={t("habits.habitName")}
          value={name}
          onChange={setName}
        />

        <FormInput
          id="edit-habit-desc"
          label={t("habits.description")}
          value={description}
          onChange={setDescription}
        />

        <FormInput
          id="edit-habit-reward"
          type="number"
          label={t("habits.satReward")}
          min={0}
          value={String(satReward)}
          onChange={(v) => setSatReward(Number(v))}
        />

        <FormField label={t("habits.color")}>
          <div className={styles.colorPicker}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.colorSwatch}
                data-selected={c === color}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </FormField>

        <FormSelect
          id="edit-habit-schedule"
          label={t("habits.schedule")}
          value={scheduleType}
          onChange={(v) => setScheduleType(v as "daily" | "specific_days" | "times_per_week")}
        >
          <option value="daily">{t("habits.daily")}</option>
          <option value="specific_days">{t("habits.specificDays")}</option>
          <option value="times_per_week">{t("habits.timesPerWeek")}</option>
        </FormSelect>

        {scheduleType === "specific_days" && (
          <FormField>
            <div className={styles.daysGrid}>
              {DAY_KEYS.map((key, index) => (
                <label key={key} className={styles.dayCheck}>
                  <input
                    type="checkbox"
                    checked={scheduleDays.includes(index)}
                    onChange={() => handleDayToggle(index)}
                    className={styles.checkbox}
                  />
                  <span className={styles.dayLabel}>{t(key)}</span>
                </label>
              ))}
            </div>
          </FormField>
        )}

        {scheduleType === "times_per_week" && (
          <FormInput
            id="edit-habit-times"
            type="number"
            label={t("habits.timesPerWeek")}
            min={1}
            max={7}
            value={String(timesPerWeek)}
            onChange={(v) => setTimesPerWeek(Math.max(1, Math.min(7, parseInt(v) || 1)))}
          />
        )}

        <FormSelect
          id="edit-habit-verify"
          label={t("habits.verification")}
          value={verificationType}
          onChange={(v) => setVerificationType(v as "sponsor_approval" | "self_verify")}
        >
          <option value="sponsor_approval">{t("habits.sponsorApproval")}</option>
          <option value="self_verify">{t("habits.selfVerify")}</option>
        </FormSelect>

        {kids && kids.length > 0 && (
          <FormField label={t("habits.assignTo")}>
            {loadingAssignments ? (
              <ModalLoader />
            ) : (
              <MemberPicker
                kids={kids}
                selectedIds={assignedMembers}
                onToggle={handleMemberToggle}
                multiple
              />
            )}
          </FormField>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <FormButton
            onClick={handleSave}
            loading={saving}
            loadingText={t("common.loading")}
            disabled={!name.trim() || !hasChanges}
          >
            {t("common.save")}
          </FormButton>
        </div>
      </div>
    </div>
  );
}

export default EditHabitModal;
