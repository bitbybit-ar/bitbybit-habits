import { apiHandler, created, requireFields, NotFoundError, ConflictError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import type { Completion, Habit } from "@/lib/types";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { habit_id, note, evidence_url } = body as {
    habit_id: string;
    note?: string;
    evidence_url?: string;
  };

  requireFields({ habit_id }, ["habit_id"]);

  // Verify the habit exists and is assigned to this kid
  const habits = await db`
    SELECT * FROM habits
    WHERE id = ${habit_id}
      AND assigned_to = ${session.user_id}
      AND active = true
  ` as Habit[];

  if (habits.length === 0) {
    throw new NotFoundError("Habito no encontrado o no asignado a vos");
  }

  const habit = habits[0];
  const today = new Date().toISOString().split("T")[0];

  // Check if already completed today
  const existing = await db`
    SELECT id FROM completions
    WHERE habit_id = ${habit_id}
      AND user_id = ${session.user_id}
      AND date = ${today}
  `;

  if (existing.length > 0) {
    throw new ConflictError("Ya completaste este habito hoy");
  }

  // Status depends on verification type
  const status = habit.verification_type === "self_verify" ? "approved" : "pending";

  const completions = await db`
    INSERT INTO completions (habit_id, user_id, date, status, note, evidence_url)
    VALUES (${habit_id}, ${session.user_id}, ${today}, ${status}, ${note ?? null}, ${evidence_url ?? null})
    RETURNING *
  ` as Completion[];

  // Notify sponsor(s) in the family if pending approval
  if (status === "pending" && habit.family_id) {
    try {
      const sponsors = await db`
        SELECT fm.user_id FROM family_members fm
        WHERE fm.family_id = ${habit.family_id} AND fm.role = 'sponsor'
      `;
      const displayName = session.display_name || session.username;
      for (const sponsor of sponsors) {
        await createNotification(
          sponsor.user_id,
          "completion_pending",
          "Habit completed!",
          `${displayName} completed "${habit.name}" and is waiting for approval.`,
          { completion_id: completions[0].id, habit_id: habit.id, kid_name: displayName }
        );
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }
  }

  return created(completions[0]);
});

export const GET = apiHandler(async (request, { session, db }) => {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const completions = await db`
    SELECT c.* FROM completions c
    INNER JOIN habits h ON h.id = c.habit_id
    LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    WHERE c.user_id = ${session.user_id}
      AND (h.family_id IS NULL OR fm.id IS NOT NULL)
      ${dateFrom ? db`AND c.date >= ${dateFrom}` : db``}
      ${dateTo ? db`AND c.date <= ${dateTo}` : db``}
    ORDER BY c.date DESC, c.completed_at DESC
  ` as Completion[];

  return completions;
});
