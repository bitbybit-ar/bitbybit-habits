import { apiHandler, ForbiddenError, NotFoundError } from "@/lib/api";
import { familyMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const DELETE = apiHandler(async (_req, { session, db, params }) => {
  const familyId = params.id;
  const targetUserId = params.userId;

  // Verify requester is a sponsor in this family
  const requesterMembership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, familyId), eq(familyMembers.user_id, session.user_id)));

  if (requesterMembership.length === 0 || requesterMembership[0].role !== "sponsor") {
    throw new ForbiddenError("Only sponsors can remove members");
  }

  // Cannot remove yourself — use leave endpoint
  if (targetUserId === session.user_id) {
    throw new ForbiddenError("Cannot remove yourself. Use the leave endpoint instead.");
  }

  // Verify target is a member
  const targetMembership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, familyId), eq(familyMembers.user_id, targetUserId)));

  if (targetMembership.length === 0) {
    throw new NotFoundError("User is not a member of this family");
  }

  // Remove the member
  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.family_id, familyId), eq(familyMembers.user_id, targetUserId)));

  return undefined;
});
