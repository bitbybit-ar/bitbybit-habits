import { apiHandler, ForbiddenError } from "@/lib/api";
import { users, families, habits, completions, payments } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { count, sql, eq } from "drizzle-orm";

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide statistics for the admin dashboard.
 */
export const GET = apiHandler(async (_request, { session, db }) => {
  if (!isAdmin(session)) {
    throw new ForbiddenError();
  }

  const [
    userCount,
    familyCount,
    habitCount,
    completionStats,
    paymentStats,
  ] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(families),
    db.select({ total: count() }).from(habits),
    db.select({
      total: count(),
      approved: sql<number>`COUNT(CASE WHEN ${completions.status} = 'approved' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN ${completions.status} = 'pending' THEN 1 END)`,
      rejected: sql<number>`COUNT(CASE WHEN ${completions.status} = 'rejected' THEN 1 END)`,
    }).from(completions),
    db.select({
      total: count(),
      paid: sql<number>`COUNT(CASE WHEN ${payments.status} = 'paid' THEN 1 END)`,
      total_sats: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'paid' THEN ${payments.amount_sats} ELSE 0 END), 0)`,
    }).from(payments),
  ]);

  const dbUrl = process.env.DATABASE_URL || "";
  const isLocalDb = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

  return {
    db: isLocalDb ? "local" : "production",
    users: userCount[0]?.total ?? 0,
    families: familyCount[0]?.total ?? 0,
    habits: habitCount[0]?.total ?? 0,
    completions: {
      total: completionStats[0]?.total ?? 0,
      approved: completionStats[0]?.approved ?? 0,
      pending: completionStats[0]?.pending ?? 0,
      rejected: completionStats[0]?.rejected ?? 0,
    },
    payments: {
      total: paymentStats[0]?.total ?? 0,
      paid: paymentStats[0]?.paid ?? 0,
      total_sats: paymentStats[0]?.total_sats ?? 0,
    },
  };
});
