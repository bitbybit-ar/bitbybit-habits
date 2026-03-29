import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import { familyMembers, families, habits } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";

/**
 * POST /api/families/leave
 *
 * Leave a family. Prevents the last sponsor from leaving if other members remain.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { family_id } = body as { family_id: string };

  requireFields({ family_id }, ["family_id"]);

  // Check if user is a member
  const membership = await db
    .select({ id: familyMembers.id, role: familyMembers.role })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, session.user_id)));

  if (membership.length === 0) {
    throw new NotFoundError("You are not a member of this family");
  }

  const userRole = membership[0].role;

  // If sponsor, check that there's at least one other sponsor
  if (userRole === "sponsor") {
    const otherSponsors = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.family_id, family_id),
          ne(familyMembers.user_id, session.user_id),
          eq(familyMembers.role, "sponsor")
        )
      );

    if (otherSponsors.length === 0) {
      const otherMembers = await db
        .select({ id: familyMembers.id })
        .from(familyMembers)
        .where(
          and(eq(familyMembers.family_id, family_id), ne(familyMembers.user_id, session.user_id))
        );

      if (otherMembers.length > 0) {
        throw new BadRequestError("last_sponsor");
      }
    }
  }

  // Remove the member
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, session.user_id)));

  // Check if family is now empty — if so, delete it
  const remaining = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(eq(familyMembers.family_id, family_id));

  if (remaining.length === 0) {
    await db.update(habits).set({ active: false }).where(eq(habits.family_id, family_id));
    await db.delete(families).where(eq(families.id, family_id));
  }

  return undefined;
});
