import { apiHandler, BadRequestError, ForbiddenError, NotFoundError } from "@/lib/api";
import { familyMembers } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";

export const PATCH = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { family_id, user_id, new_role } = body as {
    family_id: string;
    user_id: string;
    new_role: "sponsor" | "kid";
  };

  if (!family_id || !user_id || !new_role) {
    throw new BadRequestError("family_id, user_id, and new_role are required");
  }

  if (new_role !== "sponsor" && new_role !== "kid") {
    throw new BadRequestError("new_role must be 'sponsor' or 'kid'");
  }

  // Check requester is a sponsor in this family
  const requesterMembership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, session.user_id)));

  if (requesterMembership.length === 0 || requesterMembership[0].role !== "sponsor") {
    throw new ForbiddenError("Only sponsors can change roles");
  }

  // Check target is a member
  const targetMembership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, user_id)));

  if (targetMembership.length === 0) {
    throw new NotFoundError("User is not a member of this family");
  }

  // If demoting from sponsor, check there's at least one other sponsor
  if (targetMembership[0].role === "sponsor" && new_role === "kid") {
    const otherSponsors = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.family_id, family_id),
          ne(familyMembers.user_id, user_id),
          eq(familyMembers.role, "sponsor")
        )
      );

    if (otherSponsors.length === 0) {
      throw new BadRequestError("cannot_demote_last_sponsor");
    }
  }

  await db
    .update(familyMembers)
    .set({ role: new_role })
    .where(and(eq(familyMembers.family_id, family_id), eq(familyMembers.user_id, user_id)));

  return undefined;
});
