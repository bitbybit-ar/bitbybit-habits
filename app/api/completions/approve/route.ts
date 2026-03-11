import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { completions, habits, familyMembers, payments } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { completion_id } = body as { completion_id: string };

  requireFields({ completion_id }, ["completion_id"]);

  // Get the completion and verify sponsor is in the same family
  const result = await db
    .select({
      id: completions.id,
      habit_id: completions.habit_id,
      user_id: completions.user_id,
      date: completions.date,
      status: completions.status,
      sat_reward: habits.sat_reward,
      family_id: habits.family_id,
      assigned_to: habits.assigned_to,
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
    throw new NotFoundError("Completacion no encontrada o ya procesada");
  }

  const completion = result[0];

  // Update completion status
  const updated = await db
    .update(completions)
    .set({ status: "approved", reviewed_by: session.user_id, reviewed_at: sql`NOW()` })
    .where(eq(completions.id, completion_id))
    .returning();

  // If habit has sat_reward > 0, create a pending payment record
  if (completion.sat_reward > 0) {
    await db.insert(payments).values({
      completion_id,
      from_user_id: session.user_id,
      to_user_id: completion.user_id,
      amount_sats: completion.sat_reward,
      status: "pending",
    });
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
