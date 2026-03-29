import { BadRequestError } from "./errors";

const VALID_SCHEDULE_TYPES = ["daily", "specific_days", "times_per_week"] as const;
const VALID_VERIFICATION_TYPES = ["sponsor_approval", "self_verify"] as const;

export type ScheduleType = typeof VALID_SCHEDULE_TYPES[number];
export type VerificationType = typeof VALID_VERIFICATION_TYPES[number];

interface HabitFieldsInput {
  schedule_type?: string;
  verification_type?: string;
  sat_reward?: number;
  color?: string;
  schedule_days?: number[];
}

/**
 * Validates habit fields shared between create and update routes.
 * All fields are optional — only validates if present.
 */
export function validateHabitFields(input: HabitFieldsInput): void {
  const { schedule_type, verification_type, sat_reward, color, schedule_days } = input;

  if (schedule_type !== undefined && !VALID_SCHEDULE_TYPES.includes(schedule_type as ScheduleType)) {
    throw new BadRequestError("Invalid schedule_type");
  }

  if (verification_type !== undefined && !VALID_VERIFICATION_TYPES.includes(verification_type as VerificationType)) {
    throw new BadRequestError("Invalid verification_type");
  }

  if (sat_reward !== undefined && sat_reward !== null) {
    if (!Number.isInteger(sat_reward) || sat_reward < 0 || sat_reward > 1_000_000) {
      throw new BadRequestError("sat_reward must be an integer between 0 and 1,000,000");
    }
  }

  if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new BadRequestError("color must be a valid hex (#RRGGBB)");
  }

  if (schedule_days !== undefined && schedule_days !== null) {
    if (!Array.isArray(schedule_days) || schedule_days.some((d: number) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestError("schedule_days must contain valid days (0-6)");
    }
  }
}
