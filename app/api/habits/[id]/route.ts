import { apiHandler, NotFoundError, ForbiddenError } from "@/lib/api";
import { validateHabitFields } from "@/lib/api/validate-habit";
import { habits, habitAssignments, familyMembers } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

export const PUT = apiHandler(async (request, { session, db, params }) => {
  const { id } = params;

  // Verify ownership
  const existing = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.created_by, session.user_id)));

  if (existing.length === 0) {
    throw new NotFoundError("habit_not_found");
  }

  const habit = existing[0];
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

  // Validate fields using shared validator
  validateHabitFields({ schedule_type, verification_type, sat_reward, color, schedule_days });

  // Validate assigned_to belongs to the habit's family
  if (assigned_to !== undefined && habit.family_id) {
    const membership = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(and(eq(familyMembers.family_id, habit.family_id), eq(familyMembers.user_id, assigned_to)));

    if (membership.length === 0) {
      throw new ForbiddenError("user_not_family_member");
    }
  }

  // Validate assigned_members belong to the habit's family
  if (assigned_members && assigned_members.length > 0 && habit.family_id) {
    const memberships = await db
      .select({ user_id: familyMembers.user_id })
      .from(familyMembers)
      .where(and(eq(familyMembers.family_id, habit.family_id), inArray(familyMembers.user_id, assigned_members)));

    if (memberships.length !== assigned_members.length) {
      throw new ForbiddenError("user_not_family_member");
    }
  }

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
    await db.delete(habitAssignments).where(eq(habitAssignments.habit_id, id));
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
    throw new NotFoundError("habit_not_found");
  }

  await db.update(habits).set({ active: false }).where(eq(habits.id, id));

  return undefined;
});
