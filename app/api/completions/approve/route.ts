import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import type { Completion } from "@/lib/types";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { completion_id } = body as { completion_id: string };

  requireFields({ completion_id }, ["completion_id"]);

  // Get the completion and verify sponsor is in the same family
  const completions = await db`
    SELECT c.*, h.sat_reward, h.family_id, h.assigned_to, h.name AS habit_name
    FROM completions c
    INNER JOIN habits h ON h.id = c.habit_id
    INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    WHERE c.id = ${completion_id}
      AND c.status = 'pending'
      AND fm.role = 'sponsor'
  ` as (Completion & { sat_reward: number; family_id: string; assigned_to: string; habit_name: string })[];

  if (completions.length === 0) {
    throw new NotFoundError("Completacion no encontrada o ya procesada");
  }

  const completion = completions[0];

  // Update completion status
  const updated = await db`
    UPDATE completions
    SET status = 'approved', reviewed_by = ${session.user_id}, reviewed_at = NOW()
    WHERE id = ${completion_id}
    RETURNING *
  ` as Completion[];

  // If habit has sat_reward > 0, create a pending payment record
  if (completion.sat_reward > 0) {
    await db`
      INSERT INTO payments (completion_id, from_user_id, to_user_id, amount_sats, status)
      VALUES (${completion_id}, ${session.user_id}, ${completion.user_id}, ${completion.sat_reward}, 'pending')
    `;
  }

  // Notify the kid
  try {
    const habitName = completion.habit_name ?? "a habit";
    const reward = completion.sat_reward;
    await createNotification(
      completion.user_id,
      "completion_approved",
      "Habit approved! 🎉",
      `Your habit "${habitName}" was approved!${reward > 0 ? ` +${reward} sats` : ""}`,
      { completion_id, habit_name: habitName, reward_sats: reward }
    );
  } catch (notifError) {
    console.error("Error creating notification:", notifError);
  }

  return updated[0];
});
