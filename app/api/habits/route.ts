import { apiHandler, created, BadRequestError, ForbiddenError } from "@/lib/api";
import { habits, familyMembers, completions } from "@/lib/db";
import { eq, and, or, isNull, isNotNull, sql, desc } from "drizzle-orm";

const VALID_SCHEDULE_TYPES = ["daily", "specific_days", "times_per_week"] as const;
const VALID_VERIFICATION_TYPES = ["sponsor_approval", "self_verify"] as const;

export const GET = apiHandler(async (_req, { session, db }) => {
  const today = new Date().toISOString().split("T")[0];

  // Complex query with LEFT JOINs and CASE — use sql template for the computed column
  const result = await db
    .selectDistinct({
      id: habits.id,
      family_id: habits.family_id,
      created_by: habits.created_by,
      assigned_to: habits.assigned_to,
      name: habits.name,
      description: habits.description,
      color: habits.color,
      icon: habits.icon,
      sat_reward: habits.sat_reward,
      schedule_type: habits.schedule_type,
      schedule_days: habits.schedule_days,
      schedule_times_per_week: habits.schedule_times_per_week,
      verification_type: habits.verification_type,
      active: habits.active,
      created_at: habits.created_at,
      updated_at: habits.updated_at,
      completed_today: sql<boolean>`CASE WHEN ${completions.id} IS NOT NULL THEN true ELSE false END`,
    })
    .from(habits)
    .leftJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .leftJoin(
      completions,
      and(
        eq(completions.habit_id, habits.id),
        eq(completions.user_id, habits.assigned_to),
        eq(completions.date, today)
      )
    )
    .where(
      and(
        or(
          and(isNull(habits.family_id), or(eq(habits.assigned_to, session.user_id), eq(habits.created_by, session.user_id))),
          and(isNotNull(habits.family_id), isNotNull(familyMembers.id))
        ),
        eq(habits.active, true)
      )
    )
    .orderBy(desc(habits.created_at));

  return result;
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

  // Validate enums
  if (!VALID_SCHEDULE_TYPES.includes(schedule_type)) {
    throw new BadRequestError("schedule_type invalido");
  }
  if (!VALID_VERIFICATION_TYPES.includes(verification_type)) {
    throw new BadRequestError("verification_type invalido");
  }

  // Validate sat_reward
  if (sat_reward !== undefined && sat_reward !== null) {
    if (!Number.isInteger(sat_reward) || sat_reward < 0 || sat_reward > 1_000_000) {
      throw new BadRequestError("sat_reward debe ser un entero entre 0 y 1.000.000");
    }
  }

  // Validate color hex
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new BadRequestError("color debe ser un hex valido (#RRGGBB)");
  }

  // Validate schedule_days
  if (schedule_days !== undefined && schedule_days !== null) {
    if (!Array.isArray(schedule_days) || schedule_days.some((d: number) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestError("schedule_days debe contener dias validos (0-6)");
    }
  }

  const isSelfAssigned = !assigned_to || assigned_to === session.user_id;

  if (!isSelfAssigned) {
    if (!family_id) {
      throw new BadRequestError("Se requiere family_id para asignar habitos a otros");
    }

    const sponsorMembership = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.family_id, family_id),
          eq(familyMembers.user_id, session.user_id),
          eq(familyMembers.role, "sponsor")
        )
      );

    if (sponsorMembership.length === 0) {
      throw new ForbiddenError("No sos sponsor de esta familia");
    }

    const assigneeMembership = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(
        and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, assigned_to))
      );

    if (assigneeMembership.length === 0) {
      throw new BadRequestError("El usuario asignado no es miembro de esta familia");
    }
  }

  const result = await db
    .insert(habits)
    .values({
      family_id: family_id ?? null,
      created_by: session.user_id,
      assigned_to: isSelfAssigned ? session.user_id : assigned_to,
      name: name.trim(),
      description: description?.trim() ?? null,
      color,
      sat_reward: isSelfAssigned ? 0 : (sat_reward ?? 0),
      schedule_type,
      schedule_days: schedule_days ?? null,
      schedule_times_per_week: schedule_times_per_week ?? null,
      verification_type,
    })
    .returning();

  return created(result[0]);
});
