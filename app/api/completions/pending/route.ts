import { apiHandler } from "@/lib/api";

interface PendingCompletionRow {
  id: string;
  habit_id: string;
  habit_name: string;
  habit_color: string;
  kid_name: string;
  sat_reward: number;
  date: string;
  completed_at: string;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  const pendingCompletions = await db`
    SELECT
      c.id,
      c.habit_id,
      h.name AS habit_name,
      h.color AS habit_color,
      u.display_name AS kid_name,
      h.sat_reward,
      c.date,
      c.completed_at
    FROM completions c
    INNER JOIN habits h ON h.id = c.habit_id
    INNER JOIN users u ON u.id = c.user_id
    INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    WHERE c.status = 'pending'
      AND fm.role = 'sponsor'
    ORDER BY c.completed_at DESC
  ` as PendingCompletionRow[];

  return pendingCompletions;
});
