"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@/components/icons";
import { MemberPicker } from "@/components/dashboard/member-picker";
import { FormInput, FormSelect, FormTextarea, FormField, FormButton } from "@/components/ui/form";
import { useFormValidation } from "@/lib/hooks/useFormValidation";
import styles from "./create-habit-form.module.scss";

interface KidOption {
  user_id: string;
  display_name: string;
}

// ROADMAP: Multi-family support (commented for MVP single-family mode)
// interface FamilyOption {
//   id: string;
//   name: string;
// }

interface CreateHabitFormProps {
  familyId: string;
  kids: KidOption[];
  onSubmit: (data: CreateHabitData) => Promise<void>;
}

export interface CreateHabitData {
  name: string;
  description: string;
  color: string;
  sat_reward: number;
  schedule_type: "daily" | "specific_days" | "times_per_week";
  schedule_days: number[];
  schedule_times_per_week: number;
  verification_type: "sponsor_approval" | "self_verify";
  assigned_to: string[];
  family_id: string;
}

const PRESET_COLORS = [
  "#F7A825", "#4CAF7D", "#FF6B6B", "#4DB6AC",
  "#9B59B6", "#3498DB", "#E67E22", "#1ABC9C",
];

const DAY_KEYS = [
  "kidDashboard.daySun", "kidDashboard.dayMon", "kidDashboard.dayTue",
  "kidDashboard.dayWed", "kidDashboard.dayThu", "kidDashboard.dayFri",
  "kidDashboard.daySat",
] as const;

export function CreateHabitForm({ familyId, kids, onSubmit }: CreateHabitFormProps) {
  const t = useTranslations();
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days" | "times_per_week">("daily");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [verificationType, setVerificationType] = useState<"sponsor_approval" | "self_verify">("sponsor_approval");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleDaysError, setScheduleDaysError] = useState("");
  const [assignedToError, setAssignedToError] = useState("");

  const form = useFormValidation({
    initialValues: { name: "", description: "", satReward: "10" },
    validators: {
      name: (v) => !(v as string).trim() ? t("validation.required") : undefined,
      satReward: (v) => {
        const n = parseInt(v as string);
        if (isNaN(n) || n < 0) return t("validation.minZero");
        return undefined;
      },
    },
  });

  const handleDayToggle = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
    setScheduleDaysError("");
  };

  const handleKidToggle = useCallback((userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setAssignedToError("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs = form.validateAll();
    let hasExtra = false;

    if (assignedTo.length === 0) {
      setAssignedToError(t("validation.selectAtLeastOneKid"));
      hasExtra = true;
    }
    if (scheduleType === "specific_days" && scheduleDays.length === 0) {
      setScheduleDaysError(t("validation.selectAtLeastOneDay"));
      hasExtra = true;
    }

    if (Object.keys(errs).length > 0 || hasExtra) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: form.values.name.trim(),
        description: form.values.description.trim(),
        color,
        sat_reward: Math.max(0, parseInt(form.values.satReward) || 0),
        schedule_type: scheduleType,
        schedule_days: scheduleDays,
        schedule_times_per_week: timesPerWeek,
        verification_type: verificationType,
        assigned_to: assignedTo,
        family_id: familyId,
      });
      form.reset();
      setColor(PRESET_COLORS[0]);
      setScheduleType("daily");
      setScheduleDays([]);
      setTimesPerWeek(3);
      setVerificationType("sponsor_approval");
      setAssignedTo([]);
      setScheduleDaysError("");
      setAssignedToError("");
    } finally {
      setSubmitting(false);
    }
  };

  const nameField = form.fieldProps("name");
  const descField = form.fieldProps("description");
  const satField = form.fieldProps("satReward");

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormInput
        id="habit-name"
        label={t("habits.habitName")}
        required
        value={nameField.value as string}
        onChange={nameField.onChange}
        onBlur={nameField.onBlur}
        error={nameField.error}
      />

      <FormTextarea
        id="habit-desc"
        label={t("habits.description")}
        rows={2}
        value={descField.value as string}
        onChange={descField.onChange}
        onBlur={descField.onBlur}
      />

      <FormField label={t("habits.color")}>
        <div className={styles.colorPicker}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.colorCircle} ${color === c ? styles.colorSelected : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </FormField>

      <FormInput
        id="habit-reward"
        type="number"
        label={t("habits.satReward")}
        required
        min={0}
        value={satField.value as string}
        onChange={satField.onChange}
        onBlur={satField.onBlur}
        error={satField.error}
      />

      <FormSelect
        id="habit-schedule"
        label={t("habits.schedule")}
        value={scheduleType}
        onChange={(v) => setScheduleType(v as "daily" | "specific_days" | "times_per_week")}
      >
        <option value="daily">{t("habits.daily")}</option>
        <option value="specific_days">{t("habits.specificDays")}</option>
        <option value="times_per_week">{t("habits.timesPerWeek")}</option>
      </FormSelect>

      {scheduleType === "specific_days" && (
        <FormField error={scheduleDaysError}>
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
          id="habit-times"
          type="number"
          label={t("habits.timesPerWeek")}
          min={1}
          max={7}
          value={String(timesPerWeek)}
          onChange={(v) => setTimesPerWeek(Math.max(1, Math.min(7, parseInt(v) || 1)))}
        />
      )}

      <FormSelect
        id="habit-verify"
        label={t("habits.verification")}
        value={verificationType}
        onChange={(v) => setVerificationType(v as "sponsor_approval" | "self_verify")}
      >
        <option value="sponsor_approval">{t("habits.sponsorApproval")}</option>
        <option value="self_verify">{t("habits.selfVerify")}</option>
      </FormSelect>

      {/* ROADMAP: Multi-family support (commented for MVP single-family mode)
      <FormSelect
        id="habit-family"
        label={t("family.myFamily")}
        required
        value={famField.value as string}
        onChange={famField.onChange}
        onBlur={famField.onBlur}
        error={famField.error}
      >
        <option value="">{t("sponsorDashboard.selectFamily")}</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </FormSelect>
      */}

      <FormField label={t("habits.assignTo")} required error={assignedToError}>
        <MemberPicker
          kids={kids}
          selectedIds={assignedTo}
          onToggle={handleKidToggle}
          multiple
        />
      </FormField>

      <FormButton type="submit" loading={submitting}>
        <PlusIcon size={16} />
        {t("habits.createHabit")}
      </FormButton>
    </form>
  );
}

export default CreateHabitForm;
