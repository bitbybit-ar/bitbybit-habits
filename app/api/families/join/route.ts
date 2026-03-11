import { apiHandler, created, BadRequestError, NotFoundError, ConflictError } from "@/lib/api";
import { families, familyMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { invite_code, role } = body as { invite_code: string; role?: string };

  if (!invite_code || invite_code.trim().length === 0) {
    throw new BadRequestError("El codigo de invitacion es obligatorio");
  }

  // Find the family by invite code
  const result = await db
    .select()
    .from(families)
    .where(eq(families.invite_code, invite_code.trim().toUpperCase()));

  if (result.length === 0) {
    throw new NotFoundError("Codigo de invitacion invalido");
  }

  const family = result[0];

  // Check if already a member
  const existing = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, family.id), eq(familyMembers.user_id, session.user_id)));

  if (existing.length > 0) {
    throw new ConflictError("Ya sos miembro de esta familia");
  }

  // Add user as member with selected role (defaults to kid)
  const memberRole = role === "sponsor" ? "sponsor" : "kid";

  const members = await db
    .insert(familyMembers)
    .values({ family_id: family.id, user_id: session.user_id, role: memberRole })
    .returning();

  return created({ family, member: members[0] });
});
