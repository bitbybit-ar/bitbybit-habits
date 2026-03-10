"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MemberPicker } from "@/components/dashboard/member-picker";
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
  "kidDashboard.daySun",
  "kidDashboard.dayMon",
  "kidDashboard.dayTue",
  "kidDashboard.dayWed",
  "kidDashboard.dayThu",
  "kidDashboard.dayFri",
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
  const [saving, setSaving] = useState(false);

  const handleDayToggle = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
          assigned_to: assignedTo,
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

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.habitName")}</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.description")}</label>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.satReward")}</label>
          <input
            className={styles.input}
            type="number"
            min={0}
            value={satReward}
            onChange={(e) => setSatReward(Number(e.target.value))}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.color")}</label>
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
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.schedule")}</label>
          <select
            className={styles.select}
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value as "daily" | "specific_days" | "times_per_week")}
          >
            <option value="daily">{t("habits.daily")}</option>
            <option value="specific_days">{t("habits.specificDays")}</option>
            <option value="times_per_week">{t("habits.timesPerWeek")}</option>
          </select>
        </div>

        {scheduleType === "specific_days" && (
          <div className={styles.field}>
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
          </div>
        )}

        {scheduleType === "times_per_week" && (
          <div className={styles.field}>
            <label className={styles.label}>{t("habits.timesPerWeek")}</label>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>{t("habits.verification")}</label>
          <select
            className={styles.select}
            value={verificationType}
            onChange={(e) => setVerificationType(e.target.value as "sponsor_approval" | "self_verify")}
          >
            <option value="sponsor_approval">{t("habits.sponsorApproval")}</option>
            <option value="self_verify">{t("habits.selfVerify")}</option>
          </select>
        </div>

        {/* Assign to — visual member picker */}
        {kids && kids.length > 0 && (
          <div className={styles.field}>
            <label className={styles.label}>{t("habits.assignTo")}</label>
            <MemberPicker
              kids={kids}
              selectedId={assignedTo}
              onSelect={setAssignedTo}
            />
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditHabitModal;
