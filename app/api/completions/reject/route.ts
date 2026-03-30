import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { completions, habits, familyMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/completions/reject
 *
 * Reject a pending completion (sponsor only). Deletes the completion
 * so the kid can redo the habit. Notifies the kid.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { completion_id } = body as { completion_id: string };

  requireFields({ completion_id }, ["completion_id"]);

  // Verify sponsor is in the same family as the habit
  const result = await db
    .select({
      id: completions.id,
      user_id: completions.user_id,
      habit_name: habits.name,
    })
    .from(completions)
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .innerJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(
      and(eq(completions.id, completion_id), eq(completions.status, "pending"), eq(familyMembers.role, "sponsor"))
    );

  if (result.length === 0) {
    throw new NotFoundError("completion_not_found");
  }

  const completion = result[0];

  // Delete the completion so the kid can redo the habit
  await db
    .delete(completions)
    .where(eq(completions.id, completion_id));

  // Notify the kid
  try {
    await createNotification(
      completion.user_id,
      "completion_rejected",
      "Habit not approved",
      `Your habit "${completion.habit_name}" was not approved. Try again!`,
      { completion_id, habit_name: completion.habit_name }
    );
  } catch {
    // Notification is best-effort
  }

  return { deleted: true };
}, { rateLimit: "auth" });
