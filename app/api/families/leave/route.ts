import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { family_id } = body as { family_id: string };

  requireFields({ family_id }, ["family_id"]);

  // Check if user is a member
  const membership = await db`
    SELECT fm.id, fm.role FROM family_members fm
    WHERE fm.family_id = ${family_id} AND fm.user_id = ${session.user_id}
  `;

  if (membership.length === 0) {
    throw new NotFoundError("You are not a member of this family");
  }

  const userRole = membership[0].role;

  // If sponsor, check that there's at least one other sponsor
  if (userRole === "sponsor") {
    const otherSponsors = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id != ${session.user_id}
        AND role = 'sponsor'
    `;

    if (otherSponsors.length === 0) {
      const otherMembers = await db`
        SELECT id FROM family_members
        WHERE family_id = ${family_id}
          AND user_id != ${session.user_id}
      `;

      if (otherMembers.length > 0) {
        throw new BadRequestError("Cannot leave: you are the last sponsor. Promote another member first or delete the family.");
      }
    }
  }

  // Remove the member
  await db`
    DELETE FROM family_members
    WHERE family_id = ${family_id} AND user_id = ${session.user_id}
  `;

  // Check if family is now empty — if so, delete it
  const remaining = await db`
    SELECT id FROM family_members WHERE family_id = ${family_id}
  `;

  if (remaining.length === 0) {
    await db`UPDATE habits SET active = false WHERE family_id = ${family_id}`;
    await db`DELETE FROM families WHERE id = ${family_id}`;
  }

  return undefined;
});
