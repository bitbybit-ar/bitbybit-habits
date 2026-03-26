import { apiHandler, ForbiddenError, NotFoundError } from "@/lib/api";
import { families, familyMembers, completions, habits, payments } from "@/lib/db";
import { eq, and, sql, count, sum } from "drizzle-orm";
import { todayDateStr } from "@/lib/date";

export const GET = apiHandler(async (_req, { session, db, params }) => {
  const familyId = params.id;

  // Verify family exists
  const family = await db
    .select({ id: families.id })
    .from(families)
    .where(eq(families.id, familyId));

  if (family.length === 0) {
    throw new NotFoundError("Familia");
  }

  // Verify user is a sponsor in this family
  const membership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.family_id, familyId),
        eq(familyMembers.user_id, session.user_id),
      ),
    );

  if (membership.length === 0 || membership[0].role !== "sponsor") {
    throw new ForbiddenError("Solo sponsors pueden ver estadísticas de la familia");
  }

  const todayStr = todayDateStr();

  // Run all stats queries in parallel
  const [completedTodayResult, totalTodayResult, pendingResult, totalPaidResult] =
    await Promise.all([
      // completedToday: completions done today across all kids in this family
      db
        .select({ count: count() })
        .from(completions)
        .innerJoin(habits, eq(habits.id, completions.habit_id))
        .where(
          and(
            eq(habits.family_id, familyId),
            eq(habits.active, true),
            eq(completions.date, todayStr),
          ),
        ),

      // totalToday: count of active habits in this family (each represents one expected completion per day)
      db
        .select({ count: count() })
        .from(habits)
        .where(and(eq(habits.family_id, familyId), eq(habits.active, true))),

      // pendingApprovals: completions with status "pending" across this family
      db
        .select({ count: count() })
        .from(completions)
        .innerJoin(habits, eq(habits.id, completions.habit_id))
        .where(
          and(
            eq(habits.family_id, familyId),
            eq(habits.active, true),
            eq(completions.status, "pending"),
          ),
        ),

      // totalSatsPaid: sum of all paid payments for habits in this family
      db
        .select({
          total: sql<number>`COALESCE(${sum(payments.amount_sats)}, 0)`,
        })
        .from(payments)
        .innerJoin(completions, eq(completions.id, payments.completion_id))
        .innerJoin(habits, eq(habits.id, completions.habit_id))
        .where(
          and(eq(habits.family_id, familyId), eq(payments.status, "paid")),
        ),
    ]);

  return {
    completedToday: completedTodayResult[0]?.count ?? 0,
    totalToday: totalTodayResult[0]?.count ?? 0,
    pendingApprovals: pendingResult[0]?.count ?? 0,
    totalSatsPaid: Number(totalPaidResult[0]?.total ?? 0),
  };
});
