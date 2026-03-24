"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@/components/icons";
import { MemberPicker } from "@/components/dashboard/member-picker";
import { cn } from "@/lib/utils";
import styles from "./create-habit-form.module.scss";

interface KidOption {
  user_id: string;
  display_name: string;
}

interface FamilyOption {
  id: string;
  name: string;
}

interface CreateHabitFormProps {
  families: FamilyOption[];
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

interface FormErrors {
  name?: string;
  familyId?: string;
  assignedTo?: string;
  satReward?: string;
  scheduleDays?: string;
}

const PRESET_COLORS = [
  "#F7A825",
  "#4CAF7D",
  "#FF6B6B",
  "#4DB6AC",
  "#9B59B6",
  "#3498DB",
  "#E67E22",
  "#1ABC9C",
];

const DAY_KEYS = [
  "kidDashboard.daySun",
  "kidDashboard.dayMon",
  "kidDashboard.dayTue",
  "kidDashboard.dayWed",
  "kidDashboard.dayThu",
  "kidDashboard.dayFri",
  "kidDashboard.daySat",
] as const;

export function CreateHabitForm({ families, kids, onSubmit }: CreateHabitFormProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [satReward, setSatReward] = useState(10);
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days" | "times_per_week">("daily");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [verificationType, setVerificationType] = useState<"sponsor_approval" | "self_verify">("sponsor_approval");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [familyId, setFamilyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);

  const handleDayToggle = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleKidToggle = (userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = t("validation.required");
    if (!familyId) errs.familyId = t("validation.required");
    if (assignedTo.length === 0) errs.assignedTo = t("validation.selectAtLeastOneKid");
    if (satReward < 0) errs.satReward = t("validation.minZero");
    if (scheduleType === "specific_days" && scheduleDays.length === 0) {
      errs.scheduleDays = t("validation.selectAtLeastOneDay");
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
        sat_reward: satReward,
        schedule_type: scheduleType,
        schedule_days: scheduleDays,
        schedule_times_per_week: timesPerWeek,
        verification_type: verificationType,
        assigned_to: assignedTo,
        family_id: familyId,
      });
      // Reset form on success
      setName("");
      setDescription("");
      setColor(PRESET_COLORS[0]);
      setSatReward(10);
      setScheduleType("daily");
      setScheduleDays([]);
      setTimesPerWeek(3);
      setVerificationType("sponsor_approval");
      setAssignedTo([]);
      setErrors({});
      setTouched(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Habit name */}
      <div className={cn(styles.field, touched && errors.name && styles.fieldError)}>
        <label className={styles.label}>
          {t("habits.habitName")}
          <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={cn(styles.input, touched && errors.name && styles.inputError)}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {touched && errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>{t("habits.description")}</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Color picker */}
      <div className={styles.field}>
        <label className={styles.label}>{t("habits.color")}</label>
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
      </div>

      {/* Sat reward */}
      <div className={cn(styles.field, touched && errors.satReward && styles.fieldError)}>
        <label className={styles.label}>
          {t("habits.satReward")}
          <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          className={cn(styles.input, touched && errors.satReward && styles.inputError)}
          value={satReward}
          onChange={(e) => setSatReward(Math.max(0, parseInt(e.target.value) || 0))}
          min={0}
        />
        {touched && errors.satReward && <span className={styles.errorText}>{errors.satReward}</span>}
      </div>

      {/* Schedule type */}
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

      {/* Specific days checkboxes */}
      {scheduleType === "specific_days" && (
        <div className={cn(styles.field, touched && errors.scheduleDays && styles.fieldError)}>
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
          {touched && errors.scheduleDays && <span className={styles.errorText}>{errors.scheduleDays}</span>}
        </div>
      )}

      {/* Times per week */}
      {scheduleType === "times_per_week" && (
        <div className={styles.field}>
          <label className={styles.label}>{t("habits.timesPerWeek")}</label>
          <input
            type="number"
            className={styles.input}
            value={timesPerWeek}
            onChange={(e) => setTimesPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
            min={1}
            max={7}
          />
        </div>
      )}

      {/* Verification type */}
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

      {/* Family */}
      <div className={cn(styles.field, touched && errors.familyId && styles.fieldError)}>
        <label className={styles.label}>
          {t("family.myFamily")}
          <span className={styles.required}>*</span>
        </label>
        <select
          className={cn(styles.select, touched && errors.familyId && styles.inputError)}
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
        >
          <option value="">{t("sponsorDashboard.selectFamily")}</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        {touched && errors.familyId && <span className={styles.errorText}>{errors.familyId}</span>}
      </div>

      {/* Assign to — visual member picker (multi-select) */}
      <div className={cn(styles.field, touched && errors.assignedTo && styles.fieldError)}>
        <label className={styles.label}>
          {t("habits.assignTo")}
          <span className={styles.required}>*</span>
        </label>
        <MemberPicker
          kids={kids}
          selectedIds={assignedTo}
          onToggle={handleKidToggle}
          multiple
        />
        {touched && errors.assignedTo && <span className={styles.errorText}>{errors.assignedTo}</span>}
      </div>

      {/* Submit */}
      <button type="submit" className={styles.submitButton} disabled={submitting}>
        <PlusIcon size={16} />
        {t("habits.createHabit")}
      </button>
    </form>
  );
}

export default CreateHabitForm;
