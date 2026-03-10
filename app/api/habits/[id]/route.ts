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
    assigned_to,
    assigned_members,
    active,
  } = body as Partial<Habit> & { assigned_members?: string[] };

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

  // Save member assignments if provided
  if (assigned_members && assigned_members.length > 0) {
    try {
      // Ensure habit_assignments table exists
      await db`
        CREATE TABLE IF NOT EXISTS habit_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(habit_id, user_id)
        )
      `;

      // Clear existing assignments for this habit
      await db`DELETE FROM habit_assignments WHERE habit_id = ${id}`;

      // Insert new assignments
      for (const userId of assigned_members) {
        await db`
          INSERT INTO habit_assignments (habit_id, user_id)
          VALUES (${id}, ${userId})
          ON CONFLICT (habit_id, user_id) DO NOTHING
        `;
      }
    } catch (err) {
      console.error("Error saving habit assignments:", err);
    }
  }

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
