import { apiHandler, requireFields, NotFoundError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { completions, habits, familyMembers, payments } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/completions/approve
 *
 * Approve a pending completion (sponsor only). Creates a payment record
 * if the habit has a sat reward. Sponsor wallet is not required — they can pay via QR.
 */
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
    throw new NotFoundError("completion_not_found");
  }

  const completion = result[0];

  // Update completion status
  const updated = await db
    .update(completions)
    .set({ status: "approved", reviewed_by: session.user_id, reviewed_at: sql`NOW()` })
    .where(eq(completions.id, completion_id))
    .returning();

  // Check wallet and create payment record if reward > 0
  let paymentStatus: "no_wallet" | "pending" | "none" = "none";

  if (completion.sat_reward > 0) {
    // Always create payment record when there's a reward.
    // Sponsor's wallet is optional — they can pay via QR invoice even without one.
    await db.insert(payments).values({
      completion_id,
      from_user_id: session.user_id,
      to_user_id: completion.user_id,
      amount_sats: completion.sat_reward,
      status: "pending",
    });
    paymentStatus = "pending";
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

  return { ...updated[0], payment_status: paymentStatus };
});
