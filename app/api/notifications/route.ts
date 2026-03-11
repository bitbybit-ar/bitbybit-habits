import { apiHandler, requireFields } from "@/lib/api";
import { notifications } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/notifications
 * Query params:
 *   unread — "true" to return only unread notifications
 */
export const GET = apiHandler(async (request, { session, db }) => {
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";

  const conditions = [eq(notifications.user_id, session.user_id)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  const result = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.created_at))
    .limit(50);

  return result;
});

/**
 * PATCH /api/notifications
 * Body: { id: string }
 * Marks a notification as read.
 */
export const PATCH = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { id } = body as { id?: string };

  requireFields({ id }, ["id"]);

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id!), eq(notifications.user_id, session.user_id)));

  return undefined;
});
