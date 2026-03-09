import { apiHandler, NotFoundError } from "@/lib/api";
import type { Habit } from "@/lib/types";

export const PUT = apiHandler(async (request, { session, db, params }) => {
  const { id } = params;

  // Verify ownership
  const existing = await db`
    SELECT * FROM habits WHERE id = ${id} AND created_by = ${session.user_id}
  `;

  if (existing.length === 0) {
    throw new NotFoundError("Hábito no encontrado o no tenés permiso para editarlo");
  }

  const body = await request.json();
  const {
    name,
    description,
    color,
    sat_reward,
    schedule_type,
    schedule_days,
    schedule_times_per_week,
    verification_type,
    active,
  } = body as Partial<Habit>;

  const updated = await db`
    UPDATE habits SET
      name = COALESCE(${name ?? null}, name),
      description = COALESCE(${description ?? null}, description),
      color = COALESCE(${color ?? null}, color),
      sat_reward = COALESCE(${sat_reward ?? null}, sat_reward),
      schedule_type = COALESCE(${schedule_type ?? null}, schedule_type),
      schedule_days = COALESCE(${schedule_days ? JSON.stringify(schedule_days) : null}, schedule_days),
      schedule_times_per_week = COALESCE(${schedule_times_per_week ?? null}, schedule_times_per_week),
      verification_type = COALESCE(${verification_type ?? null}, verification_type),
      active = COALESCE(${active ?? null}, active)
    WHERE id = ${id}
    RETURNING *
  ` as Habit[];

  return updated[0];
});

export const DELETE = apiHandler(async (_req, { session, db, params }) => {
  const { id } = params;

  const existing = await db`
    SELECT * FROM habits WHERE id = ${id} AND created_by = ${session.user_id}
  `;

  if (existing.length === 0) {
    throw new NotFoundError("Hábito no encontrado o no tenés permiso para eliminarlo");
  }

  await db`
    UPDATE habits SET active = false WHERE id = ${id}
  `;

  return undefined;
});
