import { apiHandler, created, BadRequestError, NotFoundError, ConflictError } from "@/lib/api";
import type { Family, FamilyMember } from "@/lib/types";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { invite_code, role } = body as { invite_code: string; role?: string };

  if (!invite_code || invite_code.trim().length === 0) {
    throw new BadRequestError("El codigo de invitacion es obligatorio");
  }

  // Find the family by invite code
  const families = await db`
    SELECT * FROM families
    WHERE invite_code = ${invite_code.trim().toUpperCase()}
  ` as Family[];

  if (families.length === 0) {
    throw new NotFoundError("Codigo de invitacion invalido");
  }

  const family = families[0];

  // Check if already a member
  const existing = await db`
    SELECT id FROM family_members
    WHERE family_id = ${family.id}
      AND user_id = ${session.user_id}
  `;

  if (existing.length > 0) {
    throw new ConflictError("Ya sos miembro de esta familia");
  }

  // Add user as member with selected role (defaults to kid)
  const memberRole = role === "sponsor" ? "sponsor" : "kid";

  const members = await db`
    INSERT INTO family_members (family_id, user_id, role)
    VALUES (${family.id}, ${session.user_id}, ${memberRole})
    RETURNING *
  ` as FamilyMember[];

  return created({ family, member: members[0] });
});
