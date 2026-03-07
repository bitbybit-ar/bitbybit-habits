import { getDb } from "@/lib/db";

export type NotificationType =
  | "completion_pending"
  | "completion_approved"
  | "completion_rejected"
  | "payment_received"
  | "payment_failed";

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (${userId}, ${type}, ${title}, ${body}, ${metadata ? JSON.stringify(metadata) : null})
  `;
}
