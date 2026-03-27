import { apiHandler, NotFoundError } from "@/lib/api";
import { habits, familyMembers, habitAssignments } from "@/lib/db";
import { eq, and, or, isNotNull } from "drizzle-orm";

/**
 * GET /api/habits/:id/assignments
 *
 * List the users assigned to a habit. Falls back to the assigned_to field.
 */
export const GET = apiHandler(async (_req, { session, db, params }) => {
  const { id } = params;

  // Verify user has access to this habit
  const existing = await db
    .select({ id: habits.id, assigned_to: habits.assigned_to })
    .from(habits)
    .leftJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(
      and(
        eq(habits.id, id),
        or(
          eq(habits.created_by, session.user_id),
          eq(habits.assigned_to, session.user_id),
          isNotNull(familyMembers.id)
        )
      )
    );

  if (existing.length === 0) {
    throw new NotFoundError("Habit not found");
  }

  // Get from habit_assignments table
  const assignments = await db
    .select({ user_id: habitAssignments.user_id })
    .from(habitAssignments)
    .where(eq(habitAssignments.habit_id, id));

  if (assignments.length > 0) {
    return assignments;
  }

  // Fall back to assigned_to
  return [{ user_id: existing[0].assigned_to }];
});
