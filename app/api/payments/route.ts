import { apiHandler } from "@/lib/api";
import { payments, completions, habits, users } from "@/lib/db";
import { eq, and, or, gte, lte, desc, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

function buildPaymentQuery(
  db: ReturnType<typeof import("@/lib/db").getDb>,
  sessionUserId: string,
  role: string | null,
  dateConditions: SQL[]
) {
  if (role === "sponsor" || role === "kid") {
    // For sponsor: filter by from_user_id, show to_user's name
    // For kid: filter by to_user_id, show from_user's name
    const filterCol = role === "sponsor" ? payments.from_user_id : payments.to_user_id;
    const joinCol = role === "sponsor" ? payments.to_user_id : payments.from_user_id;

    return db
      .select({
        id: payments.id,
        completion_id: payments.completion_id,
        from_user_id: payments.from_user_id,
        to_user_id: payments.to_user_id,
        amount_sats: payments.amount_sats,
        payment_request: payments.payment_request,
        payment_hash: payments.payment_hash,
        status: payments.status,
        paid_at: payments.paid_at,
        created_at: payments.created_at,
        habit_name: habits.name,
        other_user_display_name: users.display_name,
      })
      .from(payments)
      .innerJoin(completions, eq(completions.id, payments.completion_id))
      .innerJoin(habits, eq(habits.id, completions.habit_id))
      .innerJoin(users, eq(users.id, joinCol))
      .where(and(eq(filterCol, sessionUserId), ...dateConditions))
      .orderBy(desc(payments.created_at));
  }

  // Both roles — need to alias users table for from and to
  const fromUser = users;
  return db
    .select({
      id: payments.id,
      completion_id: payments.completion_id,
      from_user_id: payments.from_user_id,
      to_user_id: payments.to_user_id,
      amount_sats: payments.amount_sats,
      payment_request: payments.payment_request,
      payment_hash: payments.payment_hash,
      status: payments.status,
      paid_at: payments.paid_at,
      created_at: payments.created_at,
      habit_name: habits.name,
      other_user_display_name: sql<string>`CASE WHEN ${payments.from_user_id} = ${sessionUserId} THEN tu.display_name ELSE ${fromUser.display_name} END`,
    })
    .from(payments)
    .innerJoin(completions, eq(completions.id, payments.completion_id))
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .innerJoin(fromUser, eq(fromUser.id, payments.from_user_id))
    .innerJoin(sql`users tu`, sql`tu.id = ${payments.to_user_id}`)
    .where(
      and(
        or(eq(payments.from_user_id, sessionUserId), eq(payments.to_user_id, sessionUserId)),
        ...dateConditions
      )
    )
    .orderBy(desc(payments.created_at));
}

/**
 * GET /api/payments
 *
 * Query params:
 *   role — "sponsor" | "kid" (filters perspective; omit for both)
 *   from — ISO date string (inclusive lower bound)
 *   to   — ISO date string (inclusive upper bound)
 */
export const GET = apiHandler(async (request, { session, db }) => {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateConditions: SQL[] = [];
  if (from) dateConditions.push(gte(payments.created_at, new Date(from)));
  if (to) dateConditions.push(lte(payments.created_at, new Date(to)));

  return buildPaymentQuery(db, session.user_id, role, dateConditions);
});
