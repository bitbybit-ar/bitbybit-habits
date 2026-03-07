"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Habit } from "@/lib/types";
import styles from "./edit-habit-modal.module.scss";

interface EditHabitModalProps {
  habit: Habit;
  onSave: (updated: Habit) => void;
  onClose: () => void;
}

const COLORS = ["#F7A825", "#4CAF7D", "#FF6B6B", "#4DB6AC", "#FF9F43", "#EE5A5A", "#A5D6B7", "#FBC96B"];

export function EditHabitModal({ habit, onSave, onClose }: EditHabitModalProps) {
  const t = useTranslations();
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? "");
  const [color, setColor] = useState(habit.color);
  const [satReward, setSatReward] = useState(habit.sat_reward);
  const [saving, setSaving] = useState(false);

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
                className={styles.colorSwatch}
                data-selected={c === color}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

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
