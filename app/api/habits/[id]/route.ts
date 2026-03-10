import { apiHandler, NotFoundError, BadRequestError } from "@/lib/api";
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
    assigned_to,
    active,
  } = body as Partial<Habit>;

  // Validate assigned_to is a member of the habit's family (if changing)
  if (assigned_to && assigned_to !== existing[0].assigned_to && existing[0].family_id) {
    const membership = await db`
      SELECT id FROM family_members
      WHERE family_id = ${existing[0].family_id} AND user_id = ${assigned_to}
    `;
    if (membership.length === 0) {
      throw new BadRequestError("El usuario asignado no es miembro de esta familia");
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const finalAssignedTo = assigned_to ?? existing[0].assigned_to;

  const updated = await db`
    UPDATE habits SET
      name = COALESCE(${name?.trim() ?? null}, name),
      description = COALESCE(${description ?? null}, description),
      color = COALESCE(${color ?? null}, color),
      sat_reward = COALESCE(${sat_reward ?? null}, sat_reward),
      schedule_type = COALESCE(${schedule_type ?? null}, schedule_type),
      schedule_days = COALESCE(${schedule_days ?? null}, schedule_days),
      schedule_times_per_week = COALESCE(${schedule_times_per_week ?? null}, schedule_times_per_week),
      verification_type = COALESCE(${verification_type ?? null}, verification_type),
      assigned_to = COALESCE(${assigned_to ?? null}, assigned_to),
      active = COALESCE(${active ?? null}, active)
    WHERE id = ${id}
    RETURNING *
  ` as Habit[];

  // Include completed_today to match GET response shape
  const completion = await db`
    SELECT id FROM completions
    WHERE habit_id = ${id} AND user_id = ${finalAssignedTo} AND date = ${today}
    LIMIT 1
  `;

  return { ...updated[0], completed_today: completion.length > 0 };
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
