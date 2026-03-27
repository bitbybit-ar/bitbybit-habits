import { apiHandler, NotFoundError, ForbiddenError } from "@/lib/api";
import { families, familyMembers, habits } from "@/lib/db";
import { eq } from "drizzle-orm";

export const DELETE = apiHandler(async (_req, { session, db, params }) => {
  const familyId = params.id;

  // Check the user is the creator
  const result = await db
    .select()
    .from(families)
    .where(eq(families.id, familyId));

  if (result.length === 0) {
    throw new NotFoundError("Family");
  }

  if (result[0].created_by !== session.user_id) {
    throw new ForbiddenError();
  }

  // Deactivate related habits
  await db.update(habits).set({ active: false }).where(eq(habits.family_id, familyId));

  // Remove all members
  await db.delete(familyMembers).where(eq(familyMembers.family_id, familyId));

  // Delete family
  await db.delete(families).where(eq(families.id, familyId));

  return undefined;
});
