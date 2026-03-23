import { apiHandler, NotFoundError, BadRequestError, ForbiddenError } from "@/lib/api";
import { habits, habitAssignments, familyMembers } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

const VALID_SCHEDULE_TYPES = ["daily", "specific_days", "times_per_week"] as const;
const VALID_VERIFICATION_TYPES = ["sponsor_approval", "self_verify"] as const;

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

  // Validate enum fields
  if (schedule_type !== undefined && !VALID_SCHEDULE_TYPES.includes(schedule_type as typeof VALID_SCHEDULE_TYPES[number])) {
    throw new BadRequestError("schedule_type invalido");
  }
  if (verification_type !== undefined && !VALID_VERIFICATION_TYPES.includes(verification_type as typeof VALID_VERIFICATION_TYPES[number])) {
    throw new BadRequestError("verification_type invalido");
  }

  // Validate sat_reward
  if (sat_reward !== undefined) {
    if (!Number.isInteger(sat_reward) || sat_reward < 0 || sat_reward > 1_000_000) {
      throw new BadRequestError("sat_reward debe ser un entero entre 0 y 1.000.000");
    }
  }

  // Validate color format
  if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new BadRequestError("color debe ser un hex valido (#RRGGBB)");
  }

  // Validate schedule_days
  if (schedule_days !== undefined) {
    if (!Array.isArray(schedule_days) || schedule_days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestError("schedule_days debe contener dias validos (0-6)");
    }
  }

  // Validate assigned_to belongs to the habit's family
  if (assigned_to !== undefined && habit.family_id) {
    const membership = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(and(eq(familyMembers.family_id, habit.family_id), eq(familyMembers.user_id, assigned_to)));

    if (membership.length === 0) {
      throw new ForbiddenError("El usuario asignado no es miembro de esta familia");
    }
  }

  // Validate assigned_members belong to the habit's family
  if (assigned_members && assigned_members.length > 0 && habit.family_id) {
    const memberships = await db
      .select({ user_id: familyMembers.user_id })
      .from(familyMembers)
      .where(and(eq(familyMembers.family_id, habit.family_id), inArray(familyMembers.user_id, assigned_members)));

    if (memberships.length !== assigned_members.length) {
      throw new ForbiddenError("Algunos usuarios asignados no son miembros de esta familia");
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
    throw new NotFoundError("Hábito no encontrado o no tenés permiso para eliminarlo");
  }

  await db.update(habits).set({ active: false }).where(eq(habits.id, id));

  return undefined;
});
