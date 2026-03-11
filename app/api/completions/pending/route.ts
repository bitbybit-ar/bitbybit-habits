import { apiHandler } from "@/lib/api";
import { completions, habits, users, familyMembers } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export const GET = apiHandler(async (_req, { session, db }) => {
  const result = await db
    .select({
      id: completions.id,
      habit_id: completions.habit_id,
      habit_name: habits.name,
      habit_color: habits.color,
      kid_name: users.display_name,
      sat_reward: habits.sat_reward,
      date: completions.date,
      completed_at: completions.completed_at,
    })
    .from(completions)
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .innerJoin(users, eq(users.id, completions.user_id))
    .innerJoin(
      familyMembers,
      and(eq(familyMembers.family_id, habits.family_id), eq(familyMembers.user_id, session.user_id))
    )
    .where(and(eq(completions.status, "pending"), eq(familyMembers.role, "sponsor")))
    .orderBy(desc(completions.completed_at));

  return result;
});
