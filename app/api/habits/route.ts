import { apiHandler, created, BadRequestError, ForbiddenError } from "@/lib/api";
import type { Habit } from "@/lib/types";

interface HabitWithCompletion extends Habit {
  completed_today: boolean;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  const today = new Date().toISOString().split("T")[0];

  const habits = await db`
    SELECT DISTINCT h.*,
      CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed_today
    FROM habits h
    LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
    LEFT JOIN completions c ON c.habit_id = h.id AND c.user_id = h.assigned_to AND c.date = ${today}
    WHERE (
      (h.family_id IS NULL AND (h.assigned_to = ${session.user_id} OR h.created_by = ${session.user_id}))
      OR (h.family_id IS NOT NULL AND fm.id IS NOT NULL)
    )
      AND h.active = true
    ORDER BY h.created_at DESC
  ` as HabitWithCompletion[];

  return habits;
});

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const {
    name,
    description,
    color,
    sat_reward,
    schedule_type,
    schedule_days,
    schedule_times_per_week,
    verification_type,
    assigned_to,
    family_id,
  } = body as {
    name: string;
    description?: string;
    color: string;
    sat_reward: number;
    schedule_type: "daily" | "specific_days" | "times_per_week";
    schedule_days?: number[];
    schedule_times_per_week?: number;
    verification_type: "sponsor_approval" | "self_verify";
    assigned_to: string;
    family_id: string;
  };

  if (!name || !color || !schedule_type || !verification_type) {
    throw new BadRequestError("Faltan campos obligatorios");
  }

  const isSelfAssigned = !assigned_to || assigned_to === session.user_id;

  if (!isSelfAssigned) {
    if (!family_id) {
      throw new BadRequestError("Se requiere family_id para asignar habitos a otros");
    }

    const sponsorMembership = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id = ${session.user_id}
        AND role = 'sponsor'
    `;

    if (sponsorMembership.length === 0) {
      throw new ForbiddenError("No sos sponsor de esta familia");
    }

    const assigneeMembership = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id = ${assigned_to}
    `;

    if (assigneeMembership.length === 0) {
      throw new BadRequestError("El usuario asignado no es miembro de esta familia");
    }
  }

  const finalAssignedTo = isSelfAssigned ? session.user_id : assigned_to;
  const finalSatReward = isSelfAssigned ? 0 : (sat_reward ?? 0);
  const finalFamilyId = family_id ?? null;
  const finalScheduleDays = schedule_days ?? null;

  const habits = await db`
    INSERT INTO habits (family_id, created_by, assigned_to, name, description, color, sat_reward, schedule_type, schedule_days, schedule_times_per_week, verification_type)
    VALUES (${finalFamilyId}, ${session.user_id}, ${finalAssignedTo}, ${name.trim()}, ${description?.trim() ?? null}, ${color}, ${finalSatReward}, ${schedule_type}, ${finalScheduleDays}, ${schedule_times_per_week ?? null}, ${verification_type})
    RETURNING *
  ` as Habit[];

  return created(habits[0]);
});
