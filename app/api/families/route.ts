import { apiHandler, created, BadRequestError } from "@/lib/api";
import type { Family } from "@/lib/types";

interface FamilyMemberWithUser {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface FamilyWithMembers extends Family {
  members: FamilyMemberWithUser[];
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const GET = apiHandler(async (_req, { session, db }) => {
  const families = await db`
    SELECT f.* FROM families f
    INNER JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.user_id = ${session.user_id}
    ORDER BY f.created_at DESC
  ` as Family[];

  const familiesWithMembers: FamilyWithMembers[] = [];

  for (const family of families) {
    const members = await db`
      SELECT fm.id, fm.role, fm.joined_at,
             u.id AS user_id, u.display_name, u.username, u.avatar_url
      FROM family_members fm
      INNER JOIN users u ON u.id = fm.user_id
      WHERE fm.family_id = ${family.id}
      ORDER BY fm.joined_at ASC
    `;

    familiesWithMembers.push({
      ...family,
      members: members as FamilyWithMembers["members"],
    });
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

  const families = await db`
    INSERT INTO families (name, invite_code, created_by)
    VALUES (${name.trim()}, ${inviteCode}, ${session.user_id})
    RETURNING *
  ` as Family[];

  const family = families[0];

  // Add the sponsor as a member
  await db`
    INSERT INTO family_members (family_id, user_id, role)
    VALUES (${family.id}, ${session.user_id}, 'sponsor')
  `;

  return created(family);
});
