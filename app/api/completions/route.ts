import { apiHandler, created, requireFields, NotFoundError, ConflictError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { habits, familyMembers, completions } from "@/lib/db";
import { eq, and, or, isNull, isNotNull, desc, gte, lte, sql } from "drizzle-orm";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { habit_id, note, evidence_url } = body as {
    habit_id: string;
    note?: string;
    evidence_url?: string;
  };

  requireFields({ habit_id }, ["habit_id"]);

  // Verify the habit exists and user can complete it
  const habitResult = await db
    .select()
    .from(habits)
    .leftJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(
      and(
        eq(habits.id, habit_id),
        eq(habits.active, true),
        or(
          eq(habits.assigned_to, session.user_id),
          eq(habits.created_by, session.user_id),
          isNotNull(familyMembers.id)
        )
      )
    );

  if (habitResult.length === 0) {
    throw new NotFoundError("Habito no encontrado o no asignado a vos");
  }

  const habit = habitResult[0].habits;
  const today = new Date().toISOString().split("T")[0];

  // Check if already completed today
  const existing = await db
    .select({ id: completions.id })
    .from(completions)
    .where(
      and(
        eq(completions.habit_id, habit_id),
        eq(completions.user_id, session.user_id),
        eq(completions.date, today)
      )
    );

  if (existing.length > 0) {
    throw new ConflictError("Ya completaste este habito hoy");
  }

  // Status depends on verification type
  const status = habit.verification_type === "self_verify" ? "approved" : "pending";

  const result = await db
    .insert(completions)
    .values({
      habit_id,
      user_id: session.user_id,
      date: today,
      status,
      note: note ?? null,
      evidence_url: evidence_url ?? null,
    })
    .returning();

  // Notify sponsor(s) in the family if pending approval
  if (status === "pending" && habit.family_id) {
    try {
      const sponsors = await db
        .select({ user_id: familyMembers.user_id })
        .from(familyMembers)
        .where(and(eq(familyMembers.family_id, habit.family_id), eq(familyMembers.role, "sponsor")));

      const displayName = session.display_name || session.username;
      for (const sponsor of sponsors) {
        await createNotification(
          sponsor.user_id,
          "completion_pending",
          "Habit completed!",
          `${displayName} completed "${habit.name}" and is waiting for approval.`,
          { completion_id: result[0].id, habit_id: habit.id, kid_name: displayName }
        );
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }
  }

  return created(result[0]);
});

export const GET = apiHandler(async (request, { session, db }) => {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const conditions = [
    eq(completions.user_id, session.user_id),
    or(isNull(habits.family_id), isNotNull(familyMembers.id)),
  ];

  if (dateFrom) conditions.push(gte(completions.date, dateFrom));
  if (dateTo) conditions.push(lte(completions.date, dateTo));

  const result = await db
    .select({
      id: completions.id,
      habit_id: completions.habit_id,
      user_id: completions.user_id,
      date: completions.date,
      status: completions.status,
      evidence_url: completions.evidence_url,
      note: completions.note,
      completed_at: completions.completed_at,
      reviewed_by: completions.reviewed_by,
      reviewed_at: completions.reviewed_at,
    })
    .from(completions)
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .leftJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(and(...conditions))
    .orderBy(desc(completions.date), desc(completions.completed_at));

  return result;
});
