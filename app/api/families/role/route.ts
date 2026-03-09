import { apiHandler, BadRequestError, ForbiddenError, NotFoundError } from "@/lib/api";

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
  const requesterMembership = await db`
    SELECT role FROM family_members
    WHERE family_id = ${family_id} AND user_id = ${session.user_id}
  `;

  if (requesterMembership.length === 0 || requesterMembership[0].role !== "sponsor") {
    throw new ForbiddenError("Only sponsors can change roles");
  }

  // Check target is a member
  const targetMembership = await db`
    SELECT role FROM family_members
    WHERE family_id = ${family_id} AND user_id = ${user_id}
  `;

  if (targetMembership.length === 0) {
    throw new NotFoundError("User is not a member of this family");
  }

  // If demoting from sponsor, check there's at least one other sponsor
  if (targetMembership[0].role === "sponsor" && new_role === "kid") {
    const otherSponsors = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id != ${user_id}
        AND role = 'sponsor'
    `;

    if (otherSponsors.length === 0) {
      throw new BadRequestError("Cannot demote the last sponsor");
    }
  }

  await db`
    UPDATE family_members
    SET role = ${new_role}
    WHERE family_id = ${family_id} AND user_id = ${user_id}
  `;

  return undefined;
});
