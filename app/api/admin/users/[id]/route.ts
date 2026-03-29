import { apiHandler, ForbiddenError, NotFoundError, BadRequestError } from "@/lib/api";
import { users, familyMembers, completions, payments, habits, wallets, notifications } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { eq, count, sql } from "drizzle-orm";

/**
 * GET /api/admin/users/[id]
 *
 * Get detailed user info including stats and family memberships.
 */
export const GET = apiHandler(async (_request, { session, db, params }) => {
  if (!isAdmin(session)) {
    throw new ForbiddenError();
  }

  const userId = params.id;

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      nostr_pubkey: users.nostr_pubkey,
      locale: users.locale,
      totp_enabled: users.totp_enabled,
      failed_login_attempts: users.failed_login_attempts,
      locked_until: users.locked_until,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    throw new NotFoundError("User");
  }

  const user = userRows[0];

  // Get stats in parallel
  const [completionCount, paymentStats, habitCount, walletRows] = await Promise.all([
    db.select({ total: count() }).from(completions).where(eq(completions.user_id, userId)),
    db.select({
      total_earned: sql<number>`COALESCE(SUM(CASE WHEN ${payments.to_user_id} = ${userId} AND ${payments.status} = 'paid' THEN ${payments.amount_sats} ELSE 0 END), 0)`,
      total_sent: sql<number>`COALESCE(SUM(CASE WHEN ${payments.from_user_id} = ${userId} AND ${payments.status} = 'paid' THEN ${payments.amount_sats} ELSE 0 END), 0)`,
    }).from(payments).where(sql`${payments.from_user_id} = ${userId} OR ${payments.to_user_id} = ${userId}`),
    db.select({ total: count() }).from(habits).where(eq(habits.assigned_to, userId)),
    db.select({ id: wallets.id, active: wallets.active, label: wallets.label, created_at: wallets.created_at })
      .from(wallets).where(eq(wallets.user_id, userId)),
  ]);

  return {
    ...user,
    stats: {
      completions: completionCount[0]?.total ?? 0,
      sats_earned: paymentStats[0]?.total_earned ?? 0,
      sats_sent: paymentStats[0]?.total_sent ?? 0,
      habits: habitCount[0]?.total ?? 0,
    },
    wallets: walletRows,
  };
});

/**
 * PATCH /api/admin/users/[id]
 *
 * Update user fields. Supports:
 *   - display_name, email, username, locale
 *   - locked_until (null to unlock)
 *   - failed_login_attempts (0 to reset)
 */
export const PATCH = apiHandler(async (request, { session, db, params }) => {
  if (!isAdmin(session)) {
    throw new ForbiddenError();
  }

  const userId = params.id;
  const body = await request.json();

  // Only allow specific fields to be updated
  const allowedFields = ["display_name", "email", "username", "locale", "locked_until", "failed_login_attempts"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("no_fields_to_update");
  }

  // Validate locale if provided
  if ("locale" in updates && updates.locale !== "es" && updates.locale !== "en") {
    throw new BadRequestError("invalidLocale");
  }

  updates.updated_at = new Date();

  const result = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      locale: users.locale,
      locked_until: users.locked_until,
      failed_login_attempts: users.failed_login_attempts,
      updated_at: users.updated_at,
    });

  if (result.length === 0) {
    throw new NotFoundError("User");
  }

  return result[0];
});

/**
 * DELETE /api/admin/users/[id]
 *
 * Delete a user and all their related data.
 * Cannot delete yourself.
 */
export const DELETE = apiHandler(async (_request, { session, db, params }) => {
  if (!isAdmin(session)) {
    throw new ForbiddenError();
  }

  const userId = params.id;

  if (userId === session.user_id) {
    throw new BadRequestError("cannot_delete_self");
  }

  // Check user exists
  const userRows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows[0]) {
    throw new NotFoundError("User");
  }

  // Delete in dependency order: notifications, wallets, family memberships, then user
  // (payments, completions, habits reference user but have ON DELETE behavior)
  await db.delete(notifications).where(eq(notifications.user_id, userId));
  await db.delete(wallets).where(eq(wallets.user_id, userId));
  await db.delete(familyMembers).where(eq(familyMembers.user_id, userId));
  await db.delete(users).where(eq(users.id, userId));

  return { deleted: true };
});
