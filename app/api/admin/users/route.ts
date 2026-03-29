import { apiHandler, ForbiddenError } from "@/lib/api";
import { users, familyMembers, families, wallets } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { eq, desc, ilike, or, sql, count, and, inArray } from "drizzle-orm";

/**
 * GET /api/admin/users
 *
 * Lists all users with pagination, search, and role info.
 * Admin only (verified by nostr_pubkey).
 *
 * Query params:
 *   page    — page number (default 1)
 *   limit   — items per page (default 50, max 200)
 *   search  — filter by email, username, or display_name (case-insensitive)
 */
export const GET = apiHandler(async (request, { session, db }) => {
  if (!isAdmin(session)) {
    throw new ForbiddenError();
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const search = url.searchParams.get("search")?.trim() || "";
  const familyFilter = url.searchParams.get("family")?.trim() || "";
  const offset = (page - 1) * limit;

  // If filtering by family, get the user IDs in that family first
  let familyUserIds: string[] | null = null;
  if (familyFilter) {
    const familyMemberRows = await db
      .select({ user_id: familyMembers.user_id })
      .from(familyMembers)
      .where(eq(familyMembers.family_id, familyFilter));
    familyUserIds = familyMemberRows.map((r) => r.user_id);

    if (familyUserIds.length === 0) {
      return { users: [], total: 0, page, limit, pages: 0 };
    }
  }

  // Build WHERE conditions
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.email, `%${search}%`),
        ilike(users.username, `%${search}%`),
        ilike(users.display_name, `%${search}%`)
      )!
    );
  }

  if (familyUserIds) {
    conditions.push(inArray(users.id, familyUserIds));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count for pagination
  const [totalResult] = await db
    .select({ total: count() })
    .from(users)
    .where(whereCondition);

  const total = totalResult?.total ?? 0;

  // Fetch users
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
    .where(whereCondition)
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  // Get family memberships and wallet status for all fetched users
  const userIds = userRows.map((u) => u.id);

  if (userIds.length === 0) {
    return { users: [], total, page, limit, pages: 0 };
  }

  // Get memberships for all users in a single query
  const membershipRows = await db
    .select({
      user_id: familyMembers.user_id,
      family_id: familyMembers.family_id,
      role: familyMembers.role,
      family_name: families.name,
    })
    .from(familyMembers)
    .innerJoin(families, eq(families.id, familyMembers.family_id))
    .where(sql`${familyMembers.user_id} IN ${userIds}`);

  // Get wallet status
  const walletRows = await db
    .select({
      user_id: wallets.user_id,
      active: wallets.active,
    })
    .from(wallets)
    .where(sql`${wallets.user_id} IN ${userIds}`);

  // Index memberships and wallets by user_id
  const membershipsByUser = new Map<string, typeof membershipRows>();
  for (const m of membershipRows) {
    const list = membershipsByUser.get(m.user_id) || [];
    list.push(m);
    membershipsByUser.set(m.user_id, list);
  }

  const walletByUser = new Map<string, boolean>();
  for (const w of walletRows) {
    if (w.active) walletByUser.set(w.user_id, true);
  }

  const enrichedUsers = userRows.map((u) => ({
    ...u,
    families: membershipsByUser.get(u.id) || [],
    has_wallet: walletByUser.get(u.id) || false,
  }));

  return {
    users: enrichedUsers,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
});
