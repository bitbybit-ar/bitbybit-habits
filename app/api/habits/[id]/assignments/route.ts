import { apiHandler, NotFoundError } from "@/lib/api";

export const GET = apiHandler(async (_req, { session, db, params }) => {
  const { id } = params;

  // Verify user has access to this habit
  const existing = await db`
    SELECT h.* FROM habits h
    LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    WHERE h.id = ${id}
      AND (
        h.created_by = ${session.user_id}
        OR h.assigned_to = ${session.user_id}
        OR fm.id IS NOT NULL
      )
  `;

  if (existing.length === 0) {
    throw new NotFoundError("Habit not found");
  }

  // Try to get from habit_assignments table
  try {
    const assignments = await db`
      SELECT user_id FROM habit_assignments WHERE habit_id = ${id}
    `;
    return assignments;
  } catch {
    // Table doesn't exist yet, fall back to assigned_to
    return [{ user_id: existing[0].assigned_to }];
  }
});
