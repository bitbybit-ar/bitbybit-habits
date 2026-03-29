import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { completions, habits, familyMembers, payments, wallets } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/completions/approve
 *
 * Approve a pending completion (sponsor only). Creates a payment record
 * if the habit has a sat reward. Fails if kid has no wallet when reward > 0.
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

  // If there's a sat reward, verify kid has a wallet to receive payment
  if (completion.sat_reward > 0) {
    const kidWallet = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(and(eq(wallets.user_id, completion.user_id), eq(wallets.active, true)))
      .limit(1);

    if (kidWallet.length === 0) {
      throw new BadRequestError("kid_no_wallet");
    }
  }

  // Update completion status
  const updated = await db
    .update(completions)
    .set({ status: "approved", reviewed_by: session.user_id, reviewed_at: sql`NOW()` })
    .where(eq(completions.id, completion_id))
    .returning();

  // Create payment record if reward > 0
  let paymentStatus: "pending" | "none" = "none";
  let paymentId: string | null = null;

  if (completion.sat_reward > 0) {
    const paymentRows = await db.insert(payments).values({
      completion_id,
      from_user_id: session.user_id,
      to_user_id: completion.user_id,
      amount_sats: completion.sat_reward,
      status: "pending",
    }).returning();
    paymentStatus = "pending";
    paymentId = paymentRows[0].id;
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
  } catch {
    // Notification is best-effort — don't fail the approval
  }

  return { ...updated[0], payment_status: paymentStatus, payment_id: paymentId };
}, { rateLimit: "auth" });
