import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import type { Completion } from "@/lib/types";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { completion_id, reason } = body as {
    completion_id: string;
    reason?: string;
  };

  requireFields({ completion_id }, ["completion_id"]);

  // Verify sponsor is in the same family as the habit
  const completions = await db`
    SELECT c.*, h.name AS habit_name FROM completions c
    INNER JOIN habits h ON h.id = c.habit_id
    INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    WHERE c.id = ${completion_id}
      AND c.status = 'pending'
      AND fm.role = 'sponsor'
  ` as (Completion & { habit_name: string })[];

  if (completions.length === 0) {
    throw new NotFoundError("Completacion no encontrada o ya procesada");
  }

  const updated = await db`
    UPDATE completions
    SET status = 'rejected', reviewed_by = ${session.user_id}, reviewed_at = NOW(), note = COALESCE(${reason ?? null}, note)
    WHERE id = ${completion_id}
    RETURNING *
  ` as Completion[];

  // Notify the kid
  const completion = completions[0];
  try {
    await createNotification(
      completion.user_id,
      "completion_rejected",
      "Habit not approved",
      `Your habit "${completion.habit_name}" was not approved.`,
      { completion_id, habit_name: completion.habit_name }
    );
  } catch (notifError) {
    console.error("Error creating notification:", notifError);
  }

  return updated[0];
});
