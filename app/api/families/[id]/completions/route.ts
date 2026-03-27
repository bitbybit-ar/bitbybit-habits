import { apiHandler, ForbiddenError, NotFoundError } from "@/lib/api";
import { families, familyMembers, completions, habits, users } from "@/lib/db";
import { eq, and, gte, desc } from "drizzle-orm";

export const GET = apiHandler(async (req, { session, db, params }) => {
  const familyId = params.id;

  // Verify family exists
  const family = await db
    .select({ id: families.id })
    .from(families)
    .where(eq(families.id, familyId));

  if (family.length === 0) {
    throw new NotFoundError("Family");
  }

  // Verify user is a sponsor in this family
  const membership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.family_id, familyId),
        eq(familyMembers.user_id, session.user_id),
      ),
    );

  if (membership.length === 0 || membership[0].role !== "sponsor") {
    throw new ForbiddenError("sponsors_only");
  }

  // Parse days param (default 7)
  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "7", 10) || 7, 1), 90);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  // Fetch completions for all habits in this family within the date range
  const result = await db
    .select({
      id: completions.id,
      habit_id: completions.habit_id,
      habit_name: habits.name,
      kid_user_id: completions.user_id,
      kid_display_name: users.display_name,
      date: completions.date,
      status: completions.status,
      sat_reward: habits.sat_reward,
    })
    .from(completions)
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .innerJoin(users, eq(users.id, completions.user_id))
    .where(
      and(
        eq(habits.family_id, familyId),
        eq(habits.active, true),
        gte(completions.date, sinceDateStr),
      ),
    )
    .orderBy(desc(completions.date));

  return result;
});
