import { apiHandler, requireFields } from "@/lib/api";
import type { Notification } from "@/lib/types";

/**
 * GET /api/notifications
 * Query params:
 *   unread — "true" to return only unread notifications
 */
export const GET = apiHandler(async (request, { session, db }) => {
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";

  let notifications: Notification[];

  if (unreadOnly) {
    notifications = await db`
      SELECT * FROM notifications
      WHERE user_id = ${session.user_id} AND read = false
      ORDER BY created_at DESC
      LIMIT 50
    ` as Notification[];
  } else {
    notifications = await db`
      SELECT * FROM notifications
      WHERE user_id = ${session.user_id}
      ORDER BY created_at DESC
      LIMIT 50
    ` as Notification[];
  }

  return notifications;
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

  await db`
    UPDATE notifications SET read = true
    WHERE id = ${id} AND user_id = ${session.user_id}
  `;

  return undefined;
});
