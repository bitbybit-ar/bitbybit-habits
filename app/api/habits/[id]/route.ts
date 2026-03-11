import { apiHandler, NotFoundError } from "@/lib/api";
import { habits, habitAssignments } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const PUT = apiHandler(async (request, { session, db, params }) => {
  const { id } = params;

  // Verify ownership
  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.created_by, session.user_id)));

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
  } = body as {
    name?: string;
    description?: string;
    color?: string;
    sat_reward?: number;
    schedule_type?: string;
    schedule_days?: number[];
    schedule_times_per_week?: number;
    verification_type?: string;
    assigned_to?: string;
    assigned_members?: string[];
    active?: boolean;
  };

  const updates: Partial<typeof habits.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;
  if (sat_reward !== undefined) updates.sat_reward = sat_reward;
  if (schedule_type !== undefined) updates.schedule_type = schedule_type as typeof habits.$inferInsert.schedule_type;
  if (schedule_days !== undefined) updates.schedule_days = schedule_days;
  if (schedule_times_per_week !== undefined) updates.schedule_times_per_week = schedule_times_per_week;
  if (verification_type !== undefined) updates.verification_type = verification_type as typeof habits.$inferInsert.verification_type;
  if (assigned_to !== undefined) updates.assigned_to = assigned_to;
  if (active !== undefined) updates.active = active;

  const updated = await db
    .update(habits)
    .set(updates)
    .where(eq(habits.id, id))
    .returning();

  // Save member assignments if provided
  if (assigned_members && assigned_members.length > 0) {
    // Clear existing assignments for this habit
    await db.delete(habitAssignments).where(eq(habitAssignments.habit_id, id));

    // Insert new assignments
    await db.insert(habitAssignments).values(
      assigned_members.map((userId) => ({ habit_id: id, user_id: userId }))
    );
  }

  return updated[0];
});

export const DELETE = apiHandler(async (_req, { session, db, params }) => {
  const { id } = params;

  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.created_by, session.user_id)));

  if (existing.length === 0) {
    throw new NotFoundError("Hábito no encontrado o no tenés permiso para eliminarlo");
  }

  await db.update(habits).set({ active: false }).where(eq(habits.id, id));

  return undefined;
});
