import { apiHandler, NotFoundError, ForbiddenError } from "@/lib/api";

export const DELETE = apiHandler(async (_req, { session, db, params }) => {
  const familyId = params.id;

  // Check the user is the creator
  const families = await db`
    SELECT * FROM families WHERE id = ${familyId}
  `;

  if (families.length === 0) {
    throw new NotFoundError("Family");
  }

  if (families[0].created_by !== session.user_id) {
    throw new ForbiddenError("Only the creator can delete this family");
  }

  // Deactivate related habits
  await db`UPDATE habits SET active = false WHERE family_id = ${familyId}`;

  // Remove all members
  await db`DELETE FROM family_members WHERE family_id = ${familyId}`;

  // Delete family
  await db`DELETE FROM families WHERE id = ${familyId}`;

  return undefined;
});
