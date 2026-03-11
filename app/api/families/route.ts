import { apiHandler, created, BadRequestError } from "@/lib/api";
import { families, familyMembers, users } from "@/lib/db";
import { eq, desc, asc } from "drizzle-orm";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  // Get families the user belongs to
  const userFamilies = await db
    .select({ family: families })
    .from(families)
    .innerJoin(familyMembers, eq(familyMembers.family_id, families.id))
    .where(eq(familyMembers.user_id, session.user_id))
    .orderBy(desc(families.created_at));

  const familiesWithMembers = [];

  for (const { family } of userFamilies) {
    const members = await db
      .select({
        id: familyMembers.id,
        role: familyMembers.role,
        joined_at: familyMembers.joined_at,
        user_id: users.id,
        display_name: users.display_name,
        username: users.username,
        avatar_url: users.avatar_url,
      })
      .from(familyMembers)
      .innerJoin(users, eq(users.id, familyMembers.user_id))
      .where(eq(familyMembers.family_id, family.id))
      .orderBy(asc(familyMembers.joined_at));

    familiesWithMembers.push({ ...family, members });
  }

  return familiesWithMembers;
});

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || name.trim().length === 0) {
    throw new BadRequestError("El nombre de la familia es obligatorio");
  }

  const inviteCode = generateInviteCode();

  const result = await db
    .insert(families)
    .values({ name: name.trim(), invite_code: inviteCode, created_by: session.user_id })
    .returning();

  const family = result[0];

  // Add the sponsor as a member
  await db.insert(familyMembers).values({
    family_id: family.id,
    user_id: session.user_id,
    role: "sponsor",
  });

  return created(family);
});
