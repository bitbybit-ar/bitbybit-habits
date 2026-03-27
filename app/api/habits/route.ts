import { apiHandler, created, BadRequestError, ForbiddenError } from "@/lib/api";
import { validateHabitFields } from "@/lib/api/validate-habit";
import { habits, familyMembers, completions } from "@/lib/db";
import { eq, and, or, isNull, isNotNull, sql, desc, inArray } from "drizzle-orm";
import { todayDateStr } from "@/lib/date";

export const GET = apiHandler(async (request, { session, db }) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = (page - 1) * limit;

  const today = todayDateStr();

  const whereCondition = and(
    or(
      and(isNull(habits.family_id), or(eq(habits.assigned_to, session.user_id), eq(habits.created_by, session.user_id))),
      and(isNotNull(habits.family_id), isNotNull(familyMembers.id))
    ),
    eq(habits.active, true)
  );

  // Get total count
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(DISTINCT ${habits.id})` })
    .from(habits)
    .leftJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(whereCondition);

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
    .where(whereCondition)
    .orderBy(desc(habits.created_at))
    .limit(limit)
    .offset(offset);

  return {
    habits: result,
    pagination: {
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
    },
  };
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
    assigned_to: string | string[];
    family_id: string;
  };

  if (!name || !color || !schedule_type || !verification_type) {
    throw new BadRequestError("Missing required fields");
  }

  validateHabitFields({ schedule_type, verification_type, sat_reward, color, schedule_days });

  // Normalize assigned_to to array (supports both single string and array)
  const assignees = Array.isArray(assigned_to) ? assigned_to : [assigned_to].filter(Boolean);
  const isSelfAssigned = assignees.length === 0 || (assignees.length === 1 && assignees[0] === session.user_id);

  if (!isSelfAssigned) {
    if (!family_id) {
      throw new BadRequestError("family_id is required when assigning habits to others");
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
      throw new ForbiddenError("Not a sponsor of this family");
    }

    // Validate all assignees are family members (single query)
    const assigneeMemberships = await db
      .select({ user_id: familyMembers.user_id })
      .from(familyMembers)
      .where(
        and(eq(familyMembers.family_id, family_id), inArray(familyMembers.user_id, assignees))
      );

    const memberUserIds = new Set(assigneeMemberships.map((m) => m.user_id));
    for (const assigneeId of assignees) {
      if (!memberUserIds.has(assigneeId)) {
        throw new BadRequestError("Assigned user is not a member of this family");
      }
    }
  }

  // Create one habit per assignee
  const targetAssignees = isSelfAssigned ? [session.user_id] : assignees;
  const createdHabits = [];

  for (const assigneeId of targetAssignees) {
    const result = await db
      .insert(habits)
      .values({
        family_id: family_id ?? null,
        created_by: session.user_id,
        assigned_to: assigneeId,
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

    createdHabits.push(result[0]);
  }

  // Return first habit for single assignment (backwards compatible), array for multiple
  return created(createdHabits.length === 1 ? createdHabits[0] : createdHabits);
});
