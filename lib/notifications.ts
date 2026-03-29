import { getDb, notifications } from "@/lib/db";

export type NotificationType =
  | "completion_pending"
  | "completion_approved"
  | "completion_rejected"
  | "payment_received"
  | "payment_failed"
  | "member_joined";

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
  await db.insert(notifications).values({
    user_id: userId,
    type,
    title,
    body,
    metadata: metadata ?? null,
  });
}
