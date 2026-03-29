import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { completions, habits, familyMembers } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/completions/reject
 *
 * Reject a pending completion (sponsor only). Notifies the kid.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { completion_id, reason } = body as {
    completion_id: string;
    reason?: string;
  };

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

  const updates: Record<string, unknown> = {
    status: "rejected",
    reviewed_by: session.user_id,
    reviewed_at: sql`NOW()`,
  };
  if (reason) updates.note = reason;

  const updated = await db
    .update(completions)
    .set(updates)
    .where(eq(completions.id, completion_id))
    .returning();

  // Notify the kid
  const completion = result[0];
  try {
    await createNotification(
      completion.user_id,
      "completion_rejected",
      "Habit not approved",
      `Your habit "${completion.habit_name}" was not approved.`,
      { completion_id, habit_name: completion.habit_name }
    );
  } catch {
    // Notification is best-effort
  }

  return updated[0];
}, { rateLimit: "auth" });
