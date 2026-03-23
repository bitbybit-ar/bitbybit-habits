import { apiHandler, created, BadRequestError } from "@/lib/api";
import { families, familyMembers, users } from "@/lib/db";
import { eq, desc, asc, inArray } from "drizzle-orm";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  // Get family IDs the user belongs to
  const userFamilyIds = await db
    .select({ family_id: familyMembers.family_id })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, session.user_id));

  if (userFamilyIds.length === 0) return [];

  const familyIds = userFamilyIds.map((f) => f.family_id);

  // Fetch all families and their members in two queries (no N+1)
  const [userFamilies, allMembers] = await Promise.all([
    db
      .select()
      .from(families)
      .where(inArray(families.id, familyIds))
      .orderBy(desc(families.created_at)),
    db
      .select({
        id: familyMembers.id,
        family_id: familyMembers.family_id,
        role: familyMembers.role,
        joined_at: familyMembers.joined_at,
        user_id: users.id,
        display_name: users.display_name,
        username: users.username,
        avatar_url: users.avatar_url,
      })
      .from(familyMembers)
      .innerJoin(users, eq(users.id, familyMembers.user_id))
      .where(inArray(familyMembers.family_id, familyIds))
      .orderBy(asc(familyMembers.joined_at)),
  ]);

  // Group members by family_id
  const membersByFamily = new Map<string, typeof allMembers>();
  for (const member of allMembers) {
    const list = membersByFamily.get(member.family_id) ?? [];
    list.push(member);
    membersByFamily.set(member.family_id, list);
  }

  return userFamilies.map((family) => ({
    ...family,
    members: membersByFamily.get(family.id) ?? [],
  }));
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
